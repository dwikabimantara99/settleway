import { NextResponse } from 'next/server';
import { repository } from '@/lib/repositories';
import { requireDealParticipant } from '@/lib/auth/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/api/validation';
import { transition, EscrowAction } from '@/lib/escrow/state-machine';
import { createEvent } from '@/lib/escrow/events';

export async function POST(request: Request, { params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = await params;
  const actionName = 'reject_delivery' as EscrowAction;

  try {
    const { reason } = await request.json();
    if (!reason || typeof reason !== 'string') {
      return NextResponse.json(createErrorResponse('BAD_REQUEST', 'Rejection reason is required'), { status: 400 });
    }

    let existingDeal;
    let authUser;
    try {
      const auth = await requireDealParticipant(dealId);
      existingDeal = auth.deal;
      authUser = auth.user;
    } catch (e: unknown) {
      return NextResponse.json(createErrorResponse('UNAUTHORIZED', (e instanceof Error ? e.message : String(e))), { status: 401 });
    }

    if (existingDeal.buyer_id !== authUser.id) {
      return NextResponse.json(createErrorResponse('FORBIDDEN', 'Only the buyer can reject delivery'), { status: 403 });
    }

    if (existingDeal.status !== 'PROOF_SUBMITTED' && existingDeal.status !== 'DELIVERED') {
      return NextResponse.json(
        createErrorResponse('INVALID_STATE', `Cannot reject delivery from state: ${existingDeal.status}`),
        { status: 400 }
      );
    }

    const updatedDeal = transition(existingDeal, actionName);
    const { replaced } = await repository.replaceDealIfCurrent({ current: existingDeal, next: updatedDeal });
    
    if (!replaced) {
      return NextResponse.json(createErrorResponse('CONFLICT', 'Concurrent update'), { status: 409 });
    }

    const eventMessage = `Buyer rejected delivery. Reason: ${reason} (LOCAL_FAILURE_CLASSIFICATION_ONLY)`;
    const event = createEvent(dealId, actionName, authUser.id, eventMessage, {
      previous_status: existingDeal.status,
      next_status: updatedDeal.status,
      rejection_reason: reason,
      fixture_kind: 'LOCAL_FAILURE_CLASSIFICATION_ONLY'
    });
    
    await repository.addEvent(event);

    return NextResponse.json(createSuccessResponse(updatedDeal));
  } catch (err: unknown) {
    return NextResponse.json(createErrorResponse('BAD_REQUEST', err instanceof Error ? err.message : String(err)), { status: 400 });
  }
}
