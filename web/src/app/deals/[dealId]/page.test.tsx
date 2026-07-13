/* eslint-disable */
import { describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { cookies } from 'next/headers';
import DealRoomPage from './page';
import { repository } from '@/lib/repositories';
import {
  DEAL_STATE_GALLERY_STATUSES,
  type DealStateGalleryStatus,
  getDealStateGalleryFixtureId,
} from '@/lib/deal-state-gallery';

const statusLabels: Record<DealStateGalleryStatus, string> = {
  WAITING_DEPOSITS: 'Awaiting deposits',
  BUYER_FUNDED: 'Buyer funded',
  SELLER_FUNDED: 'Seller funded',
  CUSTODY_PENDING: 'Confirming custody',
  LOCKED: 'Escrow protected',
  PROOF_SUBMITTED: 'Evidence submitted',
  DELIVERED: 'Buyer review',
  COMPLETED: 'Settled',
  EXPIRED: 'Expired',
  REFUNDED: 'Refunded',
  CANCELLED: 'Cancelled',
  REFUND_PENDING: 'Refund Pending',
  REVIEW_REQUIRED: 'Manual Review',
  DELIVERY_REJECTED: 'Delivery Rejected',
};

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn((name: string) => name === 'mock_actor' ? { value: 'buyer-surabaya-restaurant' } : undefined),
  })),
}));

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('not-found');
  }),
  useRouter: vi.fn(() => ({
    refresh: vi.fn(),
  })),
}));

vi.mock('@/lib/db/server-service-client', () => ({
  getServiceRoleClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      order: vi.fn().mockReturnThis(),
    })),
  })),
}));

import { beforeEach } from 'vitest';

