import { NextResponse } from 'next/server';
import { createErrorResponse, createSuccessResponse } from '@/lib/api/validation';
import { repository } from '@/lib/repositories';
import { requireOfferParticipant } from '@/lib/auth/server';
import { buildNotification, getCounterpartyId } from '@/lib/offers/helpers';
import { performOpenDealRoomCommitment } from '@/lib/offers/open-deal-room';

export async function GET(_request: Request, { params }: { params: Promise<{ offerId: string }> }) {
  try {
    const { offerId } = await params;
    const { offer } = await requireOfferParticipant(offerId);
    const messages = await repository.getOfferMessages(offer.id);
    return NextResponse.json(createSuccessResponse({ offer, messages }, { source: 'repository' }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message === 'Offer not found' ? 404 : message === 'Unauthorized' ? 401 : 403;
    return NextResponse.json(createErrorResponse('ACCESS_DENIED', message), { status });
  }
}

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ offerId: string }> },
) {
  try {
    const { offerId } = await params;
    const { offer, user } = await requireOfferParticipant(offerId);

    if (offer.terms_accepted_at) {
      return NextResponse.json(
        createSuccessResponse({ offer }, { source: 'repository', idempotent: true }),
      );
    }

    if (offer.initiated_by_id === user.id) {
      return NextResponse.json(
        createErrorResponse(
          'INVALID_ACTOR',
          'Only the counterparty can accept the submitted offer terms.',
        ),
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const updatedOffer = {
      ...offer,
      status: 'terms_accepted' as const,
      terms_accepted_at: now,
      terms_accepted_by_id: user.id,
      updated_at: now,
    };

    if (offerId.startsWith('offer-live-cabai-')) {
      const runId = offerId.replace('offer-live-cabai-', '');
      const { updateDemoOffer, insertDemoNotification } = await import('@/lib/offers/demo-service');
      await updateDemoOffer(offerId, {
        status: 'terms_accepted',
        terms_accepted_at: now,
        terms_accepted_by_id: user.id,
        updated_at: now,
      });

      await insertDemoNotification(
        buildNotification({
          id: `notif-live-cabai-acc-${runId}`,
          recipientId: getCounterpartyId(offer, user.id),
          offerId,
          type: 'offer_accepted',
          message: 'Your counterparty accepted the proposed deal terms. Open Deal Room is now available.',
          now,
        }),
      );

      return NextResponse.json(
        createSuccessResponse({ offer: updatedOffer }, { source: 'repository' }),
      );
    }

    await repository.updateOffer(offerId, {
      status: 'terms_accepted',
      terms_accepted_at: now,
      terms_accepted_by_id: user.id,
      updated_at: now,
    });

    await repository.addNotification(
      buildNotification({
        id: `notif-${Date.now()}`,
        recipientId: getCounterpartyId(offer, user.id),
        offerId,
        type: 'offer_accepted',
        message: 'Your counterparty accepted the proposed deal terms. Open Deal Room is now available.',
        now,
      }),
    );

    return NextResponse.json(
      createSuccessResponse({ offer: updatedOffer }, { source: 'repository' }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message === 'Offer not found' ? 404 : message === 'Unauthorized' ? 401 : 403;
    return NextResponse.json(createErrorResponse('ACCESS_DENIED', message), { status });
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ offerId: string }> },
) {
  const { offerId } = await params;
  const result = await performOpenDealRoomCommitment(offerId);
  return NextResponse.json(result.payload, { status: result.status });
}
