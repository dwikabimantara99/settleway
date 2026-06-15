import { NextResponse } from 'next/server';
import { mockStore } from '@/lib/db/mock-store';
import { createSuccessResponse, createErrorResponse } from '@/lib/api/validation';
import { transition, EscrowAction } from '@/lib/escrow/state-machine';
import { createEvent } from '@/lib/escrow/events';
import { processReputationOutcome } from '@/lib/reputation/engine';

export async function POST(request: Request, { params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = await params;
  const actionName = 'refund' as EscrowAction;

  try {
    const existingDeal = mockStore.deals.get(dealId);
    if (!existingDeal) {
      return NextResponse.json(createErrorResponse('NOT_FOUND', 'Deal not found'), { status: 404 });
    }

    const preLockedStates = ['WAITING_DEPOSITS', 'BUYER_FUNDED', 'SELLER_FUNDED'];
    const isPreLocked = preLockedStates.includes(existingDeal.status);

    const updatedDeal = transition(existingDeal, actionName);
    mockStore.updateDeal(dealId, updatedDeal);
    
    // Add event
    const event = createEvent(dealId, actionName, null, 'Executed ' + actionName);
    mockStore.addEvent(event);

    if (isPreLocked) {
      const operationStatus = updatedDeal.stellar_mode === 'mock_only' ? 'confirmed' : 'unknown';
      processReputationOutcome(mockStore, {
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
  } catch (err: unknown) {
    return NextResponse.json(createErrorResponse('BAD_REQUEST', err instanceof Error ? err.message : String(err)), { status: 400 });
  }
}
