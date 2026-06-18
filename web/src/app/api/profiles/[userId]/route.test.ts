/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as nextHeaders from 'next/headers';

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

import { mockStore } from '@/lib/db/mock-store';
import { GET as getProfileRoute, PATCH as patchProfileRoute } from './route';

describe('profile route', () => {
  beforeEach(() => {
    mockStore.seed();
    vi.clearAllMocks();
  });

  it('returns payout destination data on GET', async () => {
    const response = await getProfileRoute(
      new Request('http://localhost/api/profiles/buyer-surabaya-restaurant'),
      { params: Promise.resolve({ userId: 'buyer-surabaya-restaurant' }) },
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.data.payout_rail_preference).toBe('wallet');
    expect(payload.data.payout_wallet_label).toBeTruthy();
    expect(payload.data.payout_wallet_address).toBeTruthy();
  });

  it('updates payout destination data for the authenticated owner', async () => {
    vi.mocked(nextHeaders.cookies).mockReturnValue({
      get: () => ({ value: 'buyer-surabaya-restaurant' }),
    } as any);

    const response = await patchProfileRoute(
      new Request('http://localhost/api/profiles/buyer-surabaya-restaurant', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payout_rail_preference: 'wallet',
          payout_wallet_label: 'Operations treasury wallet',
          payout_wallet_address: 'GUPDATEDDESTINATION123',
        }),
      }),
      { params: Promise.resolve({ userId: 'buyer-surabaya-restaurant' }) },
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.data.payout_wallet_label).toBe('Operations treasury wallet');
    expect(payload.data.payout_wallet_address).toBe('GUPDATEDDESTINATION123');
  });

  it('rejects payout destination updates from a different authenticated user', async () => {
    vi.mocked(nextHeaders.cookies).mockReturnValue({
      get: () => ({ value: 'seller-probolinggo-cabai' }),
    } as any);

    const response = await patchProfileRoute(
      new Request('http://localhost/api/profiles/buyer-surabaya-restaurant', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payout_rail_preference: 'wallet',
          payout_wallet_label: 'Wrong actor wallet',
          payout_wallet_address: 'GBADACTORDESTINATION',
        }),
      }),
      { params: Promise.resolve({ userId: 'buyer-surabaya-restaurant' }) },
    );

    expect(response.status).toBe(403);
  });

  it('rejects local bank rail selection because it is not live in this MVP', async () => {
    vi.mocked(nextHeaders.cookies).mockReturnValue({
      get: () => ({ value: 'buyer-surabaya-restaurant' }),
    } as any);

    const response = await patchProfileRoute(
      new Request('http://localhost/api/profiles/buyer-surabaya-restaurant', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payout_rail_preference: 'bank',
          payout_bank_name: 'Bank settlement rail',
        }),
      }),
      { params: Promise.resolve({ userId: 'buyer-surabaya-restaurant' }) },
    );

    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.error.message).toContain('not live');
  });
});