describe('Deal Room state gallery fixtures', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn((name: string) => name === 'mock_actor' ? { value: 'buyer-surabaya-restaurant' } : undefined),
    } as never);
  });
  it('renders every deterministic Deal Room state through the production route', async () => {
    for (const status of DEAL_STATE_GALLERY_STATUSES) {
      const mockActor = status === 'PROOF_SUBMITTED' ? 'seller-probolinggo-cabai' : 'buyer-surabaya-restaurant';
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn((name: string) => name === 'mock_actor' ? { value: mockActor } : undefined),
      } as never);

      const element = await DealRoomPage({
        params: Promise.resolve({ dealId: getDealStateGalleryFixtureId(status) }),
        searchParams: Promise.resolve({}),
      });
      const html = renderToString(element);

      expect(html).toContain("Red Chili (Bird&#x27;s Eye Chili)");
      expect(html).toContain(getDealStateGalleryFixtureId(status));
      expect(html).toContain(statusLabels[status]);

      if (
        status === 'WAITING_DEPOSITS' ||
        status === 'BUYER_FUNDED' ||
        status === 'SELLER_FUNDED' ||
        status === 'CUSTODY_PENDING'
      ) {
        expect(html).toContain('Escrow Timeline');
      } else {
        expect(html).toContain('Protected by escrow logic and recorded on Stellar');
      }

      if (status === 'CUSTODY_PENDING') {
        expect(html).toContain('Refresh Escrow Status');
      }

      if (status === 'LOCKED') {
        expect(html).toContain('Awaiting Delivery Proof');
      }

      if (status === 'PROOF_SUBMITTED') {
        expect(html).toContain('Confirm Delivery Milestone');
      }

      if (status === 'DELIVERED') {
        expect(html).toContain('Review Proof &amp; Settle');
      }

      if (status === 'COMPLETED') {
        expect(html).toContain('Success Settlement Summary');
        expect(html).toContain('Payout Destinations');
      }

      if (status === 'EXPIRED' || status === 'REFUNDED' || status === 'CANCELLED') {
        expect(html).toContain('Closed Funding Snapshot');
      }
    }
  });

  it('returns not found correctly for unknown deal in demo mode', async () => {
    const originalEnv = process.env.NEXT_PUBLIC_RUNTIME_MODE;
    process.env.NEXT_PUBLIC_RUNTIME_MODE = 'demo';
    await expect(
      DealRoomPage({ params: Promise.resolve({ dealId: 'unknown-deal-id' }), searchParams: Promise.resolve({}) })
    ).rejects.toThrow('not-found');

    process.env.NEXT_PUBLIC_RUNTIME_MODE = originalEnv;
  });

  describe('Demo Authorization and Fallback', () => {
    it('returns not-found when unauthenticated visitor tries to activate demo service with ?demo=1', async () => {
      vi.spyOn(repository, 'getDeal').mockResolvedValue(null);
      vi.mocked(cookies).mockResolvedValue({ get: () => undefined } as any);

      await expect(
        DealRoomPage({
          params: Promise.resolve({ dealId: 'demo-cabai-001' }),
          searchParams: Promise.resolve({ demo: '1', role: 'buyer' }),
        })
      ).rejects.toThrow('not-found');
    });

    it('returns not-found when unauthenticated visitor tries to activate demo service with live demo prefix', async () => {
      vi.spyOn(repository, 'getDeal').mockResolvedValue(null);
      vi.mocked(cookies).mockResolvedValue({ get: () => undefined } as any);

      await expect(
        DealRoomPage({
          params: Promise.resolve({ dealId: 'deal-offer-live-cabai-123' }),
          searchParams: Promise.resolve({}),
        })
      ).rejects.toThrow('not-found');
    });

    it('returns not-found when unrelated authenticated user tries to access live demo prefix', async () => {
      vi.spyOn(repository, 'getDeal').mockResolvedValue(null);
      vi.mocked(cookies).mockResolvedValue({ get: (name: string) => name === 'mock_actor' ? { value: 'buyer-jakarta-trader' } : undefined } as any);

      await expect(
        DealRoomPage({
          params: Promise.resolve({ dealId: 'deal-offer-live-cabai-123' }),
          searchParams: Promise.resolve({}),
        })
      ).rejects.toThrow('not-found');
    });

    it('returns not-found when repository returns null and unauthenticated user visits demo URL', async () => {
      vi.spyOn(repository, 'getDeal').mockResolvedValue(null);
      vi.mocked(cookies).mockResolvedValue({ get: () => undefined } as any);

      await expect(
        DealRoomPage({
          params: Promise.resolve({ dealId: 'demo-cabai-001' }),
          searchParams: Promise.resolve({}),
        })
      ).rejects.toThrow('not-found');
    });

    it('demo buyer resolves buyer actor and shows buyer action area when state allows', async () => {
      // We mock the deal to be LOCKED so we can see the role-specific EscrowTimeline text
      // without being blocked by the Wallet Funding Panel loading state.
      const { demoDbDeals } = await import('@/lib/demo/demo-data');
      const demoDeal = demoDbDeals['demo-cabai-001'];
      vi.spyOn(repository, 'getDeal').mockResolvedValue({ ...demoDeal, status: 'LOCKED' } as any);
      vi.mocked(cookies).mockResolvedValue({ get: (name: string) => name === 'mock_actor' ? { value: 'buyer-surabaya-restaurant' } : undefined } as any);

      const element = await DealRoomPage({
        params: Promise.resolve({ dealId: 'demo-cabai-001' }),
        searchParams: Promise.resolve({ demo: '1', role: 'buyer' }),
      });
      const html = renderToString(element);
      expect(html).toContain('Wait for the seller to submit delivery proof');
    });

    it('demo seller resolves seller actor and shows seller action area when state allows', async () => {
      const { demoDbDeals } = await import('@/lib/demo/demo-data');
      const demoDeal = demoDbDeals['demo-cabai-001'];
      vi.spyOn(repository, 'getDeal').mockResolvedValue({ ...demoDeal, status: 'LOCKED' } as any);
      vi.mocked(cookies).mockResolvedValue({ get: (name: string) => name === 'mock_actor' ? { value: 'seller-probolinggo-cabai' } : undefined } as any);

      const element = await DealRoomPage({
        params: Promise.resolve({ dealId: 'demo-cabai-001' }),
        searchParams: Promise.resolve({ demo: '1', role: 'seller' }),
      });
      const html = renderToString(element);
      expect(html).toContain('Submit your delivery proof and mark the milestone');
    });
  });
});

