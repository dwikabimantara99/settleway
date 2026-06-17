/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as nextHeaders from 'next/headers';

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

import { mockStore } from '../db/mock-store';
import { POST as dealsRoute } from '../../app/api/deals/route';
import { GET as getDealRoute } from '../../app/api/deals/[dealId]/route';
import { POST as buyerDepositRoute } from '../../app/api/deals/[dealId]/buyer-deposit/route';
import { POST as sellerDepositRoute } from '../../app/api/deals/[dealId]/seller-deposit/route';
import { POST as markDeliveredRoute } from '../../app/api/deals/[dealId]/mark-delivered/route';
import { POST as demoResetRoute } from '../../app/api/demo/reset/route';

describe('Route Evidence Additions', () => {
  beforeEach(() => {
    mockStore.seed();
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
      status: status as any,
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

  it('POST /api/deals rejects direct deal creation without mutual Open Deal Room', async () => {
    vi.mocked(nextHeaders.cookies).mockReturnValue({ get: () => ({ value: 'malicious-user' }) } as any);
    const request = new Request('http://localhost/api/deals', {
      method: 'POST',
      body: JSON.stringify({ buyerId: 'buyer-1', sellerId: 'seller-1', commodity: 'Gold', principalIdr: 100 })
    });
    const res = await dealsRoute(request);
    expect(res.status).toBe(409);
  });

  it('GET /api/deals/[dealId] succeeds for participant', async () => {
    setupDeal('deal-get', 'WAITING_DEPOSITS');
    vi.mocked(nextHeaders.cookies).mockReturnValue({ get: () => ({ value: 'buyer-1' }) } as any);
    const request = new Request('http://localhost/api/deals/deal-get', { method: 'GET' });
    const res = await getDealRoute(request, { params: Promise.resolve({ dealId: 'deal-get' }) });
    expect(res.status).toBe(200);
  });

  it('POST buyer-deposit succeeds', async () => {
    setupDeal('deal-bd', 'WAITING_DEPOSITS');
    vi.mocked(nextHeaders.cookies).mockReturnValue({ get: () => ({ value: 'buyer-1' }) } as any);
    const request = new Request('http://localhost/api/deals/deal-bd/buyer-deposit', { method: 'POST' });
    const res = await buyerDepositRoute(request, { params: Promise.resolve({ dealId: 'deal-bd' }) });
    expect(res.status).toBe(200);
  });

  it('POST seller-deposit succeeds', async () => {
    setupDeal('deal-sd', 'WAITING_DEPOSITS');
    vi.mocked(nextHeaders.cookies).mockReturnValue({ get: () => ({ value: 'seller-1' }) } as any);
    const request = new Request('http://localhost/api/deals/deal-sd/seller-deposit', { method: 'POST' });
    const res = await sellerDepositRoute(request, { params: Promise.resolve({ dealId: 'deal-sd' }) });
    expect(res.status).toBe(200);
  });

  it('second deposit records an escrow_locked event', async () => {
    setupDeal('deal-lock', 'BUYER_FUNDED');
    vi.mocked(nextHeaders.cookies).mockReturnValue({ get: () => ({ value: 'seller-1' }) } as any);
    const request = new Request('http://localhost/api/deals/deal-lock/seller-deposit', { method: 'POST' });
    const res = await sellerDepositRoute(request, { params: Promise.resolve({ dealId: 'deal-lock' }) });
    expect(res.status).toBe(200);

    const events = mockStore.getDealEvents('deal-lock');
    expect(events.map((event) => event.event_type)).toContain('escrow_locked');
  });

  it('POST mark-delivered succeeds', async () => {
    setupDeal('deal-md', 'PROOF_SUBMITTED');
    vi.mocked(nextHeaders.cookies).mockReturnValue({ get: () => ({ value: 'seller-1' }) } as any);
    const request = new Request('http://localhost/api/deals/deal-md/mark-delivered', { method: 'POST' });
    const res = await markDeliveredRoute(request, { params: Promise.resolve({ dealId: 'deal-md' }) });
    expect(res.status).toBe(200);
  });

  it('POST /api/demo/reset succeeds', async () => {
    vi.mocked(nextHeaders.cookies).mockReturnValue({ get: () => ({ value: 'demo-admin' }) } as any);
    const res = await demoResetRoute();
    expect(res.status).toBe(200);
  });
});
