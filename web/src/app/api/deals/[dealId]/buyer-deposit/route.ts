import { NextResponse } from 'next/server';
import { mockStore } from '@/lib/db/mock-store';
import { createSuccessResponse, createErrorResponse } from '@/lib/api/validation';
import { transition, EscrowAction } from '@/lib/escrow/state-machine';
import { createEvent } from '@/lib/escrow/events';
import { recordEscrowActionOnChain, submitProofHashOnChain } from '@/lib/stellar/helpers';

export async function POST(request: Request, { params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = await params;
  const actionName = 'buyer_deposit' as EscrowAction;

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

    // Stellar Integration
    if (updatedDeal.contract_id) {
      let stellarRes = null;
      if (actionName === 'submit_proof') {
        stellarRes = await submitProofHashOnChain(updatedDeal.contract_id);
      } else {
        stellarRes = await recordEscrowActionOnChain(updatedDeal.contract_id, 'deposit_buyer');
      }
      
      if (stellarRes) {
        updatedDeal.latest_tx_hash = stellarRes.hash;
        mockStore.updateDeal(dealId, updatedDeal);
      }
    }


    return NextResponse.json(createSuccessResponse(updatedDeal));
  } catch (err: unknown) {
    return NextResponse.json(createErrorResponse('BAD_REQUEST', err instanceof Error ? err.message : String(err)), { status: 400 });
  }
}
