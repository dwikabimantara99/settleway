import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as nextHeaders from 'next/headers';
import { POST as buyerDepositPost } from '@/app/api/deals/[dealId]/buyer-deposit/route';
import { POST as sellerDepositPost } from '@/app/api/deals/[dealId]/seller-deposit/route';
import { mockStore } from '@/lib/db/mock-store';
import { DbDeal } from '@/lib/db/types';

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

describe('Manual Deal Room Funding Gate Repair - Double Click Generic Fallback', () => {
  let cookiesMock: ReturnType<typeof vi.fn>;
  let testDealId: string;

  beforeEach(() => {
    vi.resetAllMocks();
    mockStore.seed();

    testDealId = 'deal-demo-testnet';
    const deal: DbDeal = {
      id: testDealId,
      offer_id: 'offer-123',
      buyer_id: 'buyer-surabaya-restaurant',
      seller_id: 'seller-probolinggo-cabai',
      status: 'WAITING_DEPOSITS',
      commodity: 'Red Chili',
      variety: 'Grade A',
      volume_kg: 500,
      price_per_kg_idr: 40000,
      terms_note: 'Test deal',
      stellar_escrow_id: null,
      stellar_contract_id: null,
      latest_stellar_tx_hash: null,
      stellar_sync_status: 'idle',
      stellar_mode: 'testnet',
      stellar_network: 'testnet',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      proof_hash: null,
      proof_visibility: 'private',
      payout_rail_preference: 'stellar',
      payout_wallet_label: null,
      payout_wallet_address: null,
      connected_wallet_address: null,
      connected_wallet_network: null,
      connected_wallet_provider: null,
      connected_wallet_linked_at: null,
      payout_bank_name: null,
      payout_bank_account_masked: null,
    };
    mockStore.deals.set(deal.id, deal);

    cookiesMock = vi.fn(() => ({
      get: (name: string) => {
        if (name === 'mock_actor') return { value: 'buyer-surabaya-restaurant' };
        return undefined;
      },
    }));
    (nextHeaders as any).cookies = cookiesMock;

    process.env.NEXT_PUBLIC_RUNTIME_MODE = 'demo';
  });

  it('buyer-deposit double click known demo runtime failure returns specific error.message', async () => {
    // Attempt 1: Ensure it fails and stores 'failed' status in DB
    const req1 = new Request('http://localhost:3000/api/deals/' + testDealId + '/buyer-deposit', { method: 'POST' });
    const res1 = await buyerDepositPost(req1, { params: Promise.resolve({ dealId: testDealId }) });
    const json1 = await res1.json();

    expect(json1.error?.message).not.toBe('The Stellar Testnet funding action could not be confirmed.');
    expect(['Profile Wallet was found, but this demo wallet cannot sign funding transactions. No deposit was made.', 'Buyer funding is configured for Stellar Testnet, but the local runtime is not ready.']).toContain(json1.error?.message);

    // Attempt 2: Ensure the second click also returns the same specific message, NOT the generic message
    const req2 = new Request('http://localhost:3000/api/deals/' + testDealId + '/buyer-deposit', { method: 'POST' });
    const res2 = await buyerDepositPost(req2, { params: Promise.resolve({ dealId: testDealId }) });
    const json2 = await res2.json();

    expect(json2.error?.message).not.toBe('The Stellar Testnet funding action could not be confirmed.');
    expect(json2.error?.message).toBe(json1.error?.message); // Should be identically descriptive
  });

  it('seller-deposit double click known demo runtime failure returns specific error.message', async () => {
    cookiesMock.mockImplementation(() => ({
      get: (name: string) => {
        if (name === 'mock_actor') return { value: 'seller-probolinggo-cabai' };
        return undefined;
      },
    }));
    // Attempt 1
    const req1 = new Request('http://localhost:3000/api/deals/' + testDealId + '/seller-deposit', { method: 'POST' });
    const res1 = await sellerDepositPost(req1, { params: Promise.resolve({ dealId: testDealId }) });
    const json1 = await res1.json();

    expect(json1.error?.message).not.toBe('The Stellar Testnet funding action could not be confirmed.');

    // Attempt 2
    const req2 = new Request('http://localhost:3000/api/deals/' + testDealId + '/seller-deposit', { method: 'POST' });
    const res2 = await sellerDepositPost(req2, { params: Promise.resolve({ dealId: testDealId }) });
    const json2 = await res2.json();

    expect(json2.error?.message).not.toBe('The Stellar Testnet funding action could not be confirmed.');
    expect(json2.error?.message).toBe(json1.error?.message); // Should be identically descriptive
  });
});
