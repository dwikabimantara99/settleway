import { createErrorResponse, createSuccessResponse } from '@/lib/api/validation';
import { requireOfferParticipant } from '@/lib/auth/server';
import type { ApiResult, DbOffer } from '@/lib/db/types';
import { repository } from '@/lib/repositories';
import {
  buildDealFromOffer,
  buildNotification,
  getCounterpartyId,
  hasActorOpenedRoom,
} from '@/lib/offers/helpers';

export interface OpenDealRoomSuccessData {
  offer: DbOffer;
  deal_id: string | null;
  redirect_to: string | null;
}

export interface OpenDealRoomRouteResult {
  status: number;
  payload: ApiResult<OpenDealRoomSuccessData>;
}

export async function performOpenDealRoomCommitment(
  offerId: string,
): Promise<OpenDealRoomRouteResult> {
  try {
    const { offer, role, user } = await requireOfferParticipant(offerId);
    const now = new Date().toISOString();

    if (offer.active_deal_id) {
      return {
        status: 200,
        payload: createSuccessResponse(
          { offer, deal_id: offer.active_deal_id, redirect_to: `/deals/${offer.active_deal_id}` },
          { source: 'repository' },
        ),
      };
    }

    if (!offer.terms_accepted_at) {
      return {
        status: 409,
        payload: createErrorResponse(
          'PRECONDITION_REQUIRED',
          'Both parties must agree the deal terms before Open Deal Room becomes available.',
        ),
      };
    }

    if (hasActorOpenedRoom(offer, user.id)) {
      return {
        status: 200,
        payload: createSuccessResponse(
          { offer, deal_id: offer.active_deal_id, redirect_to: offer.active_deal_id ? `/deals/${offer.active_deal_id}` : null },
          { source: 'repository', idempotent: true },
        ),
      };
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

      return {
        status: 200,
        payload: createSuccessResponse(
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
      };
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

    return {
      status: 200,
      payload: createSuccessResponse(
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
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message === 'Offer not found' ? 404 : message === 'Unauthorized' ? 401 : 403;

    return {
      status,
      payload: createErrorResponse('ACCESS_DENIED', message),
    };
  }
}
