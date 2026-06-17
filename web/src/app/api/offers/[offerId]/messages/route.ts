import { NextResponse } from 'next/server';
import { createErrorResponse, createSuccessResponse } from '@/lib/api/validation';
import { requireOfferParticipant } from '@/lib/auth/server';
import { repository } from '@/lib/repositories';
import { buildNotification, buildOpeningMessage, getCounterpartyId } from '@/lib/offers/helpers';

export async function POST(request: Request, { params }: { params: Promise<{ offerId: string }> }) {
  try {
    const { offerId } = await params;
    const { offer, user } = await requireOfferParticipant(offerId);
    const body = await request.json();
    const messageBody = String(body?.body || '').trim();

    if (!messageBody) {
      return NextResponse.json(createErrorResponse('INVALID_INPUT', 'Message body is required.'), { status: 400 });
    }

    const now = new Date().toISOString();
    const message = buildOpeningMessage({
      id: `msg-${Date.now()}`,
      offerId,
      authorId: user.id,
      body: messageBody,
      now,
    });

    await repository.addOfferMessage(message);
    await repository.updateOffer(offerId, {
      latest_message_preview: messageBody,
      updated_at: now,
    });
    await repository.addNotification(
      buildNotification({
        id: `notif-${Date.now()}`,
        recipientId: getCounterpartyId(offer, user.id),
        offerId,
        type: 'message_received',
        message: 'A new negotiation message is waiting for your review.',
        now,
      }),
    );

    return NextResponse.json(createSuccessResponse({ message }, { source: 'repository' }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message === 'Offer not found' ? 404 : message === 'Unauthorized' ? 401 : 403;
    return NextResponse.json(createErrorResponse('ACCESS_DENIED', message), { status });
  }
}
