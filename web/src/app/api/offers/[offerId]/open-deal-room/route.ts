import { NextResponse } from 'next/server';
import { createErrorResponse, createSuccessResponse } from '@/lib/api/validation';
import { requireOfferParticipant } from '@/lib/auth/server';
import { repository } from '@/lib/repositories';
import {
  buildDealFromOffer,
  buildNotification,
  getCounterpartyId,
  hasActorOpenedRoom,
} from '@/lib/offers/helpers';

export async function POST(_request: Request, { params }: { params: Promise<{ offerId: string }> }) {
  try {
    const { offerId } = await params;
    const { offer, role, user } = await requireOfferParticipant(offerId);
    const now = new Date().toISOString();

    if (offer.active_deal_id) {
      return NextResponse.json(
        createSuccessResponse(
          { offer, deal_id: offer.active_deal_id, redirect_to: `/deals/${offer.active_deal_id}` },
          { source: 'repository' },
        ),
      );
    }

    if (!offer.terms_accepted_at) {
      return NextResponse.json(
        createErrorResponse(
          'PRECONDITION_REQUIRED',
          'Both parties must agree the deal terms before Open Deal Room becomes available.',
        ),
        { status: 409 },
      );
    }

    if (hasActorOpenedRoom(offer, user.id)) {
      return NextResponse.json(
        createSuccessResponse({ offer, redirect_to: null }, { source: 'repository', idempotent: true }),
      );
    }

    const updatedFields =
      role === 'buyer'
        ? { buyer_open_room_at: now }
        : { seller_open_room_at: now };

    const updatedOffer = {
      ...offer,
      ...updatedFields,
    };

    const bothOpened = Boolean(updatedOffer.buyer_open_room_at && updatedOffer.seller_open_room_at);

    if (bothOpened) {
      const dealId = `deal-${offer.id}`;
      const existingDeal = await repository.getDeal(dealId);
      if (!existingDeal) {
        await repository.createDeal(
          buildDealFromOffer({
            id: dealId,
            offer: updatedOffer,
            now,
          }),
        );
      }

      await repository.updateOffer(offerId, {
        ...updatedFields,
        status: 'active_escrow',
        active_deal_id: dealId,
        updated_at: now,
      });

      await repository.addNotification(
        buildNotification({
          id: `notif-${Date.now()}`,
          recipientId: getCounterpartyId(updatedOffer, user.id),
          offerId,
          type: 'deal_room_activated',
          message: 'Both parties committed. The active escrow room is now open for deposits.',
          now,
        }),
      );

      return NextResponse.json(
        createSuccessResponse(
          {
            offer: {
              ...updatedOffer,
              status: 'active_escrow',
              active_deal_id: dealId,
              updated_at: now,
            },
            deal_id: dealId,
            redirect_to: `/deals/${dealId}`,
          },
          { source: 'repository' },
        ),
      );
    }

    await repository.updateOffer(offerId, {
      ...updatedFields,
      status: 'awaiting_counterparty_open',
      updated_at: now,
    });

    await repository.addNotification(
      buildNotification({
        id: `notif-${Date.now()}`,
        recipientId: getCounterpartyId(updatedOffer, user.id),
        offerId,
        type: 'counterparty_opened_room',
        message: 'Your counterpart already clicked Open Deal Room. Your confirmation will activate the escrow room.',
        now,
      }),
    );

    return NextResponse.json(
      createSuccessResponse(
        {
          offer: {
            ...updatedOffer,
            status: 'awaiting_counterparty_open',
            updated_at: now,
          },
          deal_id: null,
          redirect_to: null,
        },
        { source: 'repository' },
      ),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message === 'Offer not found' ? 404 : message === 'Unauthorized' ? 401 : 403;
    return NextResponse.json(createErrorResponse('ACCESS_DENIED', message), { status });
  }
}
