import { NextResponse } from 'next/server';
import { repository } from '@/lib/repositories';
import { requireAuth, requireOfferParticipant } from '@/lib/auth/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/api/validation';
import { buildDealFromOffer } from '@/lib/offers/helpers';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { offerId } = body as { offerId?: string };

    try {
      await requireAuth();
    } catch (e) {
      return NextResponse.json(createErrorResponse('UNAUTHORIZED', (e as Error).message), { status: 401 });
    }

    if (!offerId) {
      return NextResponse.json(
        createErrorResponse(
          'DIRECT_DEAL_DISABLED',
          'Direct deal creation is disabled. Use Submit Offer and mutual Open Deal Room first.',
          false,
        ),
        { status: 409 },
      );
    }

    const { offer } = await requireOfferParticipant(offerId);

    if (!offer.buyer_open_room_at || !offer.seller_open_room_at) {
      return NextResponse.json(
        createErrorResponse(
          'OPEN_DEAL_ROOM_INCOMPLETE',
          'Both parties must click Open Deal Room before an active escrow deal can be created.',
          false,
        ),
        { status: 409 },
      );
    }

    const dealId = offer.active_deal_id || `deal-${offer.id}`;
    const existingDeal = await repository.getDeal(dealId);
    if (existingDeal) {
      return NextResponse.json(createSuccessResponse(existingDeal, { source: 'repository', reused: true }));
    }

    const newDeal = buildDealFromOffer({
      id: dealId,
      offer,
      now: new Date().toISOString(),
    });

    await repository.createDeal(newDeal);
    await repository.updateOffer(offer.id, {
      status: 'active_escrow',
      active_deal_id: dealId,
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json(createSuccessResponse(newDeal, { source: 'repository' }));
  } catch (err: unknown) {
    return NextResponse.json(createErrorResponse('INTERNAL_ERROR', err instanceof Error ? err.message : String(err)), { status: 500 });
  }
}
