import { NextResponse } from 'next/server';
import { repository } from '@/lib/repositories';
import { requireDealParticipant } from '@/lib/auth/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/api/validation';
import type { DbDeal } from '@/lib/db/types';
import { isPreLockDealStatus, transition, EscrowAction } from '@/lib/escrow/state-machine';
import { createEvent } from '@/lib/escrow/events';
import { loadDealRoomTestnetRuntime } from '@/lib/stellar/server/deal-room-testnet-runtime';
import { executeConfirmedDealRoomRouteAction } from '@/lib/stellar/server/deal-room-route-execution';
import { processReputationOutcome } from '@/lib/reputation/engine';

async function runLegacyLocalRefund(
  dealId: string,
  existingDeal: DbDeal,
  authUser: { id: string },
  isPreLocked: boolean,
  refundToParty: 'buyer' | 'seller' | null,
) {
  const updatedDeal = transition(existingDeal, 'refund');
  const { replaced } = await repository.replaceDealIfCurrent({ current: existingDeal, next: updatedDeal });
  if (!replaced) return NextResponse.json(createErrorResponse('CONFLICT', 'Concurrent update'), { status: 409 });

  const event = createEvent(
    dealId,
    'refund',
    authUser.id,
    'Pre-lock refund recorded. Any funded side should receive a full refund and no party is penalized.',
    {
      previous_status: existingDeal.status,
      next_status: updatedDeal.status,
      refund_to_party: refundToParty,
      penalized_party: null,
      no_slashing_before_lock: true,
      neutral_outcome: true,
    },
  );
  await repository.addEvent(event);

  if (isPreLocked) {
    const operationStatus = updatedDeal.stellar_mode === 'mock_only' ? 'confirmed' : 'unknown';
    await processReputationOutcome(repository, {
      deal_id: updatedDeal.id,
      buyer_id: updatedDeal.buyer_id,
      seller_id: updatedDeal.seller_id,
      reputation_outcome: 'refunded_before_locked',
      principal_idr: updatedDeal.principal_idr,
      local_terminal_outcome_persisted: true,
      operation_status: operationStatus as 'confirmed' | 'unknown',
      sync_status: updatedDeal.stellar_sync_status
    }, () => globalThis.crypto.randomUUID());
  }

  return NextResponse.json(createSuccessResponse(updatedDeal));
}

export async function POST(_request: Request, { params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = await params;
  const actionName = 'refund' as EscrowAction;

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

    const isPreLocked = isPreLockDealStatus(existingDeal.status);
    const refundToParty =
      existingDeal.status === 'BUYER_FUNDED'
        ? 'buyer'
        : existingDeal.status === 'SELLER_FUNDED'
          ? 'seller'
          : null;

    if (existingDeal.stellar_mode !== 'testnet') {
      return await runLegacyLocalRefund(dealId, existingDeal, authUser, isPreLocked, refundToParty);
    }

    const runtimeLoaded = loadDealRoomTestnetRuntime();
    if (!runtimeLoaded.ok) {
      return NextResponse.json(
        createErrorResponse(
          'STELLAR_RUNTIME_UNAVAILABLE',
          'Pre-lock refund is configured for Stellar Testnet, but the local runtime is not ready.',
        ),
        { status: 503 },
      );
    }

    const executionResult = await executeConfirmedDealRoomRouteAction({
      action: 'refund',
      action_label: 'pre-lock refund',
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
      'Pre-lock refund recorded through the protected Testnet-backed room path. Any funded side should receive a full refund and no party is penalized.',
      {
        previous_status: existingDeal.status,
        next_status: updatedDeal.status,
        refund_to_party: refundToParty,
        penalized_party: null,
        no_slashing_before_lock: true,
        neutral_outcome: true,
        contract_id: runtimeLoaded.runtime.contract_id,
        actor_address: runtimeLoaded.runtime.metadata.admin_address,
      },
    );
    event.tx_hash = executionResult.operation.transaction_hash;
    await repository.addEvent(event);

    return NextResponse.json(createSuccessResponse(updatedDeal));
  } catch (err: unknown) {
    return NextResponse.json(createErrorResponse('BAD_REQUEST', err instanceof Error ? err.message : String(err)), { status: 400 });
  }
}
