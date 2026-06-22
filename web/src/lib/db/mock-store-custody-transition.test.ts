import { describe, expect, it } from 'vitest';
import { MockStore } from './mock-store';
import type { DbDeal } from './types';
import type { DealStatus } from '../escrow/state-machine';

function makeDeal(status: DealStatus): DbDeal {
  return {
    id: `deal-${status.toLowerCase()}`,
    listing_id: 'listing-1',
    buyer_request_id: null,
    buyer_id: 'buyer-1',
    seller_id: 'seller-1',
    commodity: 'Red Chili',
    volume_kg: 700,
    principal_idr: 19950000,
    buyer_bond_idr: 997500,
    seller_bond_idr: 997500,
    buyer_fee_idr: 99750,
    seller_fee_idr: 99750,
    buyer_total_idr: 21047250,
    seller_total_idr: 1097250,
    status,
    stellar_mode: 'testnet',
    stellar_contract_id: null,
    stellar_escrow_id: null,
    latest_stellar_tx_hash: null,
    stellar_sync_status: 'idle',
    proof_hash: null,
    terms: {},
    created_at: '2026-06-21T00:00:00.000Z',
    updated_at: '2026-06-21T00:00:00.000Z',
  };
}

describe('MockStore custody-pending deal transitions', () => {
  it('allows seller funding to move a buyer-funded deal into custody pending', () => {
    const store = new MockStore();
    const current = makeDeal('BUYER_FUNDED');
    const next = {
      ...current,
      status: 'CUSTODY_PENDING' as const,
      latest_stellar_tx_hash: 'seller-funding-tx',
      stellar_sync_status: 'pending' as const,
      updated_at: '2026-06-21T00:01:00.000Z',
    };

    store.deals.set(current.id, current);

    const result = store.replaceDealIfCurrent({ current, next });

    expect(result.replaced).toBe(true);
    expect(result.deal?.status).toBe('CUSTODY_PENDING');
    expect(store.deals.get(current.id)?.latest_stellar_tx_hash).toBe('seller-funding-tx');
  });

  it('allows buyer funding to move a seller-funded deal into custody pending', () => {
    const store = new MockStore();
    const current = makeDeal('SELLER_FUNDED');
    const next = {
      ...current,
      status: 'CUSTODY_PENDING' as const,
      latest_stellar_tx_hash: 'buyer-funding-tx',
      stellar_sync_status: 'pending' as const,
      updated_at: '2026-06-21T00:01:00.000Z',
    };

    store.deals.set(current.id, current);

    const result = store.replaceDealIfCurrent({ current, next });

    expect(result.replaced).toBe(true);
    expect(result.deal?.status).toBe('CUSTODY_PENDING');
    expect(store.deals.get(current.id)?.latest_stellar_tx_hash).toBe('buyer-funding-tx');
  });

  it('allows custody sweep completion to move custody pending into locked', () => {
    const store = new MockStore();
    const current = makeDeal('CUSTODY_PENDING');
    const next = {
      ...current,
      status: 'LOCKED' as const,
      latest_stellar_tx_hash: 'custody-sweep-tx',
      stellar_sync_status: 'idle' as const,
      updated_at: '2026-06-21T00:02:00.000Z',
    };

    store.deals.set(current.id, current);

    const result = store.replaceDealIfCurrent({ current, next });

    expect(result.replaced).toBe(true);
    expect(result.deal?.status).toBe('LOCKED');
    expect(store.deals.get(current.id)?.latest_stellar_tx_hash).toBe('custody-sweep-tx');
  });
});
