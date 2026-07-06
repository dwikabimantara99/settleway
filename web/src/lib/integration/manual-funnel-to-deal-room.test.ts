/**
 * Integration tests: Submit Offer → Negotiation → Deal Room funnel (Phase 3)
 *
 * These tests prove the full manual funnel in demo mode:
 *
 *   Submit Offer → offer persisted with redirect_to /offers/:id
 *   → Offer loaded from repository
 *   → Accept Terms (Seller) → offer.status = terms_accepted
 *   → Buyer opens Deal Room → offer.status = awaiting_counterparty_open
 *   → Seller opens Deal Room → deal created, offer.active_deal_id = deal-:offerId
 *   → /deals/[dealId] renders the created deal
 *   → Unknown deal still calls notFound()
 *
 * No live network, no Supabase, no browser required.
 * All state is stored in the in-memory MockStore (mock-store.ts).
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as nextHeaders from 'next/headers';

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('not-found');
  }),
  useRouter: vi.fn(() => ({ refresh: vi.fn() })),
}));

import { mockStore } from '@/lib/db/mock-store';
import { POST as createOfferRoute } from '../../app/api/offers/route';
import {
  PATCH as acceptOfferRoute,
} from '../../app/api/offers/[offerId]/route';
import { POST as openDealRoomRoute } from '../../app/api/offers/[offerId]/open-deal-room/route';
import { GET as getOfferRoute } from '../../app/api/offers/[offerId]/route';
import DealRoomPage from '../../app/deals/[dealId]/page';
import { renderToString } from 'react-dom/server';

vi.mock('@/lib/stellar/server/deal-room-testnet-runtime', async () => {
  const actual = await vi.importActual<typeof import('@/lib/stellar/server/deal-room-testnet-runtime')>(
    '@/lib/stellar/server/deal-room-testnet-runtime',
  );
  return {
    ...actual,
    resolveDealRoomDefaultStellarState: vi.fn(() => ({
      stellar_mode: 'mock_only',
      stellar_contract_id: null,
    })),
  };
});

describe('Submit Offer → Negotiation → Deal Room end-to-end funnel', () => {
  beforeEach(() => {
    mockStore.seed();
  });

  it('1. Submit Offer returns a stable offerId and a /offers/:id redirect_to', async () => {
    vi.mocked(nextHeaders.cookies).mockReturnValue({
      get: () => ({ value: 'buyer-surabaya-restaurant' }),
    } as any);

    const response = await createOfferRoute(
      new Request('http://localhost/api/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: 'listing-cabai-001',
          openingMessage: 'Can you ship this week?',
          volumeKg: 600,
          pricePerKgIdr: 28000,
          termsNote: 'Standard dispatch terms.',
        }),
      }),
    );

    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);

    // The returned redirect_to must be a stable /offers/:id URL
    const offerId: string = payload.data.offer.id;
    expect(offerId).toBeTruthy();
    expect(payload.data.redirect_to).toBe(`/offers/${offerId}`);

    // The offer is immediately resolvable from the repository (in-memory mockStore)
    const storedOffer = mockStore.offers.get(offerId);
    expect(storedOffer).toBeTruthy();
    expect(storedOffer!.buyer_id).toBe('buyer-surabaya-restaurant');
    expect(storedOffer!.listing_id).toBe('listing-cabai-001');
    // Offers submitted from a listing start as 'awaiting_counterparty_acceptance'
    // (seller must accept before the buyer's offer is terms_accepted)
    expect(storedOffer!.status).toBe('awaiting_counterparty_acceptance');
  });

  it('2. The created offer can be loaded after creation via GET /api/offers/:offerId', async () => {
    // First create an offer
    vi.mocked(nextHeaders.cookies).mockReturnValue({
      get: () => ({ value: 'buyer-surabaya-restaurant' }),
    } as any);

    const createResponse = await createOfferRoute(
      new Request('http://localhost/api/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: 'listing-cabai-001',
          openingMessage: 'I am interested.',
          volumeKg: 500,
          pricePerKgIdr: 27000,
        }),
      }),
    );
    const createPayload = await createResponse.json();
    const offerId: string = createPayload.data.offer.id;

    // Now load it
    const getResponse = await getOfferRoute(
      new Request(`http://localhost/api/offers/${offerId}`),
      { params: Promise.resolve({ offerId }) },
    );
    const getPayload = await getResponse.json();

    expect(getResponse.status).toBe(200);
    expect(getPayload.data.offer.id).toBe(offerId);
    expect(getPayload.data.offer.buyer_id).toBe('buyer-surabaya-restaurant');
  });

  it('3. Accept Terms / Seller Accepts creates a terms_accepted offer', async () => {
    const offerId = 'offer-funnel-accept';
    const now = new Date().toISOString();

    mockStore.offers.set(offerId, {
      id: offerId,
      listing_id: 'listing-cabai-001',
      buyer_request_id: null,
      buyer_id: 'buyer-surabaya-restaurant',
      seller_id: 'seller-probolinggo-cabai',
      initiated_by_id: 'buyer-surabaya-restaurant',
      commodity: "Red Chili (Bird's Eye Chili)",
      volume_kg: 600,
      price_per_kg_idr: 28000,
      principal_idr: 16800000,
      terms_note: 'I confirm same-week dispatch.',
      status: 'awaiting_counterparty_acceptance',
      latest_message_preview: 'Can we agree on these terms?',
      terms_submitted_at: now,
      terms_accepted_at: null,
      terms_accepted_by_id: null,
      buyer_open_room_at: null,
      seller_open_room_at: null,
      active_deal_id: null,
      created_at: now,
      updated_at: now,
    });

    vi.mocked(nextHeaders.cookies).mockReturnValue({
      get: () => ({ value: 'seller-probolinggo-cabai' }),
    } as any);

    const response = await acceptOfferRoute(
      new Request(`http://localhost/api/offers/${offerId}`, { method: 'PATCH' }),
      { params: Promise.resolve({ offerId }) },
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.offer.status).toBe('terms_accepted');
    expect(payload.data.offer.terms_accepted_by_id).toBe('seller-probolinggo-cabai');
    expect(mockStore.offers.get(offerId)?.status).toBe('terms_accepted');
  });

  it('4. Open Deal Room returns/creates a dealId that exists in repository', async () => {
    const offerId = 'offer-funnel-room-open';
    const now = new Date().toISOString();

    mockStore.offers.set(offerId, {
      id: offerId,
      listing_id: 'listing-cabai-001',
      buyer_request_id: null,
      buyer_id: 'buyer-surabaya-restaurant',
      seller_id: 'seller-probolinggo-cabai',
      initiated_by_id: 'buyer-surabaya-restaurant',
      commodity: "Red Chili (Bird's Eye Chili)",
      volume_kg: 700,
      price_per_kg_idr: 28500,
      principal_idr: 19950000,
      terms_note: 'Terms accepted.',
      status: 'terms_accepted',
      latest_message_preview: 'Opening thread',
      terms_submitted_at: now,
      terms_accepted_at: now,
      terms_accepted_by_id: 'seller-probolinggo-cabai',
      buyer_open_room_at: null,
      seller_open_room_at: null,
      active_deal_id: null,
      created_at: now,
      updated_at: now,
    });
    mockStore.offerMessages.set(offerId, []);

    // Buyer opens first
    vi.mocked(nextHeaders.cookies).mockReturnValue({
      get: () => ({ value: 'buyer-surabaya-restaurant' }),
    } as any);
    const buyerResponse = await openDealRoomRoute(
      new Request(`http://localhost/api/offers/${offerId}/open-deal-room`, { method: 'POST' }),
      { params: Promise.resolve({ offerId }) },
    );
    const buyerPayload = await buyerResponse.json();
    expect(buyerResponse.status).toBe(200);
    // Buyer alone has not yet created the deal
    expect(buyerPayload.data.deal_id).toBeNull();
    expect(buyerPayload.data.redirect_to).toBeNull();

    // Seller opens — both committed → deal is created
    vi.mocked(nextHeaders.cookies).mockReturnValue({
      get: () => ({ value: 'seller-probolinggo-cabai' }),
    } as any);
    const sellerResponse = await openDealRoomRoute(
      new Request(`http://localhost/api/offers/${offerId}/open-deal-room`, { method: 'POST' }),
      { params: Promise.resolve({ offerId }) },
    );
    const sellerPayload = await sellerResponse.json();
    expect(sellerResponse.status).toBe(200);

    // dealId must be a real ID that exists in the repository
    const dealId: string = sellerPayload.data.deal_id;
    expect(dealId).toBe(`deal-${offerId}`);
    expect(sellerPayload.data.redirect_to).toBe(`/deals/${dealId}`);

    // The deal must exist in the in-memory store
    const deal = mockStore.deals.get(dealId);
    expect(deal).toBeTruthy();
    expect(deal!.status).toBe('WAITING_DEPOSITS');
    expect(deal!.terms.offer_id).toBe(offerId);

    // The offer must now reference the deal
    expect(mockStore.offers.get(offerId)?.active_deal_id).toBe(dealId);
    expect(mockStore.offers.get(offerId)?.status).toBe('active_escrow');
  });

  it('5. /deals/[dealId] renders the created deal after Open Deal Room', async () => {
    const offerId = 'offer-funnel-render';
    const now = new Date().toISOString();

    mockStore.offers.set(offerId, {
      id: offerId,
      listing_id: 'listing-cabai-001',
      buyer_request_id: null,
      buyer_id: 'buyer-surabaya-restaurant',
      seller_id: 'seller-probolinggo-cabai',
      initiated_by_id: 'buyer-surabaya-restaurant',
      commodity: "Red Chili (Bird's Eye Chili)",
      volume_kg: 700,
      price_per_kg_idr: 28500,
      principal_idr: 19950000,
      terms_note: 'Terms accepted.',
      status: 'terms_accepted',
      latest_message_preview: 'Opening thread',
      terms_submitted_at: now,
      terms_accepted_at: now,
      terms_accepted_by_id: 'seller-probolinggo-cabai',
      buyer_open_room_at: now,
      seller_open_room_at: null,
      active_deal_id: null,
      created_at: now,
      updated_at: now,
    });
    mockStore.offerMessages.set(offerId, []);

    // Seller opens → deal created
    vi.mocked(nextHeaders.cookies).mockReturnValue({
      get: () => ({ value: 'seller-probolinggo-cabai' }),
    } as any);
    const sellerResponse = await openDealRoomRoute(
      new Request(`http://localhost/api/offers/${offerId}/open-deal-room`, { method: 'POST' }),
      { params: Promise.resolve({ offerId }) },
    );
    const sellerPayload = await sellerResponse.json();
    const dealId: string = sellerPayload.data.deal_id;

    // Now verify that the DealRoomPage renders this deal correctly
    const element = await DealRoomPage({ params: Promise.resolve({ dealId }) });
    const html = renderToString(element);
    expect(html).toContain("Red Chili");
    expect(html).toContain(dealId);
  });

  it('6. Unknown deal still calls notFound() — not blindly redirected', async () => {
    await expect(
      DealRoomPage({ params: Promise.resolve({ dealId: 'deal-does-not-exist-xyz' }) }),
    ).rejects.toThrow('not-found');
  });
});
