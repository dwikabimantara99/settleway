import { describe, it, expect, beforeEach } from 'vitest';
import { POST } from './route';
import { mockStore } from '@/lib/db/mock-store';

describe('Demo Reset API', () => {
  beforeEach(() => {
    mockStore.seed();
  });

  it('resets the mock store and returns success', async () => {
    // Mutate the store
    mockStore.updateDeal('demo-cabai-001', { status: 'COMPLETED' });
    expect(mockStore.deals.get('demo-cabai-001')?.status).toBe('COMPLETED');
    mockStore.updateOffer('offer-demo-cabai-001', {
      active_deal_id: null,
      status: 'awaiting_counterparty_acceptance',
      terms_accepted_at: null,
      terms_accepted_by_id: null,
    });
    expect(mockStore.offers.get('offer-demo-cabai-001')?.status).toBe(
      'awaiting_counterparty_acceptance',
    );

    // Call reset
    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data?.success).toBe(true);

    // Verify it was reset
    expect(mockStore.deals.get('demo-cabai-001')?.status).toBe('WAITING_DEPOSITS');
    expect(mockStore.deals.get('demo-cabai-001')?.terms.offer_id).toBe('offer-demo-cabai-001');
    expect(mockStore.deals.get('demo-cabai-001')?.terms.activation_source).toBe(
      'mutual_open_deal_room',
    );
    expect(mockStore.offers.get('offer-demo-cabai-001')?.active_deal_id).toBe('demo-cabai-001');
    expect(mockStore.getOfferMessages('offer-demo-cabai-001')).toHaveLength(3);
  });

  it('rejects in production environment', async () => {
    const originalEnv = process.env.NODE_ENV;
    Object.defineProperty(process, 'env', {
      value: { ...process.env, NODE_ENV: 'production' }
    });

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error?.code).toBe('ERR_UNSUPPORTED_MODE');

    Object.defineProperty(process, 'env', {
      value: { ...process.env, NODE_ENV: originalEnv }
    });
  });
});
