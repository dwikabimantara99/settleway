import { describe, expect, it, vi } from 'vitest';
import type { DbDeal } from '@/lib/db/types';
import { mockStore } from '@/lib/db/mock-store';
import { MockRepositoryAdapter } from '@/lib/repositories/mock-adapter';
import { recordConfirmedFunding } from '@/lib/stellar/server/signed-funding-service';

function makeDeal(): DbDeal {
  return {
    id: 'deal-reconcile-seller-funding',
    listing_id: null,
    buyer_request_id: null,
    buyer_id: 'buyer-1',
    seller_id: 'seller-1',
    commodity: 'Red Chili',
    volume_kg: 700,
    principal_idr: 19_950_000,
    buyer_bond_idr: 997_500,
    seller_bond_idr: 997_500,
    buyer_fee_idr: 99_750,
    seller_fee_idr: 99_750,
    buyer_total_idr: 21_047_250,
    seller_total_idr: 1_097_250,
    status: 'BUYER_FUNDED',
    stellar_mode: 'testnet',
    stellar_contract_id: null,
    stellar_escrow_id: null,
    latest_stellar_tx_hash: 'b'.repeat(64),
    stellar_sync_status: 'idle',
    proof_hash: null,
    terms: {},
    created_at: '2026-06-21T09:32:31.134Z',
    updated_at: '2026-06-21T09:34:20.046Z',
  };
}

describe('confirmed signed funding recovery', () => {
  it('records a confirmed seller payment once and advances to custody pending', async () => {
    const repository = new MockRepositoryAdapter();
    const deal = makeDeal();
    const transactionHash = 'c'.repeat(64);
    mockStore.deals.set(deal.id, deal);
    mockStore.events.set(deal.id, []);
    const completeSweep = vi.fn(async ({ deal: pendingDeal }: { deal: DbDeal }) => ({
      ok: false as const,
      deal: pendingDeal,
      reason: 'runtime_unavailable' as const,
      message: 'signer unavailable in unit test',
    }));

    const first = await recordConfirmedFunding({
      repository,
      dealId: deal.id,
      action: 'seller_deposit',
      actorId: deal.seller_id,
      sourceAddress: 'GSELLERCONNECTED',
      transactionHash,
      completeSweep,
    });
    const second = await recordConfirmedFunding({
      repository,
      dealId: deal.id,
      action: 'seller_deposit',
      actorId: deal.seller_id,
      sourceAddress: 'GSELLERCONNECTED',
      transactionHash,
      completeSweep,
    });

    expect(first.deal.status).toBe('CUSTODY_PENDING');
    expect(second.reusedFundingRecord).toBe(true);
    expect(mockStore.deals.get(deal.id)?.status).toBe('CUSTODY_PENDING');
    expect(
      mockStore.getDealEvents(deal.id).filter((event) =>
        event.event_type === 'seller_deposit' && event.tx_hash === transactionHash,
      ),
    ).toHaveLength(1);
    expect(
      mockStore.getDealEvents(deal.id).filter((event) => event.event_type === 'custody_pending'),
    ).toHaveLength(1);
  });

  it('uses the guarded demo fallback only when the stored deal is unchanged', async () => {
    const repository = new MockRepositoryAdapter();
    const deal = makeDeal();
    const transactionHash = 'd'.repeat(64);
    mockStore.deals.set(deal.id, deal);
    mockStore.events.set(deal.id, []);
    vi.spyOn(repository, 'replaceDealIfCurrent').mockResolvedValue({
      replaced: false,
      deal: null,
    });
    const completeSweep = vi.fn(async ({ deal: pendingDeal }: { deal: DbDeal }) => ({
      ok: false as const,
      deal: pendingDeal,
      reason: 'runtime_unavailable' as const,
      message: 'signer unavailable in unit test',
    }));

    const result = await recordConfirmedFunding({
      repository,
      dealId: deal.id,
      action: 'seller_deposit',
      actorId: deal.seller_id,
      sourceAddress: 'GSELLERCONNECTED',
      transactionHash,
      completeSweep,
      allowDemoRecoveryFallback: true,
    });

    expect(result.deal.status).toBe('CUSTODY_PENDING');
    expect(mockStore.deals.get(deal.id)?.latest_stellar_tx_hash).toBe(transactionHash);
  });
});
