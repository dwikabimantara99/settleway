import { NextResponse } from 'next/server';
import { createErrorResponse, createSuccessResponse } from '@/lib/api/validation';
import { requireAuth } from '@/lib/auth/server';
import { repository } from '@/lib/repositories';
import {
  buildNotification,
  buildOfferFromBuyerRequest,
  buildOfferFromListing,
  buildOpeningMessage,
} from '@/lib/offers/helpers';

export async function GET() {
  try {
    const user = await requireAuth();
    const offers = await repository.listOffersForParticipant(user.id);
    return NextResponse.json(createSuccessResponse(offers, { source: 'repository' }));
  } catch (error) {
    return NextResponse.json(
      createErrorResponse('UNAUTHORIZED', error instanceof Error ? error.message : String(error)),
      { status: 401 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { listingId, buyerRequestId, openingMessage, draftMessages, volumeKg, pricePerKgIdr, termsNote, isDemo, runId, role } = body as {
      listingId?: string;
      buyerRequestId?: string;
      openingMessage?: string;
      draftMessages?: Array<{
        authorId?: string;
        body?: string;
        createdAt?: string;
      }>;
      volumeKg?: number;
      pricePerKgIdr?: number;
      termsNote?: string;
      isDemo?: boolean;
      runId?: string;
      role?: string;
    };

    if ((!listingId && !buyerRequestId) || (listingId && buyerRequestId)) {
      return NextResponse.json(
        createErrorResponse('INVALID_INPUT', 'Provide exactly one source: listingId or buyerRequestId.'),
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const trimmedOpeningMessage = openingMessage?.trim() || null;
    const trimmedTermsNote = termsNote?.trim() || null;
    const offerId = isDemo && runId ? `offer-live-cabai-${runId}` : `offer-${Date.now()}`;
    const normalizedDraftMessages = Array.isArray(draftMessages)
      ? draftMessages
          .map((message) => ({
            authorId: message.authorId?.trim() || '',
            body: message.body?.trim() || '',
            createdAt: message.createdAt?.trim() || now,
          }))
          .filter((message) => message.authorId.length > 0 && message.body.length > 0)
      : [];

    if (listingId) {
      const listing = await repository.getListing(listingId);
      if (!listing) {
        return NextResponse.json(createErrorResponse('NOT_FOUND', 'Listing not found.'), { status: 404 });
      }
      if (listing.seller_id === user.id) {
        return NextResponse.json(
          createErrorResponse('INVALID_ACTOR', 'Seller cannot submit an offer to their own listing.'),
          { status: 400 },
        );
      }
      const resolvedVolumeKg = Number.isFinite(volumeKg)
        ? Math.round(Number(volumeKg))
        : Number(listing.estimated_volume_kg ?? 0);
      const resolvedPricePerKgIdr = Number.isFinite(pricePerKgIdr)
        ? Math.round(Number(pricePerKgIdr))
        : Number(listing.price_per_kg_idr ?? 0);
      if (resolvedVolumeKg <= 0 || resolvedPricePerKgIdr <= 0) {
        return NextResponse.json(
          createErrorResponse('INVALID_INPUT', 'Volume and price must both be greater than zero.'),
          { status: 400 },
        );
      }
      const allowedAuthorIds = new Set([user.id, listing.seller_id]);
      const persistedDraftMessages = normalizedDraftMessages.filter((message) =>
        allowedAuthorIds.has(message.authorId),
      );
      const latestDraftMessageBody =
        persistedDraftMessages.at(-1)?.body ?? trimmedOpeningMessage;

      const offer = buildOfferFromListing({
        id: offerId,
        listing,
        buyerId: user.id,
        openingMessage: latestDraftMessageBody,
        volumeKg: resolvedVolumeKg,
        pricePerKgIdr: resolvedPricePerKgIdr,
        termsNote: trimmedTermsNote,
        now,
      });

      if (isDemo && runId) {
        const { insertDemoOffer, insertDemoNotification } = await import('@/lib/offers/demo-service');
        await insertDemoOffer(offer);
        await insertDemoNotification(
          buildNotification({
            id: `notif-live-cabai-${runId}`,
            recipientId: offer.seller_id,
            offerId,
            type: 'offer_received',
            message: 'A buyer sent an offer and opened a negotiation thread.',
            now,
          }),
        );
        return NextResponse.json(
          createSuccessResponse({ offer, redirect_to: `/offers/${offer.id}?demo=1&role=${role || 'buyer'}&runId=${runId}&stage=open` }, { source: 'repository' }),
        );
      }

      await repository.createOffer(offer);

      if (persistedDraftMessages.length > 0) {
        const messageIdBase = Date.now();
        for (const [index, message] of persistedDraftMessages.entries()) {
          await repository.addOfferMessage(
            buildOpeningMessage({
              id: `msg-${messageIdBase}-${index}`,
              offerId,
              authorId: message.authorId,
              body: message.body,
              now: message.createdAt,
            }),
          );
        }
      } else if (trimmedOpeningMessage) {
        await repository.addOfferMessage(
          buildOpeningMessage({
            id: `msg-${Date.now()}`,
            offerId,
            authorId: user.id,
            body: trimmedOpeningMessage,
            now,
          }),
        );
      }

      await repository.addNotification(
        buildNotification({
          id: `notif-${Date.now()}`,
          recipientId: offer.seller_id,
          offerId,
          type: 'offer_received',
          message: 'A buyer sent an offer and opened a negotiation thread.',
          now,
        }),
      );

      return NextResponse.json(
        createSuccessResponse({ offer, redirect_to: `/offers/${offer.id}` }, { source: 'repository' }),
      );
    }

    const buyerRequest = await repository.getBuyerRequest(buyerRequestId!);
    if (!buyerRequest) {
      return NextResponse.json(createErrorResponse('NOT_FOUND', 'Buyer request not found.'), { status: 404 });
    }
    if (buyerRequest.buyer_id === user.id) {
      return NextResponse.json(
        createErrorResponse('INVALID_ACTOR', 'Buyer cannot submit supply to their own request.'),
        { status: 400 },
      );
    }
    const resolvedVolumeKg = Number.isFinite(volumeKg)
      ? Math.round(Number(volumeKg))
      : Number(buyerRequest.required_volume_kg ?? 0);
    const resolvedPricePerKgIdr = Number.isFinite(pricePerKgIdr)
      ? Math.round(Number(pricePerKgIdr))
      : Number(buyerRequest.target_price_per_kg_idr ?? 0);
    if (resolvedVolumeKg <= 0 || resolvedPricePerKgIdr <= 0) {
      return NextResponse.json(
        createErrorResponse('INVALID_INPUT', 'Volume and price must both be greater than zero.'),
        { status: 400 },
      );
    }
    const allowedAuthorIds = new Set([user.id, buyerRequest.buyer_id]);
    const persistedDraftMessages = normalizedDraftMessages.filter((message) =>
      allowedAuthorIds.has(message.authorId),
    );
    const latestDraftMessageBody = persistedDraftMessages.at(-1)?.body ?? trimmedOpeningMessage;

    const offer = buildOfferFromBuyerRequest({
      id: offerId,
      buyerRequest,
      sellerId: user.id,
      openingMessage: latestDraftMessageBody,
      volumeKg: resolvedVolumeKg,
      pricePerKgIdr: resolvedPricePerKgIdr,
      termsNote: trimmedTermsNote,
      now,
    });
    const privRepository = (await import('@/lib/repositories/server-repository')).createPrivilegedServerRepository();

    await privRepository.createOffer(offer);

    if (persistedDraftMessages.length > 0) {
      const messageIdBase = Date.now();
      for (const [index, message] of persistedDraftMessages.entries()) {
        await privRepository.addOfferMessage(
          buildOpeningMessage({
            id: `msg-${messageIdBase}-${index}`,
            offerId,
            authorId: message.authorId,
            body: message.body,
            now: message.createdAt,
          }),
        );
      }
    } else if (trimmedOpeningMessage) {
      await privRepository.addOfferMessage(
        buildOpeningMessage({
          id: `msg-${Date.now()}`,
          offerId,
          authorId: user.id,
          body: trimmedOpeningMessage,
          now,
        }),
      );
    }

    await privRepository.addNotification(
      buildNotification({
        id: `notif-${Date.now()}`,
        recipientId: offer.buyer_id,
        offerId,
        type: 'offer_received',
        message: 'A seller responded to your request and opened a negotiation thread.',
        now,
      }),
    );

    return NextResponse.json(
      createSuccessResponse({ offer, redirect_to: `/offers/${offer.id}` }, { source: 'repository' }),
    );
  } catch (error) {
    console.error('API /offers POST Error:', error);
    return NextResponse.json(
      createErrorResponse('INTERNAL_ERROR', error instanceof Error ? error.message : JSON.stringify(error)),
      { status: 500 },
    );
  }
}
