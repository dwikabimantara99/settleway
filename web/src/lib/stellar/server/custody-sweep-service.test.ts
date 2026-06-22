import { describe, expect, it, vi } from 'vitest';
import type { DbDeal, DbEscrowEvent } from '@/lib/db/types';
import { MockRepositoryAdapter } from '@/lib/repositories/mock-adapter';
import { mockStore } from '@/lib/db/mock-store';
import { completeCustodySweep } from '@/lib/stellar/server/custody-sweep-service';
import type { DealRoomTestnetRuntimeResult } from '@/lib/stellar/server/deal-room-testnet-runtime';

function makeDeal(overrides: Partial<DbDeal> = {}): DbDeal {
  return {
    id: `deal-custody-service-${Math.random()}`,
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
    status: 'CUSTODY_PENDING',
    stellar_mode: 'testnet',
    stellar_contract_id: null,
    stellar_escrow_id: null,
    latest_stellar_tx_hash: null,
    stellar_sync_status: 'idle',
    proof_hash: null,
    terms: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function runtimeResult(): DealRoomTestnetRuntimeResult {
  return {
    ok: true as const,
    runtime: {
      contract_id: 'contract-test',
      metadata: {
        contract_id: 'contract-test',
        admin_address: 'admin',
        buyer_demo_address: 'buyer',
        seller_demo_address: 'seller',
      },
      execution_adapter: {
        submit: vi.fn(),
        confirm: vi.fn(),
      },
      signer_port: {
        signTransaction: vi.fn(),
      },
    },
  };
}

describe('custody sweep completion service', () => {
  it('locks only after a confirmed custody transfer is persisted', async () => {
    const repository = new MockRepositoryAdapter();
    const deal = makeDeal();
    mockStore.deals.set(deal.id, deal);
    const executeSweep = vi.fn(async () => ({
      transactionHash: 'b'.repeat(64),
      custodyAddress: 'custody',
      buyerAmountXlm: '0.2104725',
      sellerAmountXlm: '0.0109725',
      assetCode: 'XLM',
    }));

    const result = await completeCustodySweep({
      repository,
      deal,
      actorId: deal.buyer_id,
      loadRuntime: runtimeResult,
      executeSweep,
    });

    expect(result.ok).toBe(true);
    expect(mockStore.deals.get(deal.id)?.status).toBe('LOCKED');
    expect(mockStore.getDealEvents(deal.id).map((event) => event.event_type)).toEqual([
      'custody_transfer_confirmed',
      'escrow_locked',
    ]);
  });

  it('reuses persisted custody proof instead of submitting a second transfer', async () => {
    const repository = new MockRepositoryAdapter();
    const deal = makeDeal();
    mockStore.deals.set(deal.id, deal);
    const proof: DbEscrowEvent = {
      id: `event-${deal.id}`,
      deal_id: deal.id,
      event_type: 'custody_transfer_confirmed',
      actor_id: deal.buyer_id,
      message: 'already confirmed',
      tx_hash: 'c'.repeat(64),
      proof_hash: null,
      metadata: {},
      created_at: new Date().toISOString(),
    };
    mockStore.addEvent(proof);
    const executeSweep = vi.fn();

    const result = await completeCustodySweep({
      repository,
      deal,
      actorId: deal.buyer_id,
      loadRuntime: runtimeResult,
      executeSweep,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.reusedExistingProof).toBe(true);
    }
    expect(executeSweep).not.toHaveBeenCalled();
    expect(mockStore.deals.get(deal.id)?.status).toBe('LOCKED');
  });

  it('leaves the room pending when the secure signer runtime is unavailable', async () => {
    const repository = new MockRepositoryAdapter();
    const deal = makeDeal();
    mockStore.deals.set(deal.id, deal);

    const result = await completeCustodySweep({
      repository,
      deal,
      actorId: deal.buyer_id,
      loadRuntime: () => ({
        ok: false,
        errors: [{ code: 'ERR_MISSING_CONFIG', field: 'signer' }],
      }),
    });

    expect(result).toMatchObject({
      ok: false,
      reason: 'runtime_unavailable',
    });
    expect(mockStore.deals.get(deal.id)?.status).toBe('CUSTODY_PENDING');
  });

  it('reuses confirmed custody proof through the guarded demo recovery path', async () => {
    const repository = new MockRepositoryAdapter();
    const deal = makeDeal();
    const transactionHash = 'd'.repeat(64);
    mockStore.deals.set(deal.id, deal);
    mockStore.events.set(deal.id, []);
    mockStore.addEvent({
      id: `event-${deal.id}`,
      deal_id: deal.id,
      event_type: 'custody_transfer_confirmed',
      actor_id: deal.seller_id,
      message: 'already confirmed',
      tx_hash: transactionHash,
      proof_hash: null,
      metadata: {},
      created_at: new Date().toISOString(),
    });
    vi.spyOn(repository, 'replaceDealIfCurrent').mockResolvedValue({
      replaced: false,
      deal: null,
    });
    const executeSweep = vi.fn();

    const result = await completeCustodySweep({
      repository,
      deal,
      actorId: deal.seller_id,
      loadRuntime: runtimeResult,
      executeSweep,
      allowDemoRecoveryFallback: true,
    });

    expect(result.ok).toBe(true);
    expect(executeSweep).not.toHaveBeenCalled();
    expect(mockStore.deals.get(deal.id)?.status).toBe('LOCKED');
    expect(mockStore.deals.get(deal.id)?.latest_stellar_tx_hash).toBe(transactionHash);
  });
});
