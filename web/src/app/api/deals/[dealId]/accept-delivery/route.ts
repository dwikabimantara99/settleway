import { NextResponse } from 'next/server';
import { mockStore } from '@/lib/db/mock-store';
import { createSuccessResponse, createErrorResponse } from '@/lib/api/validation';
import { transition, EscrowAction } from '@/lib/escrow/state-machine';
import { createEvent } from '@/lib/escrow/events';

export async function POST(request: Request, { params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = await params;
  const actionName = 'accept_delivery' as EscrowAction;

  try {
    const existingDeal = mockStore.deals.get(dealId);
    if (!existingDeal) {
      return NextResponse.json(createErrorResponse('NOT_FOUND', 'Deal not found'), { status: 404 });
    }

    const updatedDeal = transition(existingDeal, actionName);
    mockStore.updateDeal(dealId, updatedDeal);
    
    // Add event
    const event = createEvent(dealId, actionName, null, 'Executed ' + actionName);
    mockStore.addEvent(event);

    return NextResponse.json(createSuccessResponse(updatedDeal));
  } catch (err: unknown) {
    return NextResponse.json(createErrorResponse('BAD_REQUEST', err instanceof Error ? err.message : String(err)), { status: 400 });
  }
}
