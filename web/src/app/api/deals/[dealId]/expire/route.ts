import { NextResponse } from 'next/server';
import { mockStore } from '@/lib/db/mock-store';
import { createSuccessResponse, createErrorResponse } from '@/lib/api/validation';
import { transition, EscrowAction } from '@/lib/escrow/state-machine';
import { createEvent } from '@/lib/escrow/events';
import { processReputationOutcome } from '@/lib/reputation/engine';
import { ReputationOutcome } from '@/lib/db/types';

export async function POST(request: Request, { params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = await params;
  const actionName = 'expire' as EscrowAction;

  try {
    const existingDeal = mockStore.deals.get(dealId);
    if (!existingDeal) {
      return NextResponse.json(createErrorResponse('NOT_FOUND', 'Deal not found'), { status: 404 });
    }

    let outcome: ReputationOutcome | null = null;
    if (existingDeal.status === 'BUYER_FUNDED') {
      outcome = 'seller_failed_deposit';
    } else if (existingDeal.status === 'SELLER_FUNDED') {
      outcome = 'buyer_failed_deposit';
    }

    const updatedDeal = transition(existingDeal, actionName);
    mockStore.updateDeal(dealId, updatedDeal);
    
    // Add event
    const event = createEvent(dealId, actionName, null, 'Executed ' + actionName);
    mockStore.addEvent(event);

    if (outcome) {
      const operationStatus = updatedDeal.stellar_mode === 'mock_only' ? 'confirmed' : 'unknown';
      processReputationOutcome(mockStore, {
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
