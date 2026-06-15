import { NextResponse } from 'next/server';
import { repository } from '@/lib/repositories';
import { requireDealParticipant } from '@/lib/auth/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/api/validation';
import { transition, EscrowAction } from '@/lib/escrow/state-machine';
import { createEvent } from '@/lib/escrow/events';

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
    } catch (e) {
      return NextResponse.json(createErrorResponse('UNAUTHORIZED', e.message), { status: 401 });
    }

    const updatedDeal = transition(existingDeal, actionName);
    const { replaced } = await repository.replaceDealIfCurrent({ current: existingDeal, next: updatedDeal });
    if (!replaced) return NextResponse.json(createErrorResponse('CONFLICT', 'Concurrent update'), { status: 409 });
    
    // Add event
    const event = createEvent(dealId, actionName, authUser.id, 'Executed ' + actionName);
    await repository.addEvent(event);

    return NextResponse.json(createSuccessResponse(updatedDeal));
  } catch (err: unknown) {
    return NextResponse.json(createErrorResponse('BAD_REQUEST', err instanceof Error ? err.message : String(err)), { status: 400 });
  }
}
