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

    // Call reset
    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data?.success).toBe(true);

    // Verify it was reset
    expect(mockStore.deals.get('demo-cabai-001')?.status).toBe('WAITING_DEPOSITS');
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
