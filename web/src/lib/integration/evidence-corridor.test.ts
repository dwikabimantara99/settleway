import { describe, expect, it, beforeEach, vi } from 'vitest';
import { POST as acceptDeliveryRoute } from '../../app/api/deals/[dealId]/accept-delivery/route';
import { POST as submitProofRoute } from '../../app/api/deals/[dealId]/submit-proof/route';
import { repository } from '../repositories';
import { mockStore } from '../db/mock-store';
import * as authServer from '../auth/server';
import { buildActiveRoomDealTerms } from '../deals/terms';
import { executeCustodyProofReference } from '../stellar/testnet-proof';

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

vi.mock('../stellar/testnet-proof', () => ({
  executeCustodyProofReference: vi.fn(),
}));

describe('Evidence Delivery Proof Corridor (Integration)', () => {
  beforeEach(() => {
    mockStore.seed();
    vi.clearAllMocks();
    mockExecutionAdapter.submit.mockResolvedValue({
      outcome: 'submitted',
      action: 'submit_proof',
      transaction_hash: 'c'.repeat(64),
    });
    mockExecutionAdapter.confirm.mockResolvedValue({
      outcome: 'confirmed',
      action: 'submit_proof',
      transaction_hash: 'c'.repeat(64),
      result_escrow_id: null,
    });
    vi.mocked(executeCustodyProofReference).mockResolvedValue({
      transactionHash: 'd'.repeat(64),
      custodyAddress: 'GCTGB45KC7CGLSH7AWNCI7TGG4OU23JWIPU4WHD6OI7P2DIBZ55N3FJG',
      proofHash: '7f5f3a96bcb7c4bbf76c2c3d4e7b7e85752f50eb0d98111f6f9b2e1a2c3d4e5f',
      proofDataKey: 'SWP:proof-custody-testnet',
    });
  });

  const setupTestnetDeal = async (status: 'LOCKED' | 'PROOF_SUBMITTED' | 'DELIVERED', proofHash: string | null = null) => {
    const dealId = 'evidence-deal-1';
    mockStore.deals.set(dealId, {
      id: dealId,
      listing_id: null,
      buyer_request_id: null,
      buyer_id: 'buyer-surabaya-restaurant',
      seller_id: 'seller-probolinggo-cabai',
      commodity: 'Red Chili',
      volume_kg: 500,
      principal_idr: 15000000,
      buyer_bond_idr: 750000,
      seller_bond_idr: 750000,
      buyer_fee_idr: 75000,
      seller_fee_idr: 75000,
      buyer_total_idr: 15825000,
      seller_total_idr: 825000,
      status: status,
      stellar_mode: 'testnet',
      stellar_contract_id: 'C-EVIDENCE-123',
      stellar_escrow_id: null,
      latest_stellar_tx_hash: 'tx-lock-hash',
      stellar_sync_status: 'idle',
      proof_hash: proofHash,
      terms: buildActiveRoomDealTerms({
        offerId: null,
        activatedAt: new Date().toISOString(),
        depositWindowHours: 24,
      }),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    return dealId;
  };

  const createJsonRequest = (body: object) => {
    return new Request('https://settleway.test/api/route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  };

  it('rejects buyer acceptance if proof is missing on testnet', async () => {
    const dealId = await setupTestnetDeal('DELIVERED', null);

    const buyerUser = { id: 'buyer-surabaya-restaurant', phone: '08123456789' };
    vi.spyOn(authServer, 'requireDealParticipant').mockResolvedValueOnce({
      user: buyerUser,
      deal: await repository.getDeal(dealId) as any,
      role: 'buyer',
    });

    const res = await acceptDeliveryRoute(createJsonRequest({}), {
      params: Promise.resolve({ dealId }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error.code).toBe('STELLAR_EXECUTION_INVALID');
    expect(data.error.message).toMatch(/proof must be submitted/);
  });

  it('seller can submit proof hash via JSON and it persists', async () => {
    const dealId = await setupTestnetDeal('LOCKED', null);

    const sellerUser = { id: 'seller-probolinggo-cabai', phone: '08234567890' };
    vi.spyOn(authServer, 'requireDealParticipant').mockResolvedValueOnce({
      user: sellerUser,
      deal: await repository.getDeal(dealId) as any,
      role: 'seller',
    });

    const mockProofHash = 'mocked-sha256-proof-hash';
    const res = await submitProofRoute(createJsonRequest({ proof_hash: mockProofHash }), {
      params: Promise.resolve({ dealId }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    
    const deal = await repository.getDeal(dealId);
    expect(deal?.status).toBe('PROOF_SUBMITTED');
    expect(deal?.proof_hash).toBe(mockProofHash);

    const events = await repository.getDealEvents(dealId);
    const proofEvent = events.find((e) => e.event_type === 'submit_proof');
    expect(proofEvent).toBeDefined();
    expect(proofEvent?.proof_hash).toBe(mockProofHash);
    expect(proofEvent?.metadata?.proof_recording_route).toBe('settleway_custody_wallet_memo_hash');
  });

});
