import { NextResponse } from 'next/server';
import { repository, runtimeMode } from '@/lib/repositories';
import { requireDealParticipant } from '@/lib/auth/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/api/validation';
import type { DbDeal } from '@/lib/db/types';
import { transition, EscrowAction } from '@/lib/escrow/state-machine';
import { createEvent } from '@/lib/escrow/events';
import {
  loadDealRoomTestnetRuntime,
  type DealRoomTestnetRuntime,
} from '@/lib/stellar/server/deal-room-testnet-runtime';
import { executeConfirmedDealRoomRouteAction } from '@/lib/stellar/server/deal-room-route-execution';
import { executeCustodyDeliveryReference } from '@/lib/stellar/testnet-proof';
import { rejectLegacyActionForCustodyV2 } from '@/lib/deals/rail-guards';

async function runLegacyLocalDeliveryMilestone(
  dealId: string,
  existingDeal: DbDeal,
  actorId: string,
) {
  const updatedDeal = transition(existingDeal, 'mark_delivered');
  const { replaced } = await repository.replaceDealIfCurrent({ current: existingDeal, next: updatedDeal });
  if (!replaced) return NextResponse.json(createErrorResponse('CONFLICT', 'Concurrent update'), { status: 409 });

  const event = createEvent(
    dealId,
    'mark_delivered',
    actorId,
    'Seller marked the shipment milestone as delivered.',
    {
      next_status: updatedDeal.status,
      proof_hash: updatedDeal.proof_hash,
    },
  );
  await repository.addEvent(event);

  return NextResponse.json(createSuccessResponse(updatedDeal));
}

async function persistCustodyWalletDeliveryMilestone(input: {
  dealId: string;
  existingDeal: DbDeal;
  actorId: string;
  transactionHash: string;
  custodyAddress: string;
  deliveryDataKey: string;
}) {
  const nextDeal = {
    ...transition(input.existingDeal, 'mark_delivered'),
    latest_stellar_tx_hash: input.transactionHash,
    stellar_sync_status: 'idle' as const,
  };

  const replaced = await repository.replaceDealIfCurrent({
    current: input.existingDeal,
    next: nextDeal,
  });

  let updatedDeal = replaced.deal ?? nextDeal;
  if (!replaced.replaced) {
    const currentDeal = await repository.getDeal(input.existingDeal.id);
    if (
      currentDeal?.status === 'DELIVERED' &&
      currentDeal.latest_stellar_tx_hash === input.transactionHash
    ) {
      updatedDeal = currentDeal;
    } else if (
      runtimeMode === 'demo' &&
      currentDeal &&
      JSON.stringify(currentDeal) === JSON.stringify(input.existingDeal)
    ) {
      await repository.updateDeal(input.existingDeal.id, {
        status: nextDeal.status,
        latest_stellar_tx_hash: nextDeal.latest_stellar_tx_hash,
        stellar_sync_status: nextDeal.stellar_sync_status,
        updated_at: nextDeal.updated_at,
      });
      const recoveredDeal = await repository.getDeal(input.existingDeal.id);
      if (!recoveredDeal) {
        return NextResponse.json(createErrorResponse('CONFLICT', 'Concurrent update'), { status: 409 });
      }
      updatedDeal = recoveredDeal;
    } else {
      return NextResponse.json(createErrorResponse('CONFLICT', 'Concurrent update'), { status: 409 });
    }
  }

  const existingEvents = await repository.getDealEvents(input.dealId);
  const hasDeliveryEvent = existingEvents.some(
    (event) =>
      event.event_type === 'mark_delivered' &&
      event.tx_hash === input.transactionHash,
  );

  if (!hasDeliveryEvent) {
    const event = createEvent(
      input.dealId,
      'mark_delivered',
      input.actorId,
      'Seller marked delivery and Settleway recorded the delivery milestone through the custody wallet on Stellar Testnet.',
      {
        next_status: updatedDeal.status,
        proof_hash: updatedDeal.proof_hash,
        delivery_recording_route: 'settleway_custody_wallet_memo_hash',
        custody_address: input.custodyAddress,
        delivery_data_key: input.deliveryDataKey,
        proof_transaction_hash: input.existingDeal.latest_stellar_tx_hash,
      },
    );
    event.proof_hash = updatedDeal.proof_hash;
    event.tx_hash = input.transactionHash;
    await repository.addEvent(event);
  }

  return NextResponse.json(createSuccessResponse(updatedDeal));
}

