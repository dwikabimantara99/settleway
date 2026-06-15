import { describe, it, expect, beforeEach } from 'vitest';
import { mockStore } from '../db/mock-store';
import { POST as acceptDeliveryRoute } from '../../app/api/deals/[dealId]/accept-delivery/route';
import { POST as expireRoute } from '../../app/api/deals/[dealId]/expire/route';
import { POST as refundRoute } from '../../app/api/deals/[dealId]/refund/route';
import { POST as submitProofRoute } from '../../app/api/deals/[dealId]/submit-proof/route';

describe('Application Integration', () => {
  beforeEach(() => {
    mockStore.seed();
    // Setting up globalThis.crypto.randomUUID for tests if not available
    if (!globalThis.crypto) {
      (globalThis as unknown as { crypto: Crypto }).crypto = {} as Crypto;
    }
    if (!globalThis.crypto.randomUUID) {
      let counter = 0;
      globalThis.crypto.randomUUID = () => `uuid-${counter++}` as `${string}-${string}-${string}-${string}-${string}`;
    }
  });

  const setupDeal = (dealId: string, status: string) => {
    mockStore.deals.set(dealId, {
      id: dealId,
      buyer_id: 'buyer-1',
      seller_id: 'seller-1',
      commodity: 'Test',
      principal_idr: 1000,
      buyer_bond_idr: 100,
      seller_bond_idr: 100,
      buyer_fee_idr: 10,
      seller_fee_idr: 10,
      buyer_total_idr: 1110,
      seller_total_idr: 110,
      status: status,
      stellar_mode: 'mock_only',
      stellar_contract_id: null,
      stellar_escrow_id: null,
      latest_stellar_tx_hash: null,
      stellar_sync_status: 'idle',
      proof_hash: null,
      terms: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      listing_id: null,
      buyer_request_id: null,
      volume_kg: null
    });
  };

  it('accept-delivery route triggers transaction_completed reputation', async () => {
    const dealId = 'd-004';
    setupDeal(dealId, 'DELIVERED');
    const request = new Request(`http://localhost/api/deals/${dealId}/accept-delivery`, { method: 'POST' });
    
    const response = await acceptDeliveryRoute(request, { params: Promise.resolve({ dealId }) });
    expect(response.status).toBe(200);

    const dealEvents = mockStore.getDealReputationEvents(dealId);
    expect(dealEvents.length).toBe(2);
    expect(dealEvents[0].reputation_outcome).toBe('transaction_completed');
    expect(dealEvents[1].reputation_outcome).toBe('transaction_completed');

    // Repeated call should not duplicate reputation events
    await acceptDeliveryRoute(request, { params: Promise.resolve({ dealId }) }).catch(() => {});
    const dealEventsAfter = mockStore.getDealReputationEvents(dealId);
    expect(dealEventsAfter.length).toBe(2); // no duplicate
  });

  it('expire route triggers failed_deposit reputation from BUYER_FUNDED', async () => {
    const dealId = 'd-002';
    setupDeal(dealId, 'BUYER_FUNDED');
    const request = new Request(`http://localhost/api/deals/${dealId}/expire`, { method: 'POST' });
    
    const response = await expireRoute(request, { params: Promise.resolve({ dealId }) });
    expect(response.status).toBe(200);

    const dealEvents = mockStore.getDealReputationEvents(dealId);
    expect(dealEvents.length).toBe(2);
    expect(dealEvents[0].reputation_outcome).toBe('seller_failed_deposit');
  });

  it('refund route triggers refunded_before_locked reputation', async () => {
    const dealId = 'd-002-refund';
    setupDeal(dealId, 'BUYER_FUNDED');
    const request = new Request(`http://localhost/api/deals/${dealId}/refund`, { method: 'POST' });
    
    const response = await refundRoute(request, { params: Promise.resolve({ dealId }) });
    expect(response.status).toBe(200);

    const dealEvents = mockStore.getDealReputationEvents(dealId);
    expect(dealEvents.length).toBe(2);
    expect(dealEvents[0].reputation_outcome).toBe('refunded_before_locked');
  });

  it('submit-proof route persists evidence and updates deal proof hash', async () => {
    const dealId = 'd-003';
    setupDeal(dealId, 'LOCKED');
    const deal = mockStore.deals.get(dealId)!;

    const formData = new FormData();
    formData.append('actor_id', deal.seller_id); // auth boundary check
    
    const fileContent = 'fake-image-bytes';
    const blob = new Blob([fileContent], { type: 'image/jpeg' });
    formData.append('file', blob, 'photo.jpg');

    const request = new Request(`http://localhost/api/deals/${dealId}/submit-proof`, {
      method: 'POST',
      body: formData
    });
    
    const response = await submitProofRoute(request, { params: Promise.resolve({ dealId }) });
    expect(response.status).toBe(200);

    const updatedDeal = mockStore.deals.get(dealId)!;
    expect(updatedDeal.proof_hash).toBeTruthy();
    expect(updatedDeal.status).toBe('PROOF_SUBMITTED');

    const evidences = mockStore.getDealEvidence(dealId);
    expect(evidences.length).toBe(1);
    expect(evidences[0].sha256_hash).toBe(updatedDeal.proof_hash);
  });

  it('submit-proof route rejects unauthorized submitter', async () => {
    const dealId = 'd-003-unauth';
    setupDeal(dealId, 'LOCKED');
    const deal = mockStore.deals.get(dealId)!;

    const formData = new FormData();
    formData.append('actor_id', deal.buyer_id); // Buyer tries to submit
    const blob = new Blob(['fake'], { type: 'image/jpeg' });
    formData.append('file', blob, 'photo.jpg');

    const request = new Request(`http://localhost/api/deals/${dealId}/submit-proof`, {
      method: 'POST',
      body: formData
    });
    
    const response = await submitProofRoute(request, { params: Promise.resolve({ dealId }) });
    expect(response.status).toBe(403);
    
    // No evidence persisted
    const evidences = mockStore.getDealEvidence(dealId);
    expect(evidences.length).toBe(0);
  });
});
