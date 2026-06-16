import { NextResponse } from 'next/server';
import { repository } from '@/lib/repositories';
import { requireDealParticipant } from '@/lib/auth/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/api/validation';
import { transition, EscrowAction } from '@/lib/escrow/state-machine';
import { createEvent } from '@/lib/escrow/events';
import { processReputationOutcome } from '@/lib/reputation/engine';
import { ReputationOutcome } from '@/lib/db/types';

export async function POST(request: Request, { params }: { params: Promise<{ dealId: string }> }) {
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

    let outcome: ReputationOutcome | null = null;
    if (existingDeal.status === 'BUYER_FUNDED') {
      outcome = 'seller_failed_deposit';
    } else if (existingDeal.status === 'SELLER_FUNDED') {
      outcome = 'buyer_failed_deposit';
    }

    const updatedDeal = transition(existingDeal, actionName);
    const { replaced } = await repository.replaceDealIfCurrent({ current: existingDeal, next: updatedDeal });
    if (!replaced) return NextResponse.json(createErrorResponse('CONFLICT', 'Concurrent update'), { status: 409 });
    
    // Add event
    const event = createEvent(dealId, actionName, authUser.id, 'Executed ' + actionName);
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
        sync_status: updatedDeal.stellar_sync_status
      }, () => globalThis.crypto.randomUUID());
    }

    return NextResponse.json(createSuccessResponse(updatedDeal));
  } catch (err: unknown) {
    return NextResponse.json(createErrorResponse('BAD_REQUEST', err instanceof Error ? err.message : String(err)), { status: 400 });
  }
}
