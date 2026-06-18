import { NextResponse } from 'next/server';
import { repository } from '@/lib/repositories';
import { requireDealParticipant } from '@/lib/auth/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/api/validation';
import type { DbDeal } from '@/lib/db/types';
import { transition, EscrowAction } from '@/lib/escrow/state-machine';
import { createEvent } from '@/lib/escrow/events';
import { processReputationOutcome } from '@/lib/reputation/engine';
import { loadDealRoomTestnetRuntime } from '@/lib/stellar/server/deal-room-testnet-runtime';
import { executeConfirmedDealRoomRouteAction } from '@/lib/stellar/server/deal-room-route-execution';

async function runLegacyLocalAcceptance(
  dealId: string,
  existingDeal: DbDeal,
  actorId: string,
) {
  const updatedDeal = transition(existingDeal, 'accept_delivery');
  const { replaced } = await repository.replaceDealIfCurrent({ current: existingDeal, next: updatedDeal });
  if (!replaced) return NextResponse.json(createErrorResponse('CONFLICT', 'Concurrent update'), { status: 409 });
  const settlementReference =
    updatedDeal.latest_stellar_tx_hash ??
    (updatedDeal.proof_hash ? `proof:${updatedDeal.proof_hash}` : `room-settlement:${updatedDeal.id}`);
  const settledAt = new Date().toISOString();

  const event = createEvent(
    dealId,
    'accept_delivery',
    actorId,
    'Buyer confirmed receipt. Settlement is complete and final balances are routed to the destination wallets.',
    {
      next_status: updatedDeal.status,
      principal_to_seller_idr: updatedDeal.principal_idr,
      buyer_bond_return_idr: updatedDeal.buyer_bond_idr,
      seller_bond_return_idr: updatedDeal.seller_bond_idr,
      platform_fee_total_idr: updatedDeal.buyer_fee_idr + updatedDeal.seller_fee_idr,
      buyer_wallet_credit_idr: updatedDeal.buyer_bond_idr,
      seller_wallet_credit_idr: updatedDeal.principal_idr + updatedDeal.seller_bond_idr,
      platform_wallet_credit_idr: updatedDeal.buyer_fee_idr + updatedDeal.seller_fee_idr,
      settlement_reference: settlementReference,
      settled_at: settledAt,
    },
  );
  await repository.addEvent(event);

  const operationStatus = updatedDeal.stellar_mode === 'mock_only' ? 'confirmed' : 'unknown';

  await processReputationOutcome(repository, {
    deal_id: updatedDeal.id,
    buyer_id: updatedDeal.buyer_id,
    seller_id: updatedDeal.seller_id,
    reputation_outcome: 'transaction_completed',
    principal_idr: updatedDeal.principal_idr,
    transaction_hash: updatedDeal.latest_stellar_tx_hash,
    proof_hash: updatedDeal.proof_hash,
    settlement_reference: settlementReference,
    settled_at: settledAt,
    local_terminal_outcome_persisted: true,
    operation_status: operationStatus as 'confirmed' | 'unknown',
    sync_status: updatedDeal.stellar_sync_status
  }, () => globalThis.crypto.randomUUID());

  return NextResponse.json(createSuccessResponse(updatedDeal));
}

export async function POST(request: Request, { params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = await params;
  const actionName = 'accept_delivery' as EscrowAction;

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
    if (userRole !== 'buyer') return NextResponse.json(createErrorResponse('UNAUTHORIZED', 'Only buyer can perform this action'), { status: 403 });

    if (existingDeal.stellar_mode !== 'testnet') {
      return runLegacyLocalAcceptance(dealId, existingDeal, authUser.id);
    }

    const runtimeLoaded = loadDealRoomTestnetRuntime();
    if (!runtimeLoaded.ok) {
      return NextResponse.json(
        createErrorResponse(
          'STELLAR_RUNTIME_UNAVAILABLE',
          'Buyer acceptance is configured for Stellar Testnet, but the local runtime is not ready.',
        ),
        { status: 503 },
      );
    }

    const executionResult = await executeConfirmedDealRoomRouteAction({
      action: 'accept_delivery',
      action_label: 'buyer acceptance',
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
    const settlementReference =
      updatedDeal.latest_stellar_tx_hash ??
      (updatedDeal.proof_hash ? `proof:${updatedDeal.proof_hash}` : `room-settlement:${updatedDeal.id}`);
    const settledAt = new Date().toISOString();

    const event = createEvent(
      dealId,
      actionName,
      authUser.id,
      'Buyer confirmed receipt through the protected Testnet-backed room path. Completion and reputation closure now share the same trust trail.',
      {
        next_status: updatedDeal.status,
        principal_to_seller_idr: updatedDeal.principal_idr,
        buyer_bond_return_idr: updatedDeal.buyer_bond_idr,
        seller_bond_return_idr: updatedDeal.seller_bond_idr,
        platform_fee_total_idr: updatedDeal.buyer_fee_idr + updatedDeal.seller_fee_idr,
        buyer_wallet_credit_idr: updatedDeal.buyer_bond_idr,
        seller_wallet_credit_idr: updatedDeal.principal_idr + updatedDeal.seller_bond_idr,
        platform_wallet_credit_idr: updatedDeal.buyer_fee_idr + updatedDeal.seller_fee_idr,
        settlement_reference: settlementReference,
        settled_at: settledAt,
        contract_id: runtimeLoaded.runtime.contract_id,
        actor_address: runtimeLoaded.runtime.metadata.buyer_demo_address,
      },
    );
    event.tx_hash = executionResult.operation.transaction_hash;
    await repository.addEvent(event);

    return NextResponse.json(createSuccessResponse(updatedDeal));
  } catch (err: unknown) {
    return NextResponse.json(createErrorResponse('BAD_REQUEST', err instanceof Error ? err.message : String(err)), { status: 400 });
  }
}
