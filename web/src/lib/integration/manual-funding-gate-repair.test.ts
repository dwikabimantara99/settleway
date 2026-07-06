/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as nextHeaders from 'next/headers';
import { POST as buyerDepositPost } from '@/app/api/deals/[dealId]/buyer-deposit/route';
import { POST as sellerDepositPost } from '@/app/api/deals/[dealId]/seller-deposit/route';
import { mockStore } from '@/lib/db/mock-store';
import { DbDeal } from '@/lib/db/types';

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

describe('Manual Deal Room Funding Gate Repair', () => {
  let cookiesMock: ReturnType<typeof vi.fn>;
  let testDealId: string;

  beforeEach(() => {
    vi.resetAllMocks();
    mockStore.seed(); // fresh database

    testDealId = 'deal-demo-123';
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
    (nextHeaders.cookies as any) = cookiesMock;
    
    process.env.NEXT_PUBLIC_RUNTIME_MODE = 'demo';
  });

  it('1. Demo Buyer has a Profile Wallet recognized by the same wallet source used by funding', async () => {
    const req = new Request('http://localhost:3000/api/deals/' + testDealId + '/buyer-deposit', {
      method: 'POST',
    });
    const res = await buyerDepositPost(req, { params: Promise.resolve({ dealId: testDealId }) });
    const json = await res.json();
    
    expect(json.error?.message).not.toBe('You must create a Profile Wallet before funding this deal.');
    // In CI test mode without network, checking balance fails or runtime unavailable fails, which proves we passed the wallet check!
    const expectedCodes = ['PROFILE_WALLET_BALANCE_UNAVAILABLE', 'STELLAR_RUNTIME_UNAVAILABLE', 'ERR_SIGNER_REJECTED']; expect(expectedCodes).toContain(json.error?.code); if (json.error?.code === 'ERR_SIGNER_REJECTED') { expect(json.error?.message).toBe('Profile Wallet was found, but this demo wallet cannot sign funding transactions. No deposit was made.'); } if (json.error?.code === 'STELLAR_RUNTIME_UNAVAILABLE') { expect(json.error?.message).toMatch(/runtime is not (ready|configured)/); }
  });

  it('2. Demo Seller has a Profile Wallet recognized by the same wallet source used by funding', async () => {
    cookiesMock.mockImplementation(() => ({
      get: (name: string) => (name === 'mock_actor' ? { value: 'seller-probolinggo-cabai' } : undefined),
    }));
    const req = new Request('http://localhost:3000/api/deals/' + testDealId + '/seller-deposit', {
      method: 'POST',
    });
    const res = await sellerDepositPost(req, { params: Promise.resolve({ dealId: testDealId }) });
    const json = await res.json();
    
    expect(json.error?.message).not.toBe('You must create a Profile Wallet before funding this deal.');
    const expectedCodes = ['PROFILE_WALLET_BALANCE_UNAVAILABLE', 'STELLAR_RUNTIME_UNAVAILABLE', 'ERR_SIGNER_REJECTED']; expect(expectedCodes).toContain(json.error?.code); if (json.error?.code === 'ERR_SIGNER_REJECTED') { expect(json.error?.message).toBe('Profile Wallet was found, but this demo wallet cannot sign funding transactions. No deposit was made.'); } if (json.error?.code === 'STELLAR_RUNTIME_UNAVAILABLE') { expect(json.error?.message).toMatch(/runtime is not (ready|configured)/); }
  });

  it('3. Wrong role or unknown user is still blocked', async () => {
    const req = new Request('http://localhost:3000/api/deals/' + testDealId + '/seller-deposit', {
      method: 'POST',
    });
    const res = await sellerDepositPost(req, { params: Promise.resolve({ dealId: testDealId }) });
    const json = await res.json();
    
    expect(res.status).toBe(403);
    expect(json.error?.message).toBe('Only seller can perform this action');
  });

  it('4. Persistent/non-demo missing wallet is still blocked', async () => {
    const deal = mockStore.deals.get(testDealId)!;
    deal.buyer_id = 'unknown-user-id';
    mockStore.deals.set(testDealId, deal);
    
    cookiesMock.mockImplementation(() => ({
      get: (name: string) => (name === 'mock_actor' ? { value: 'unknown-user-id' } : undefined),
    }));
    
    const req = new Request('http://localhost:3000/api/deals/' + testDealId + '/buyer-deposit', {
      method: 'POST',
    });
    
    const res = await buyerDepositPost(req, { params: Promise.resolve({ dealId: testDealId }) });
    const json = await res.json();
    
    // In our test, if it's unknown user, the demo fallback won't give them a wallet!
    expect(res.status).toBe(400);
    expect(json.error?.message).toBe('You must create a Profile Wallet before funding this deal.');
  });
});
