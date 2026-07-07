/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as nextHeaders from 'next/headers';
import { POST as buyerDepositPost } from '@/app/api/deals/[dealId]/buyer-deposit/route';
import { mockStore } from '@/lib/db/mock-store';
import { DbDeal } from '@/lib/db/types';
import path from 'path';

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

describe('Manual Deal Room Funding Gate Repair - Inner Failures', () => {
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
    (nextHeaders.cookies as any) = cookiesMock;
    
    process.env.NEXT_PUBLIC_RUNTIME_MODE = 'demo';
    
    // Inject required env vars to mock a fully 'configured' runtime
    process.env.TESTNET_RPC_URL = 'https://horizon-testnet.stellar.org';
    process.env.TESTNET_NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
    process.env.TESTNET_CONTRACT_ID = 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABXMQ';
    process.env.STELLAR_CLI_PATH = path.resolve('mock/stellar-cli');
    process.env.STELLAR_CONFIG_DIR = path.resolve('mock/config');
    process.env.STELLAR_NETWORK_ALIAS = 'testnet';
    process.env.ROLE_ADMIN_ALIAS = 'admin';
    process.env.ROLE_BUYER_DEMO_ALIAS = 'buyer';
    process.env.ROLE_SELLER_DEMO_ALIAS = 'seller';
    process.env.FEE_BASE_STROOPS = '100';
    process.env.FEE_MAX_STROOPS = '1000';
    process.env.TIMEBOUND_TIMEOUT_SECONDS = '30';
  });

  it('handles admin signer failure during escrow preparation without generic message', async () => {
    // We mock the child_process used by the CLI to throw or return error
    vi.mock('node:child_process', () => ({
       spawn: () => ({
           on: (evt: string, cb: any) => { if(evt === 'error') cb(new Error('ENOENT')); return this; },
           stdout: { on: () => {} },
           stderr: { on: () => {} },
       }),
       spawnSync: () => ({ error: new Error('ENOENT'), status: 1 })
    }));

    const req = new Request('http://localhost:3000/api/deals/' + testDealId + '/buyer-deposit', { method: 'POST' });
    const res = await buyerDepositPost(req, { params: Promise.resolve({ dealId: testDealId }) });
    const json = await res.json();
    
    expect(json.error?.code).not.toBe('STELLAR_EXECUTION_FAILED');
    expect(json.error?.message).not.toBe('The Stellar Testnet funding action could not be confirmed.');
    expect(['STELLAR_RUNTIME_UNAVAILABLE', 'ERR_SIGNER_UNAVAILABLE']).toContain(json.error?.code);
  });
});
