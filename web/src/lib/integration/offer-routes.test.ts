/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as nextHeaders from 'next/headers';
import { Networks, StrKey } from '@stellar/stellar-sdk';

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

import { mockStore } from '../db/mock-store';
import { POST as createOfferRoute } from '../../app/api/offers/route';
import {
  PATCH as acceptOfferRoute,
  POST as openDealRoomParentRoute,
} from '../../app/api/offers/[offerId]/route';
import { POST as addOfferMessageRoute } from '../../app/api/offers/[offerId]/messages/route';
import { POST as openDealRoomRoute } from '../../app/api/offers/[offerId]/open-deal-room/route';

vi.mock('../stellar/server/deal-room-testnet-runtime', async () => {
  const actual = await vi.importActual<typeof import('../stellar/server/deal-room-testnet-runtime')>(
    '../stellar/server/deal-room-testnet-runtime',
  );
  return {
    ...actual,
    resolveDealRoomDefaultStellarState: vi.fn(() => ({
      stellar_mode: 'mock_only',
      stellar_contract_id: null,
    })),
  };
});

import { resolveDealRoomDefaultStellarState } from '../stellar/server/deal-room-testnet-runtime';

const custodyContractId = StrKey.encodeContract(Buffer.alloc(32, 31));
const custodyAssetContractId = StrKey.encodeContract(Buffer.alloc(32, 32));
const buyerWalletAddress = StrKey.encodeEd25519PublicKey(Buffer.alloc(32, 33));
const sellerWalletAddress = StrKey.encodeEd25519PublicKey(Buffer.alloc(32, 34));
const mediatorWalletAddress = StrKey.encodeEd25519PublicKey(Buffer.alloc(32, 35));

function enableCustodyV2Config() {
  vi.stubEnv('NEXT_PUBLIC_CUSTODY_V2_ENABLED', 'true');
  vi.stubEnv('NEXT_PUBLIC_CUSTODY_V2_NETWORK_PASSPHRASE', Networks.TESTNET);
  vi.stubEnv('NEXT_PUBLIC_CUSTODY_V2_CONTRACT_ID', custodyContractId);
  vi.stubEnv('NEXT_PUBLIC_CUSTODY_V2_ASSET_CONTRACT_ID', custodyAssetContractId);
  vi.stubEnv('NEXT_PUBLIC_CUSTODY_V2_MEDIATOR_ADDRESS', mediatorWalletAddress);
  vi.stubEnv('NEXT_PUBLIC_CUSTODY_V2_INTERFACE_VERSION', '2');
  vi.stubEnv('NEXT_PUBLIC_CUSTODY_V2_POLICY_VERSION', '2');
}

function bindParticipantWallets() {
  mockStore.updateProfile('buyer-surabaya-restaurant', {
    connected_wallet_address: buyerWalletAddress,
    connected_wallet_network: 'testnet',
    connected_wallet_provider: 'Freighter',
    connected_wallet_linked_at: '2026-06-27T00:00:00.000Z',
  });
  mockStore.updateProfile('seller-probolinggo-cabai', {
    connected_wallet_address: sellerWalletAddress,
    connected_wallet_network: 'testnet',
    connected_wallet_provider: 'Freighter',
    connected_wallet_linked_at: '2026-06-27T00:00:00.000Z',
  });
}