async function runCustodyWalletDeliveryMilestone(input: {
  dealId: string;
  existingDeal: DbDeal;
  actorId: string;
  runtime: DealRoomTestnetRuntime;
}) {
  if (
    input.existingDeal.status !== 'PROOF_SUBMITTED' ||
    !input.existingDeal.proof_hash ||
    !input.existingDeal.latest_stellar_tx_hash
  ) {
    return NextResponse.json(
      createErrorResponse(
        'STELLAR_EXECUTION_INVALID',
        'Delivery confirmation requires a proof-submitted custody room with a confirmed proof transaction.',
      ),
      { status: 400 },
    );
  }

  const existingEvents = await repository.getDealEvents(input.dealId);
  const existingDeliveryEvent = existingEvents.find(
    (event) => event.event_type === 'mark_delivered' && event.tx_hash,
  );

  if (existingDeliveryEvent?.tx_hash) {
    return persistCustodyWalletDeliveryMilestone({
      dealId: input.dealId,
      existingDeal: input.existingDeal,
      actorId: input.actorId,
      transactionHash: existingDeliveryEvent.tx_hash,
      custodyAddress: String(existingDeliveryEvent.metadata?.custody_address ?? input.runtime.metadata.admin_address),
      deliveryDataKey: String(existingDeliveryEvent.metadata?.delivery_data_key ?? `SWD:${input.dealId.slice(-20)}`),
    });
  }

  let deliveryReference;
  try {
    deliveryReference = await executeCustodyDeliveryReference({
      deal: input.existingDeal,
      signer: input.runtime.signer_port,
      custodyAddress: input.runtime.metadata.admin_address,
    });
  } catch (error) {
    return NextResponse.json(
      createErrorResponse(
        'STELLAR_EXECUTION_FAILED',
        error instanceof Error
          ? error.message
          : 'The Stellar Testnet delivery reference could not be confirmed.',
      ),
      { status: 502 },
    );
  }

  return persistCustodyWalletDeliveryMilestone({
    dealId: input.dealId,
    existingDeal: input.existingDeal,
    actorId: input.actorId,
    transactionHash: deliveryReference.transactionHash,
    custodyAddress: deliveryReference.custodyAddress,
    deliveryDataKey: deliveryReference.deliveryDataKey,
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = await params;
  const actionName = 'mark_delivered' as EscrowAction;

  try {
    let existingDeal;
    let userRole;
    let authUser;
    try {
      const auth = await requireDealParticipant(dealId);
      existingDeal = auth.deal;
      userRole = auth.role;
      authUser = auth.user;
    } catch (e: unknown) {
      return NextResponse.json(createErrorResponse('UNAUTHORIZED', (e instanceof Error ? e.message : String(e))), { status: 401 });
    }
    if (userRole !== 'seller') {
      return NextResponse.json(createErrorResponse('UNAUTHORIZED', 'Only seller can perform this action'), { status: 403 });
    }

    const custodyV2Rejection = rejectLegacyActionForCustodyV2(existingDeal, 'Delivery milestone');
    if (custodyV2Rejection) return custodyV2Rejection;

    if (existingDeal.stellar_mode !== 'testnet') {
      return runLegacyLocalDeliveryMilestone(dealId, existingDeal, authUser.id);
    }

    const runtimeLoaded = loadDealRoomTestnetRuntime();
    if (!runtimeLoaded.ok) {
      return NextResponse.json(
        createErrorResponse(
          'STELLAR_RUNTIME_UNAVAILABLE',
          'Delivery confirmation is configured for Stellar Testnet, but the local runtime is not ready.',
        ),
        { status: 503 },
      );
    }

    if (existingDeal.stellar_escrow_id === null) {
      return runCustodyWalletDeliveryMilestone({
        dealId,
        existingDeal,
        actorId: authUser.id,
        runtime: runtimeLoaded.runtime,
      });
    }

    const executionResult = await executeConfirmedDealRoomRouteAction({
      action: 'mark_delivered',
      action_label: 'delivery confirmation',
      deal: existingDeal,
      runtime: runtimeLoaded.runtime,
    });
    if (!executionResult.ok) {
      return NextResponse.json(
        createErrorResponse(executionResult.failure.code, executionResult.failure.message),
        { status: executionResult.failure.status },
      );
    }

    const updatedDeal = executionResult.deal;
    const event = createEvent(
      dealId,
      actionName,
      authUser.id,
      'Seller marked delivery through the protected Testnet-backed room path.',
      {
        next_status: updatedDeal.status,
        proof_hash: updatedDeal.proof_hash,
        contract_id: runtimeLoaded.runtime.contract_id,
        actor_address: runtimeLoaded.runtime.metadata.seller_demo_address,
      },
    );
    event.tx_hash = executionResult.operation.transaction_hash;
    await repository.addEvent(event);

    return NextResponse.json(createSuccessResponse(updatedDeal));
  } catch (err: unknown) {
    return NextResponse.json(createErrorResponse('BAD_REQUEST', err instanceof Error ? err.message : String(err)), { status: 400 });
  }
}
