import { NextResponse } from 'next/server';
import { repository } from '@/lib/repositories';
import { requireDealParticipant } from '@/lib/auth/server';
import { createErrorResponse } from '@/lib/api/validation';

export async function POST(_request: Request, { params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = await params;

  try {
    let existingDeal;
    try {
      const auth = await requireDealParticipant(dealId);
      existingDeal = auth.deal;
    } catch (e: unknown) {
      return NextResponse.json(createErrorResponse('UNAUTHORIZED', (e instanceof Error ? e.message : String(e))), { status: 401 });
    }

    if (existingDeal.status !== 'REFUND_PENDING') {
      return NextResponse.json(
        createErrorResponse('INVALID_STATE', `Cannot sweep refund from state: ${existingDeal.status}`),
        { status: 400 }
      );
    }

    // Determine refund eligibility based on past events and status.
    const events = await repository.getDealEvents(dealId);
    const expireEvent = events.find((e) => e.event_type === 'expire' || e.event_type === 'reject_delivery' || e.event_type === 'expire_proof');
    const metadata = expireEvent?.metadata as Record<string, unknown> | undefined;

    let refundRecipient = metadata?.refund_to_party as 'buyer' | 'seller' | undefined;
    
    if (!refundRecipient) {
        // Fallback checks
        if (events.some(e => e.event_type === 'expire' && (e.metadata as Record<string, unknown> | undefined)?.previous_status === 'BUYER_FUNDED')) {
            refundRecipient = 'buyer';
        } else if (events.some(e => e.event_type === 'expire' && (e.metadata as Record<string, unknown> | undefined)?.previous_status === 'SELLER_FUNDED')) {
            refundRecipient = 'seller';
        }
    }

    if (!refundRecipient) {
      return NextResponse.json(
        createErrorResponse('INVALID_STATE', 'Ambiguous refund recipient. Cannot determine who should receive the refund.'),
        { status: 400 }
      );
    }

    // Blocker logic: Real Testnet execution is not supported by current contract/profile wallet architecture.
    return NextResponse.json(
      createErrorResponse(
        'NOT_IMPLEMENTED',
        'Real Testnet confirmed refund sweep cannot be safely executed because the current Soroban bindings lack a method to extract funds from a locked escrow, and the Managed Profile Wallet architecture lacks external withdrawal destination modeling. Classified as LOCAL_REFUND_SWEEP_PREP_ONLY.'
      ),
      { status: 501 }
    );
  } catch (err: unknown) {
    return NextResponse.json(createErrorResponse('BAD_REQUEST', err instanceof Error ? err.message : String(err)), { status: 400 });
  }
}