describe('Phase B offer routes', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    mockStore.seed();
    vi.mocked(resolveDealRoomDefaultStellarState).mockReturnValue({
      stellar_mode: 'mock_only',
      stellar_contract_id: null,
    });
  });

  it('creates an offer from a marketplace listing and notifies the seller', async () => {
    vi.mocked(nextHeaders.cookies).mockReturnValue({ get: () => ({ value: 'buyer-surabaya-restaurant' }) } as any);

    const request = new Request('http://localhost/api/offers', {
      method: 'POST',
      body: JSON.stringify({
        listingId: 'listing-cabai-001',
        openingMessage: 'Ready to negotiate for this week delivery.',
        volumeKg: 650,
        pricePerKgIdr: 28000,
        termsNote: 'Pickup after escrow lock and same-week proof submission.',
      }),
    });

    const response = await createOfferRoute(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.offer.buyer_id).toBe('buyer-surabaya-restaurant');
    expect(payload.data.offer.seller_id).toBe('seller-probolinggo-cabai');
    expect(payload.data.offer.status).toBe('awaiting_counterparty_acceptance');
    expect(payload.data.offer.volume_kg).toBe(650);
    expect(payload.data.offer.price_per_kg_idr).toBe(28000);
    expect(payload.data.offer.terms_note).toBe(
      'Pickup after escrow lock and same-week proof submission.',
    );
    expect(mockStore.getNotifications('seller-probolinggo-cabai')).toHaveLength(1);
    expect(mockStore.getOfferMessages(payload.data.offer.id)).toHaveLength(1);
  });

  it('persists the shared pre-deal draft thread when the offer is finally submitted', async () => {
    vi.mocked(nextHeaders.cookies).mockReturnValue({ get: () => ({ value: 'buyer-surabaya-restaurant' }) } as any);

    const request = new Request('http://localhost/api/offers', {
      method: 'POST',
      body: JSON.stringify({
        listingId: 'listing-cabai-001',
        draftMessages: [
          {
            authorId: 'buyer-surabaya-restaurant',
            body: 'We only need 500 kg for this cycle.',
            createdAt: '2026-06-17T11:35:00.000Z',
          },
          {
            authorId: 'seller-probolinggo-cabai',
            body: 'Confirmed. We can hold 500 kg at the proposed quality.',
            createdAt: '2026-06-17T11:36:00.000Z',
          },
        ],
        volumeKg: 500,
        pricePerKgIdr: 28500,
        termsNote: 'Delivery proof follows harvest packing.',
      }),
    });

    const response = await createOfferRoute(request);
    const payload = await response.json();
    const persistedMessages = mockStore.getOfferMessages(payload.data.offer.id);

    expect(response.status).toBe(200);
    expect(payload.data.offer.latest_message_preview).toBe(
      'Confirmed. We can hold 500 kg at the proposed quality.',
    );
    expect(persistedMessages).toHaveLength(2);
    expect(persistedMessages[0]?.author_id).toBe('buyer-surabaya-restaurant');
    expect(persistedMessages[0]?.body).toBe('We only need 500 kg for this cycle.');
    expect(persistedMessages[1]?.author_id).toBe('seller-probolinggo-cabai');
    expect(persistedMessages[1]?.body).toBe(
      'Confirmed. We can hold 500 kg at the proposed quality.',
    );
  });

  it('records negotiation messages against an existing offer', async () => {
    const offerId = 'offer-msg-1';
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
      terms_note: 'Initial terms note',
      status: 'negotiating',
      latest_message_preview: null,
      terms_submitted_at: new Date().toISOString(),
      terms_accepted_at: null,
      terms_accepted_by_id: null,
      buyer_open_room_at: null,
      seller_open_room_at: null,
      active_deal_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    mockStore.offerMessages.set(offerId, []);

    vi.mocked(nextHeaders.cookies).mockReturnValue({ get: () => ({ value: 'seller-probolinggo-cabai' }) } as any);
    const request = new Request(`http://localhost/api/offers/${offerId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body: 'We can meet the requested quality and timing.' }),
    });

    const response = await addOfferMessageRoute(request, { params: Promise.resolve({ offerId }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.message.author_id).toBe('seller-probolinggo-cabai');
    expect(mockStore.getOfferMessages(offerId)).toHaveLength(1);
  });

  it('accepts submitted deal terms before Open Deal Room can begin', async () => {
    const offerId = 'offer-accept-1';
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
      price_per_kg_idr: 29000,
      principal_idr: 17400000,
      terms_note: 'Seller confirms same-week dispatch.',
      status: 'awaiting_counterparty_acceptance',
      latest_message_preview: 'Please review the revised terms.',
      terms_submitted_at: now,
      terms_accepted_at: null,
      terms_accepted_by_id: null,
      buyer_open_room_at: null,
      seller_open_room_at: null,
      active_deal_id: null,
      created_at: now,
      updated_at: now,
    });

    vi.mocked(nextHeaders.cookies).mockReturnValue({ get: () => ({ value: 'seller-probolinggo-cabai' }) } as any);
    const response = await acceptOfferRoute(new Request(`http://localhost/api/offers/${offerId}`, { method: 'PATCH' }), {
      params: Promise.resolve({ offerId }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.offer.status).toBe('terms_accepted');
    expect(payload.data.offer.terms_accepted_by_id).toBe('seller-probolinggo-cabai');
  });

  it('creates an explicit Custody V2 deal only after both parties open the Deal Room', async () => {
    enableCustodyV2Config();
    bindParticipantWallets();
    const offerId = 'offer-open-1';
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
      terms_note: 'Terms already accepted.',
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

    vi.mocked(nextHeaders.cookies).mockReturnValue({ get: () => ({ value: 'buyer-surabaya-restaurant' }) } as any);
    const buyerResponse = await openDealRoomRoute(new Request(`http://localhost/api/offers/${offerId}/open-deal-room`, { method: 'POST' }), {
      params: Promise.resolve({ offerId }),
    });
    const buyerPayload = await buyerResponse.json();

    expect(buyerResponse.status).toBe(200);
    expect(buyerPayload.data.deal_id).toBeNull();
    expect(mockStore.offers.get(offerId)?.status).toBe('awaiting_counterparty_open');

    vi.mocked(nextHeaders.cookies).mockReturnValue({ get: () => ({ value: 'seller-probolinggo-cabai' }) } as any);
    const sellerResponse = await openDealRoomRoute(new Request(`http://localhost/api/offers/${offerId}/open-deal-room`, { method: 'POST' }), {
      params: Promise.resolve({ offerId }),
    });
    const sellerPayload = await sellerResponse.json();

    expect(sellerResponse.status).toBe(200);
    expect(sellerPayload.data.deal_id).toBe(`deal-${offerId}`);
    const activeDeal = mockStore.deals.get(`deal-${offerId}`);
    expect(activeDeal?.status).toBe('WAITING_DEPOSITS');
    expect(activeDeal?.rail_version).toBe('custody_v2_testnet');
    expect(activeDeal?.terms.activation_source).toBe('mutual_open_deal_room');
    expect(activeDeal?.terms.offer_id).toBe(offerId);
    expect(activeDeal?.terms.deposit_window_hours).toBe(24);
    expect(typeof activeDeal?.terms.deposit_deadline_at).toBe('string');
    expect(typeof activeDeal?.terms.activated_at).toBe('string');
    expect(activeDeal?.stellar_mode).toBe('testnet');
    expect(activeDeal?.stellar_contract_id).toBe(custodyContractId);
    expect(mockStore.offers.get(offerId)?.active_deal_id).toBe(`deal-${offerId}`);
    const custodyLink = mockStore.getCustodyDealLink(`deal-${offerId}`);
    expect(custodyLink).toMatchObject({
      rail_version: 'custody_v2_testnet',
      buyer_address: buyerWalletAddress,
      seller_address: sellerWalletAddress,
      asset_contract_id: custodyAssetContractId,
      settlement_asset_label: 'XLM',
      latest_contract_state: 'TermsPending',
    });
  });

  it('supports Open Deal Room through the parent offer POST route for UI stability', async () => {
    enableCustodyV2Config();
    bindParticipantWallets();
    const offerId = 'offer-open-parent-1';
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
      terms_note: 'Terms already accepted.',
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

    vi.mocked(nextHeaders.cookies).mockReturnValue({ get: () => ({ value: 'buyer-surabaya-restaurant' }) } as any);
    const buyerResponse = await openDealRoomParentRoute(
      new Request(`http://localhost/api/offers/${offerId}`, { method: 'POST' }),
      {
        params: Promise.resolve({ offerId }),
      },
    );
    const buyerPayload = await buyerResponse.json();

    expect(buyerResponse.status).toBe(200);
    expect(buyerPayload.data.deal_id).toBeNull();
    expect(mockStore.offers.get(offerId)?.status).toBe('awaiting_counterparty_open');

    vi.mocked(nextHeaders.cookies).mockReturnValue({ get: () => ({ value: 'seller-probolinggo-cabai' }) } as any);
    const sellerResponse = await openDealRoomParentRoute(
      new Request(`http://localhost/api/offers/${offerId}`, { method: 'POST' }),
      {
        params: Promise.resolve({ offerId }),
      },
    );
    const sellerPayload = await sellerResponse.json();

    expect(sellerResponse.status).toBe(200);
    expect(sellerPayload.data.deal_id).toBe(`deal-${offerId}`);
    expect(mockStore.offers.get(offerId)?.active_deal_id).toBe(`deal-${offerId}`);
  });

  it('blocks Custody V2 Deal Room creation until both participant wallets are bound', async () => {
    enableCustodyV2Config();
    const offerId = 'offer-open-wallet-required-1';
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
      terms_note: 'Terms already accepted.',
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

    vi.mocked(nextHeaders.cookies).mockReturnValue({ get: () => ({ value: 'seller-probolinggo-cabai' }) } as any);
    const sellerResponse = await openDealRoomRoute(new Request(`http://localhost/api/offers/${offerId}/open-deal-room`, { method: 'POST' }), {
      params: Promise.resolve({ offerId }),
    });
    const sellerPayload = await sellerResponse.json();

    expect(sellerResponse.status).toBe(409);
    expect(sellerPayload.error.code).toBe('WALLET_BINDING_REQUIRED');
    expect(mockStore.deals.get(`deal-${offerId}`)).toBeUndefined();
    expect(mockStore.getCustodyDealLink(`deal-${offerId}`)).toBeNull();
  });
});
