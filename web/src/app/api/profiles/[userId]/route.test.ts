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
    expect(payload.data.connected_wallet_address).toBeNull();
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

  it('links a valid external Stellar Testnet wallet for the authenticated owner', async () => {
    vi.mocked(nextHeaders.cookies).mockReturnValue({
      get: () => ({ value: 'buyer-surabaya-restaurant' }),
    } as any);

    const walletAddress = 'GBKFD4EHOTC64YWBEHSQECOXLRR4WKKUFBAVQ3GF2HQADRBLNVSR5RLX';
    const response = await patchProfileRoute(
      new Request('http://localhost/api/profiles/buyer-surabaya-restaurant', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          connected_wallet_address: walletAddress,
          connected_wallet_network: 'testnet',
          connected_wallet_provider: 'Freighter',
        }),
      }),
      { params: Promise.resolve({ userId: 'buyer-surabaya-restaurant' }) },
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.data.connected_wallet_address).toBe(walletAddress);
    expect(payload.data.connected_wallet_network).toBe('testnet');
    expect(payload.data.connected_wallet_provider).toBe('Freighter');
    expect(payload.data.connected_wallet_linked_at).toBeTruthy();
  });

  it('rejects an invalid external Stellar wallet address', async () => {
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
          connected_wallet_address: 'NOT_A_STELLAR_PUBLIC_KEY',
          connected_wallet_network: 'testnet',
          connected_wallet_provider: 'Freighter',
        }),
      }),
      { params: Promise.resolve({ userId: 'buyer-surabaya-restaurant' }) },
    );

    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.error.message).toContain('valid Stellar public key');
  });

  it('rejects connected wallet updates outside Stellar Testnet', async () => {
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
          connected_wallet_address: 'GBKFD4EHOTC64YWBEHSQECOXLRR4WKKUFBAVQ3GF2HQADRBLNVSR5RLX',
          connected_wallet_network: 'mainnet',
          connected_wallet_provider: 'Freighter',
        }),
      }),
      { params: Promise.resolve({ userId: 'buyer-surabaya-restaurant' }) },
    );

    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.error.message).toContain('Testnet');
  });

  it('updates basic profile identity for the authenticated owner', async () => {
    vi.mocked(nextHeaders.cookies).mockReturnValue({
      get: () => ({ value: 'seller-probolinggo-cabai' }),
    } as any);

    const response = await patchProfileRoute(
      new Request('http://localhost/api/profiles/seller-probolinggo-cabai', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          display_name: 'Probolinggo Farmer Group',
          role_label: 'Agricultural Supplier',
          location: 'Probolinggo, East Java',
        }),
      }),
      { params: Promise.resolve({ userId: 'seller-probolinggo-cabai' }) },
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.data.display_name).toBe('Probolinggo Farmer Group');
    expect(payload.data.role_label).toBe('Agricultural Supplier');
    expect(payload.data.location).toBe('Probolinggo, East Java');
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
