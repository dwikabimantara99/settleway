/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MockRepositoryAdapter } from './mock-adapter';
import { SupabaseRepositoryAdapter } from './supabase-adapter';
import { IRepository } from './interfaces';
import { mockStore } from '../db/mock-store';
import type { DbDeal } from '../db/types';

vi.mock('../db/supabase-client', () => {
  const dataStore = new Map<string, any[]>();
  
  const createQueryBuilder = (tableName: string) => {
    if (!dataStore.has(tableName)) dataStore.set(tableName, []);
    let currentQuery = [...dataStore.get(tableName)!];
    
    return {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn((item) => {
        const items = Array.isArray(item) ? item : [item];
        const store = dataStore.get(tableName)!;
        for (const i of items) {
          if (i.id && store.find(x => x.id === i.id)) {
            return Promise.resolve({ data: null, error: { code: '23505', message: 'Unique violation' } });
          }
        }
        store.push(...items);
        return Promise.resolve({ data: Array.isArray(item) ? items : item, error: null });
      }),
      update: vi.fn((patch) => {
        const updated: any[] = [];
        return {
          eq: vi.fn((key, value) => {
            currentQuery = currentQuery.filter(item => item[key] === value);
            currentQuery.forEach(item => {
              Object.assign(item, patch);
              updated.push(item);
            });
            return {
              eq: vi.fn().mockReturnThis(),
              select: vi.fn().mockReturnValue({
                single: vi.fn(() => Promise.resolve({ data: updated[0] || null, error: updated.length === 0 ? { code: 'PGRST116' } : null }))
              })
            };
          })
        };
      }),
      eq: vi.fn((key, value) => {
        currentQuery = currentQuery.filter(item => item[key] === value);
        return {
          single: vi.fn(() => Promise.resolve({ data: currentQuery[0] || null, error: currentQuery.length === 0 ? { code: 'PGRST116' } : null }))
        };
      }),
      order: vi.fn(() => Promise.resolve({ data: currentQuery, error: null })),
      single: vi.fn(() => Promise.resolve({ data: currentQuery[0] || null, error: currentQuery.length === 0 ? { code: 'PGRST116' } : null })),
    };
  };

  return {
    supabase: {
      from: vi.fn((tableName: string) => createQueryBuilder(tableName)),
      __seed: (tableName: string, data: any[]) => dataStore.set(tableName, data)
    },
    hasSupabaseConfig: true
  };
});

import { supabase } from '../db/supabase-client';

const runSharedSuite = (name: string, getRepo: () => IRepository, seedData: () => void) => {
  describe(`${name} Contract Tests`, () => {
    let repo: IRepository;

    beforeEach(() => {
      seedData();
      repo = getRepo();
    });

    it('retrieves seeded profiles', async () => {
      const profile = await repo.getProfile('buyer-surabaya-restaurant');
      expect(profile).not.toBeNull();
      expect(profile?.display_name).toBe('Surabaya Spice Co.');
      expect(profile?.payout_rail_preference).toBe('wallet');
      expect(profile?.payout_wallet_address).toBeTruthy();
    });

    it('updates payout destination on a profile', async () => {
      await repo.updateProfile('buyer-surabaya-restaurant', {
        payout_rail_preference: 'wallet',
        payout_wallet_label: 'Treasury hot wallet',
        payout_wallet_address: 'GDESTINATION123',
      });

      const updated = await repo.getProfile('buyer-surabaya-restaurant');
      expect(updated?.payout_rail_preference).toBe('wallet');
      expect(updated?.payout_wallet_label).toBe('Treasury hot wallet');
      expect(updated?.payout_wallet_address).toBe('GDESTINATION123');
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
        commodity: 'Red Chili',
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
  });
};

runSharedSuite('MockRepositoryAdapter', () => new MockRepositoryAdapter(), () => {
  mockStore.seed();
});

runSharedSuite('SupabaseRepositoryAdapter', () => new SupabaseRepositoryAdapter(), () => {
  const s = supabase as any;
  s.__seed('profiles', [
    {
      id: 'buyer-surabaya-restaurant',
      display_name: 'Surabaya Spice Co.',
      payout_rail_preference: 'wallet',
      payout_wallet_label: 'Procurement treasury wallet',
      payout_wallet_address: 'GBL7R3X4YTF7Q7M6M2J3QK7A4ZJ5V8L2P6N4R9T2C7Y5M3W6K8A1B2CD',
      payout_bank_name: 'Bank settlement rail',
      payout_bank_account_masked: 'Not live in MVP',
    }
  ]);
  s.__seed('listings', [
    { id: 'list-1', created_at: new Date().toISOString() }
  ]);
  s.__seed('deals', [
    { id: 'demo-cabai-001', status: 'WAITING_DEPOSITS', updated_at: '2026-06-15T00:00:00.000Z' }
  ]);
});
