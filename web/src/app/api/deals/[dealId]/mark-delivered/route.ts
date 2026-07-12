import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
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
import { getServerWalletRepository } from '@/lib/stellar/server/wallet-repository';
import { ProfileWalletSigner } from '@/lib/stellar/server/profile-wallet-signer';
import { getServiceRoleClient } from '@/lib/db/server-service-client';
import { anchorDemoEvent } from '@/lib/stellar/server/anchor-demo-event';


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

  if (dealId === 'demo-cabai-001') {
    const cookieStore = await cookies();
    const mockActor = cookieStore.get('mock_actor')?.value;
    if (mockActor === 'seller-probolinggo-cabai') {
      let serviceClient;
      try {
        serviceClient = getServiceRoleClient();
      } catch (e) {
        return NextResponse.json(createErrorResponse('SERVER_CONFIG_ERROR', e instanceof Error ? e.message : 'Missing config'), { status: 500 });
      }

      if (!process.env.STELLAR_PLATFORM_SECRET) {
        return NextResponse.json(createErrorResponse('SERVER_CONFIG_ERROR', 'Missing STELLAR_PLATFORM_SECRET for demo anchor'), { status: 500 });
      }

      const { data: demoDeal, error: demoError } = await serviceClient
        .from('deals')
        .select('*')
        .eq('id', dealId)
        .single();

      if (demoError || !demoDeal) {
        return NextResponse.json(createErrorResponse('UNAUTHORIZED', 'Demo deal not found'), { status: 401 });
      }

      if (
        demoDeal.buyer_id === 'buyer-surabaya-restaurant' &&
        demoDeal.seller_id === 'seller-probolinggo-cabai' &&
        demoDeal.stellar_mode === 'mock_only'
      ) {
        // Idempotency
        if (demoDeal.status === 'DELIVERED' || demoDeal.status === 'PROOF_SUBMITTED') {
          return NextResponse.json(createSuccessResponse(demoDeal, { tx_hash: demoDeal.latest_stellar_tx_hash, proof_hash: demoDeal.proof_hash, stellar_network: 'testnet' }));
        }

        // Must be LOCKED or PROOF_SUBMITTED
        if (demoDeal.status !== 'LOCKED' && demoDeal.status !== 'PROOF_SUBMITTED') {
          return NextResponse.json(createErrorResponse('CONFLICT', 'Unexpected deal status for delivery proof'), { status: 409 });
        }

        let txHash: string | null = null;
        let proofHash: string | null = null;
        try {
          const anchorResult = await anchorDemoEvent({
            deal_id: dealId,
            event_type: 'DELIVERY_PROOF_RECORDED',
            actor_id: mockActor,
            payload: {
              buyer_id: demoDeal.buyer_id,
              seller_id: demoDeal.seller_id,
              product: demoDeal.commodity || "Red Chili",
              previous_tx_hash: demoDeal.latest_stellar_tx_hash,
              timestamp: new Date().toISOString(),
            }
          });
          txHash = anchorResult.tx_hash;
          proofHash = anchorResult.proof_hash;
        } catch (e) {
          return NextResponse.json(createErrorResponse('STELLAR_ANCHOR_FAILED', e instanceof Error ? e.message : 'Demo proof anchoring failed'), { status: 502 });
        }

        // Transition from LOCKED to PROOF_SUBMITTED to DELIVERED, or just to DELIVERED
        // For existing local flow, transition(existingDeal, 'mark_delivered') assumes PROOF_SUBMITTED
        // We will just set it to DELIVERED manually to match the prompt or use state-machine if valid.
        let updatedDeal = demoDeal;
        if (updatedDeal.status === 'LOCKED') {
          updatedDeal = transition(updatedDeal, 'submit_proof');
        }
        if (updatedDeal.status === 'PROOF_SUBMITTED') {
          updatedDeal = transition(updatedDeal, 'mark_delivered');
        }

        updatedDeal.latest_stellar_tx_hash = txHash;
        updatedDeal.proof_hash = proofHash;

        const { error: updateError } = await serviceClient.from('deals').update(updatedDeal).eq('id', dealId);
        if (updateError) {
          return NextResponse.json(createErrorResponse('CONFLICT', 'Concurrent update'), { status: 409 });
        }

        const event = createEvent(
          dealId,
          'mark_delivered',
          mockActor,
          'Seller submitted delivery proof and anchored on Stellar Testnet.',
          {
            next_status: updatedDeal.status,
            proof_hash: proofHash,
          }
        );
        event.tx_hash = txHash;
        event.proof_hash = proofHash;

        await serviceClient.from('escrow_events').insert(event);

        return NextResponse.json(
          createSuccessResponse(updatedDeal, { tx_hash: txHash, proof_hash: proofHash, stellar_network: 'testnet' })
        );
      }
    }
  }

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

    const walletRepo = getServerWalletRepository();
    const [buyerWallet, sellerWallet] = await Promise.all([
      walletRepo.getProfileWallet(existingDeal.buyer_id),
      walletRepo.getProfileWallet(existingDeal.seller_id),
    ]);

    if (!buyerWallet || !sellerWallet) {
      return NextResponse.json(
        createErrorResponse('STELLAR_EXECUTION_INVALID', 'Both parties must have Profile Wallets to complete settlement.'),
        { status: 400 }
      );
    }

    const runtimeLoaded = loadDealRoomTestnetRuntime(
      {
        signer_port_factory: () => new ProfileWalletSigner(sellerWallet.encrypted_secret_key),
      },
      buyerWallet.public_address,
      sellerWallet.public_address
    );
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
