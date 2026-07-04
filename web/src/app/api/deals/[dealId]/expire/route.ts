import { NextResponse } from 'next/server';
import { repository } from '@/lib/repositories';
import { requireDealParticipant } from '@/lib/auth/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/api/validation';
import type { DbDeal, ReputationOutcome } from '@/lib/db/types';
import { transition, EscrowAction } from '@/lib/escrow/state-machine';
import { createEvent } from '@/lib/escrow/events';
import { loadDealRoomTestnetRuntime } from '@/lib/stellar/server/deal-room-testnet-runtime';
import { executeConfirmedDealRoomRouteAction } from '@/lib/stellar/server/deal-room-route-execution';
import { processReputationOutcome } from '@/lib/reputation/engine';
import { rejectLegacyActionForCustodyV2 } from '@/lib/deals/rail-guards';

async function runLegacyLocalExpiry(
  dealId: string,
  existingDeal: DbDeal,
  authUser: { id: string },
  outcome: ReputationOutcome | null,
  refundToParty: 'buyer' | 'seller' | null,
  penalizedParty: 'buyer' | 'seller' | null,
  eventMessage: string,
) {
  const updatedDeal = transition(existingDeal, 'expire');
  const { replaced } = await repository.replaceDealIfCurrent({ current: existingDeal, next: updatedDeal });
  if (!replaced) {
    return NextResponse.json(createErrorResponse('CONFLICT', 'Concurrent update'), { status: 409 });
  }

  const event = createEvent(dealId, 'expire', authUser.id, eventMessage, {
    previous_status: existingDeal.status,
    next_status: updatedDeal.status,
    refund_to_party: refundToParty,
    penalized_party: penalizedParty,
    no_slashing_before_lock: true,
  });
  await repository.addEvent(event);

  if (outcome) {
    const operationStatus = updatedDeal.stellar_mode === 'mock_only' ? 'confirmed' : 'unknown';
    await processReputationOutcome(repository, {
      deal_id: updatedDeal.id,
      buyer_id: updatedDeal.buyer_id,
      seller_id: updatedDeal.seller_id,
      reputation_outcome: outcome,
      principal_idr: updatedDeal.principal_idr,
      local_terminal_outcome_persisted: true,
      operation_status: operationStatus as 'confirmed' | 'unknown',
      sync_status: updatedDeal.stellar_sync_status,
    }, () => globalThis.crypto.randomUUID());
  }

  return NextResponse.json(createSuccessResponse(updatedDeal));
}

export async function POST(_request: Request, { params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = await params;
  const actionName = 'expire' as EscrowAction;

  try {
    let existingDeal;
    let authUser;
    try {
      const auth = await requireDealParticipant(dealId);
      existingDeal = auth.deal;
      authUser = auth.user;
    } catch (e: unknown) {
      return NextResponse.json(createErrorResponse('UNAUTHORIZED', (e instanceof Error ? e.message : String(e))), { status: 401 });
    }

    const custodyV2Rejection = rejectLegacyActionForCustodyV2(existingDeal, 'Funding expiry');
    if (custodyV2Rejection) return custodyV2Rejection;

    let outcome: ReputationOutcome | null = null;
    let refundToParty: 'buyer' | 'seller' | null = null;
    let penalizedParty: 'buyer' | 'seller' | null = null;
    let eventMessage = 'Funding window expired before either side funded.';

    if (existingDeal.status === 'BUYER_FUNDED') {
      outcome = 'seller_failed_deposit';
      refundToParty = 'buyer';
      penalizedParty = 'seller';
      eventMessage =
        'Funding window expired. Buyer should be refunded in full before lock and seller takes the reputation penalty.';
    } else if (existingDeal.status === 'SELLER_FUNDED') {
      outcome = 'buyer_failed_deposit';
      refundToParty = 'seller';
      penalizedParty = 'buyer';
      eventMessage =
        'Funding window expired. Seller should be refunded in full before lock and buyer takes the reputation penalty.';
    }

    if (existingDeal.stellar_mode !== 'testnet') {
      return await runLegacyLocalExpiry(
        dealId,
        existingDeal,
        authUser,
        outcome,
        refundToParty,
        penalizedParty,
        eventMessage,
      );
    }

    const runtimeLoaded = loadDealRoomTestnetRuntime();
    if (!runtimeLoaded.ok) {
      return NextResponse.json(
        createErrorResponse(
          'STELLAR_RUNTIME_UNAVAILABLE',
          'Funding expiry is configured for Stellar Testnet, but the local runtime is not ready.',
        ),
        { status: 503 },
      );
    }

    const executionResult = await executeConfirmedDealRoomRouteAction({
      action: 'expire',
      action_label: 'funding expiry',
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
    const event = createEvent(dealId, actionName, authUser.id, eventMessage, {
      previous_status: existingDeal.status,
      next_status: updatedDeal.status,
      refund_to_party: refundToParty,
      penalized_party: penalizedParty,
      no_slashing_before_lock: true,
      contract_id: runtimeLoaded.runtime.contract_id,
      actor_address: runtimeLoaded.runtime.metadata.admin_address,
    });
    event.tx_hash = executionResult.operation.transaction_hash;
    await repository.addEvent(event);

    return NextResponse.json(createSuccessResponse(updatedDeal));
  } catch (err: unknown) {
    return NextResponse.json(createErrorResponse('BAD_REQUEST', err instanceof Error ? err.message : String(err)), { status: 400 });
  }
}
