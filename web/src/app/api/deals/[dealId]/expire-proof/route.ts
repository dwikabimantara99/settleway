import { NextResponse } from 'next/server';
import { repository } from '@/lib/repositories';
import { requireDealParticipant } from '@/lib/auth/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/api/validation';
import { transition, EscrowAction } from '@/lib/escrow/state-machine';
import { createEvent } from '@/lib/escrow/events';
import { processReputationOutcome } from '@/lib/reputation/engine';

export async function POST(_request: Request, { params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = await params;
  const actionName = 'expire_proof' as EscrowAction;

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

    if (existingDeal.status !== 'LOCKED') {
      return NextResponse.json(
        createErrorResponse('INVALID_STATE', `Cannot evaluate proof expiry from state: ${existingDeal.status}`),
        { status: 400 }
      );
    }

    const updatedDeal = transition(existingDeal, actionName);
    const { replaced } = await repository.replaceDealIfCurrent({ current: existingDeal, next: updatedDeal });
    
    if (!replaced) {
      return NextResponse.json(createErrorResponse('CONFLICT', 'Concurrent update'), { status: 409 });
    }

    const eventMessage = 'Seller failed to submit delivery proof before deadline. Moved to manual review (LOCAL_FAILURE_CLASSIFICATION_ONLY).';
    const event = createEvent(dealId, actionName, authUser.id, eventMessage, {
      previous_status: existingDeal.status,
      next_status: updatedDeal.status,
      penalized_party: 'seller',
      no_slashing_before_lock: false,
      fixture_kind: 'LOCAL_FAILURE_CLASSIFICATION_ONLY'
    });
    
    await repository.addEvent(event);

    const operationStatus = existingDeal.stellar_mode === 'mock_only' ? 'confirmed' : 'unknown';
    await processReputationOutcome(repository, {
      deal_id: updatedDeal.id,
      buyer_id: updatedDeal.buyer_id,
      seller_id: updatedDeal.seller_id,
      reputation_outcome: 'seller_breached_delivery',
      principal_idr: updatedDeal.principal_idr,
      local_terminal_outcome_persisted: true,
      operation_status: operationStatus as 'confirmed' | 'unknown',
      sync_status: updatedDeal.stellar_sync_status,
    }, () => globalThis.crypto.randomUUID());

    return NextResponse.json(createSuccessResponse(updatedDeal));
  } catch (err: unknown) {
    return NextResponse.json(createErrorResponse('BAD_REQUEST', err instanceof Error ? err.message : String(err)), { status: 400 });
  }
}
