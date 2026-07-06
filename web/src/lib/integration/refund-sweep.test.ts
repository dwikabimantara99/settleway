import { describe, expect, it, beforeEach, vi } from 'vitest';
import { POST as refundSweepRoute } from '../../app/api/deals/[dealId]/refund-sweep/route';
import { repository } from '../repositories';
import { mockStore } from '../db/mock-store';
import * as authServer from '../auth/server';
import { buildActiveRoomDealTerms } from '../deals/terms';
import type { DbDeal } from '../db/types';
import type { AuthenticatedUser } from '../auth/server';

function addMockDeal(props: Partial<DbDeal>): string {
  const dealId = 'test-deal-' + Date.now() + Math.floor(Math.random() * 1000);
  const deal: DbDeal = {
    id: dealId,
    listing_id: null,
    buyer_request_id: null,
    buyer_id: 'buyer-user',
    seller_id: 'seller-user',
    commodity: 'Red Chili',
    volume_kg: 500,
    principal_idr: 15000000,
    buyer_bond_idr: 750000,
    seller_bond_idr: 750000,
    buyer_fee_idr: 75000,
    seller_fee_idr: 75000,
    buyer_total_idr: 15825000,
    seller_total_idr: 825000,
    stellar_mode: 'testnet',
    stellar_contract_id: 'CCONTRACT123',
    stellar_escrow_id: '12345',
    latest_stellar_tx_hash: 'tx-lock-hash',
    stellar_sync_status: 'idle',
    proof_hash: null,
    version: '1',
    status: 'WAITING_DEPOSITS',
    terms: buildActiveRoomDealTerms({
      offerId: null,
      activatedAt: new Date(Date.now() - 100000000).toISOString(),
      depositWindowHours: 24,
    }),
    created_at: new Date(Date.now() - 100000000).toISOString(),
    updated_at: new Date(Date.now() - 100000000).toISOString(),
    expires_at: new Date(Date.now() - 1000).toISOString(),
    ...props,
  };
  mockStore.deals.set(dealId, deal);
  return dealId;
}

const createJsonRequest = (url: string, body?: object) => {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
};

describe('Refund Sweep Execution Corridor (Integration)', () => {
  beforeEach(() => {
    mockStore.seed();
    vi.clearAllMocks();
  });

  it('rejects refund sweep for deals not in REFUND_PENDING', async () => {
    const dealId = addMockDeal({ status: 'DELIVERED' });

    vi.spyOn(authServer, 'requireDealParticipant').mockImplementation(async (id: string) => ({
      user: { id: 'admin', name: 'Admin' } as AuthenticatedUser,
      deal: (await repository.getDeal(id))!,
      role: null,
    }));

    const req = createJsonRequest(`https://settleway.test/api/deals/${dealId}/refund-sweep`);
    const res = await refundSweepRoute(req, { params: Promise.resolve({ dealId }) });
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error.code).toBe('INVALID_STATE');
    expect(json.error.message).toContain('Cannot sweep refund from state: DELIVERED');
  });

  it('rejects refund sweep if recipient is ambiguous', async () => {
    const dealId = addMockDeal({ status: 'REFUND_PENDING' });

    vi.spyOn(authServer, 'requireDealParticipant').mockImplementation(async (id: string) => ({
      user: { id: 'admin', name: 'Admin' } as AuthenticatedUser,
      deal: (await repository.getDeal(id))!,
      role: null,
    }));

    const req = createJsonRequest(`https://settleway.test/api/deals/${dealId}/refund-sweep`);
    const res = await refundSweepRoute(req, { params: Promise.resolve({ dealId }) });
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error.code).toBe('INVALID_STATE');
    expect(json.error.message).toContain('Ambiguous refund recipient');
  });

  it('returns 501 NOT_IMPLEMENTED for eligible deals due to contract constraints', async () => {
    const dealId = addMockDeal({ status: 'REFUND_PENDING' });
    
    // Add mock expire event
    mockStore.addEvent({
        id: 'evt-1',
        deal_id: dealId,
        actor_id: 'admin',
        event_type: 'expire',
        message: 'Expired',
        metadata: { previous_status: 'BUYER_FUNDED' },
        created_at: new Date().toISOString(),
        tx_hash: null
    });

    vi.spyOn(authServer, 'requireDealParticipant').mockImplementation(async (id: string) => ({
      user: { id: 'admin', name: 'Admin' } as AuthenticatedUser,
      deal: (await repository.getDeal(id))!,
      role: null,
    }));

    const req = createJsonRequest(`https://settleway.test/api/deals/${dealId}/refund-sweep`);
    const res = await refundSweepRoute(req, { params: Promise.resolve({ dealId }) });
    
    // As per the requirement to safely block if not fully supported
    expect(res.status).toBe(501);

    const json = await res.json();
    expect(json.error.code).toBe('NOT_IMPLEMENTED');
    expect(json.error.message).toContain('LOCAL_REFUND_SWEEP_PREP_ONLY');
  });
});
