import { describe, it, expect, beforeEach } from 'vitest';
import { MockRepositoryAdapter } from './mock-adapter';
import { mockStore } from '../db/mock-store';
import type { DbDeal } from '../db/types';

describe('MockRepositoryAdapter Contract Tests', () => {
  let repo: MockRepositoryAdapter;

  beforeEach(() => {
    mockStore.seed();
    repo = new MockRepositoryAdapter();
  });

  it('retrieves seeded profiles', async () => {
    const profile = await repo.getProfile('buyer-surabaya-restaurant');
    expect(profile).not.toBeNull();
    expect(profile?.display_name).toBe('Surabaya Spice Co.');
  });

  it('retrieves listings', async () => {
    const listings = await repo.getListings();
    expect(listings.length).toBeGreaterThan(0);
  });

  it('can create and retrieve a deal', async () => {
    const newDeal: DbDeal = {
      id: 'test-deal-123',
      listing_id: null,
      buyer_request_id: null,
      buyer_id: 'buyer-surabaya-restaurant',
      seller_id: 'seller-probolinggo-cabai',
      commodity: 'Cabai Merah',
      volume_kg: 100,
      principal_idr: 1000,
      buyer_bond_idr: 50,
      seller_bond_idr: 50,
      buyer_fee_idr: 5,
      seller_fee_idr: 5,
      buyer_total_idr: 1055,
      seller_total_idr: 45,
      status: 'WAITING_DEPOSITS',
      stellar_mode: 'mock_only',
      stellar_contract_id: null,
      stellar_escrow_id: null,
      latest_stellar_tx_hash: null,
      stellar_sync_status: 'idle',
      proof_hash: null,
      terms: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await repo.createDeal(newDeal);
    const retrieved = await repo.getDeal('test-deal-123');
    expect(retrieved?.id).toBe('test-deal-123');
    expect(retrieved?.status).toBe('WAITING_DEPOSITS');
  });

  it('replaces a deal if current (CAS)', async () => {
    const deal = await repo.getDeal('demo-cabai-001');
    expect(deal).toBeDefined();

    const nextDeal = { ...deal!, status: 'BUYER_FUNDED' as const, updated_at: new Date().toISOString() };
    const { replaced, deal: updated } = await repo.replaceDealIfCurrent({ current: deal!, next: nextDeal });
    
    expect(replaced).toBe(true);
    expect(updated?.status).toBe('BUYER_FUNDED');
  });

  it('fails to replace a deal if current state does not match', async () => {
    const deal = await repo.getDeal('demo-cabai-001');
    expect(deal).toBeDefined();

    const nextDeal = { ...deal!, status: 'BUYER_FUNDED' as const, updated_at: new Date().toISOString() };
    
    // Simulate someone else changing it
    await repo.updateDeal('demo-cabai-001', { status: 'SELLER_FUNDED' });

    const { replaced } = await repo.replaceDealIfCurrent({ current: deal!, next: nextDeal });
    
    expect(replaced).toBe(false);
  });
});
