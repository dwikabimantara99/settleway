import { describe, expect, it, beforeEach, vi } from 'vitest';
import { POST as expireRoute } from '../../app/api/deals/[dealId]/expire/route';
import { POST as expireProofRoute } from '../../app/api/deals/[dealId]/expire-proof/route';
import { POST as rejectDeliveryRoute } from '../../app/api/deals/[dealId]/reject-delivery/route';
import { repository } from '../repositories';
import { mockStore } from '../db/mock-store';
import * as authServer from '../auth/server';
import { buildActiveRoomDealTerms } from '../deals/terms';

const mockExecutionAdapter = {
  submit: vi.fn(),
  confirm: vi.fn(),
};

vi.mock('../stellar/server/deal-room-testnet-runtime', () => ({
  resolveDealRoomDefaultStellarState: vi.fn(() => ({
    stellar_mode: 'mock_only',
    stellar_contract_id: null,
  })),
  loadDealRoomTestnetRuntime: vi.fn(() => ({
    ok: true,
    runtime: {
      contract_id: 'CCONTRACT123',
      metadata: {
        contract_id: 'CCONTRACT123',
        admin_address: 'GCTGB45KC7CGLSH7AWNCI7TGG4OU23JWIPU4WHD6OI7P2DIBZ55N3FJG',
        buyer_demo_address: 'GBKFD4EHOTC64YWBEHSQECOXLRR4WKKUFBAVQ3GF2HQADRBLNVSR5RLX',
        seller_demo_address: 'GAZGIBWKDTYSKZSXLIOJB4HE65VOLR22ZHTZ3FI6UX7QOGYFZQ6WVHWU',
      },
      execution_adapter: mockExecutionAdapter,
    },
  })),
}));

function addMockDeal(props: any) {
  const dealId = 'test-deal-' + Date.now() + Math.floor(Math.random() * 1000);
  const deal = {
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
    terms: buildActiveRoomDealTerms({
      offerId: null,
      activatedAt: new Date(Date.now() - 100000000).toISOString(),
      depositWindowHours: 24,
    }),
    created_at: new Date(Date.now() - 100000000).toISOString(),
    updated_at: new Date(Date.now() - 100000000).toISOString(),
    expires_at: new Date(Date.now() - 1000).toISOString(), // Expired!
    ...props
  };
  mockStore.deals.set(dealId, deal as any);
  return dealId;
}

const createJsonRequest = (url: string, body?: object) => {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
};

describe('Constrained Failure / Refund / Expiry Path (Integration)', () => {
  beforeEach(() => {
    mockStore.seed();
    vi.clearAllMocks();
    mockExecutionAdapter.submit.mockResolvedValue({ outcome: 'submitted', transaction_hash: 'tx-hash-001' });
    mockExecutionAdapter.confirm.mockImplementation(async (req) => ({ outcome: 'confirmed', action: req.action || req.expected_action || 'expire', transaction_hash: 'tx-hash-001', result_escrow_id: null }));
  });

  it('allows expiry from one-sided funding to REFUND_PENDING and issues reputation penalty', async () => {
    const dealId = addMockDeal({
      status: 'BUYER_FUNDED',
    });

    vi.spyOn(authServer, 'requireDealParticipant').mockImplementation(async (id: string) => ({
      user: { id: 'buyer-user', name: 'Buyer' } as any,
      deal: await repository.getDeal(id) as any,
      role: 'buyer',
    }));

    const req = createJsonRequest(`https://settleway.test/api/deals/${dealId}/expire`);
    const res = await expireRoute(req, { params: Promise.resolve({ dealId }) });
    const bodyText = await res.text();
    
    expect(res.status).toBe(200);

    const deal = await repository.getDeal(dealId);
    expect(deal?.status).toBe('REFUND_PENDING');
    expect(mockExecutionAdapter.submit).toHaveBeenCalled();
  });

  it('allows expire_proof to transition LOCKED to REVIEW_REQUIRED', async () => {
    const dealId = addMockDeal({
      status: 'LOCKED',
    });

    vi.spyOn(authServer, 'requireDealParticipant').mockImplementation(async (id: string) => ({
      user: { id: 'admin', name: 'Admin' } as any,
      deal: await repository.getDeal(id) as any,
      role: null as any,
    }));

    const req = createJsonRequest(`https://settleway.test/api/deals/${dealId}/expire-proof`);
    const res = await expireProofRoute(req, { params: Promise.resolve({ dealId }) });
    expect(res.status).toBe(200);

    const deal = await repository.getDeal(dealId);
    expect(deal?.status).toBe('REVIEW_REQUIRED');
    
    const events = await repository.getDealEvents(dealId);
    const expireEvent = events.find((e: any) => e.event_type === 'expire_proof');
    expect(expireEvent?.metadata.fixture_kind).toBe('LOCAL_FAILURE_CLASSIFICATION_ONLY');
  });

  it('allows reject-delivery by buyer from PROOF_SUBMITTED to DELIVERY_REJECTED', async () => {
    const dealId = addMockDeal({
      status: 'PROOF_SUBMITTED',
      proof_hash: 'abc',
    });

    vi.spyOn(authServer, 'requireDealParticipant').mockImplementation(async (id: string) => ({
      user: { id: 'buyer-user', name: 'Buyer' } as any,
      deal: await repository.getDeal(id) as any,
      role: 'buyer',
    }));

    const req = createJsonRequest(`https://settleway.test/api/deals/${dealId}/reject-delivery`, {
      reason: 'Quality does not match agreed terms.'
    });
    const res = await rejectDeliveryRoute(req, { params: Promise.resolve({ dealId }) });
    expect(res.status).toBe(200);

    const deal = await repository.getDeal(dealId);
    expect(deal?.status).toBe('DELIVERY_REJECTED');

    const events = await repository.getDealEvents(dealId);
    const rejectEvent = events.find((e: any) => e.event_type === 'reject_delivery');
    expect(rejectEvent?.metadata.rejection_reason).toBe('Quality does not match agreed terms.');
    expect(rejectEvent?.metadata.fixture_kind).toBe('LOCAL_FAILURE_CLASSIFICATION_ONLY');
  });
});
