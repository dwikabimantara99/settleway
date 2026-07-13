/* eslint-disable */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import * as nextHeaders from 'next/headers';

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

vi.mock('next/navigation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/navigation')>();
  return {
    ...actual,
    useRouter: vi.fn(() => ({
      push: vi.fn(),
      refresh: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
    })),
    notFound: vi.fn(() => {
      throw new Error('notFound');
    }),
  };
});

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

vi.mock('@/lib/offers/demo-service', () => ({
  getDemoOffer: vi.fn(),
}));

import OfferDetailPage from './page';
import { mockStore } from '@/lib/db/mock-store';
import { getCurrentUser } from '@/lib/auth/server';
import { getDemoOffer } from '@/lib/offers/demo-service';
import { repository } from '@/lib/repositories';

describe('Offer Detail Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDemoOffer).mockResolvedValue(null);
    mockStore.seed();
    vi.mocked(nextHeaders.cookies).mockResolvedValue({
      get: (name: string) =>
        name === 'mock_actor' ? { value: 'buyer-surabaya-restaurant' } : undefined,
    } as never);
  });

  it('keeps navigation and activation guidance aligned with the corridor', async () => {
    const html = renderToString(
      await OfferDetailPage({
        params: Promise.resolve({ offerId: 'offer-demo-cabai-001' }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(html).toContain('Back to notifications');
    expect(html).toContain('Back to source listing');
    expect(html).toContain('Commercial terms are aligned. Review the agreement summary below.');
    expect(html).toContain('Agreed Deal Terms');
    expect(html).toContain(
      'Settleway checks the buyer and seller Testnet wallets before creating the Custody V2 Deal Room',
    );
    expect(html).toContain('Wallet Binding');
    expect(html).toContain('Enter Active Escrow Room');
  });

  it('presents the agreed offer as a locked recorded conversation', async () => {
    const html = renderToString(
      await OfferDetailPage({
        params: Promise.resolve({ offerId: 'offer-demo-cabai-001' }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(html).toContain('Recorded Conversation History');
    expect(html).toContain('Conversation Locked');
    expect(html).toContain('View Full Conversation');
    expect(html).toContain('Wed 17 Jun');
    expect(html).toContain('Agreed Points');
  });

  describe('Demo Authorization and Fallback', () => {
    it('returns notFound when unauthenticated visitor tries to activate demo service with ?demo=1', async () => {
      vi.spyOn(repository, 'getOffer').mockResolvedValueOnce(null);
      vi.mocked(nextHeaders.cookies).mockImplementationOnce(async () => ({ get: () => undefined } as any));

      await expect(
        OfferDetailPage({
          params: Promise.resolve({ offerId: 'offer-demo-cabai-001' }),
          searchParams: Promise.resolve({ demo: '1', role: 'buyer' }),
        })
      ).rejects.toThrow('notFound');
    });

    it('returns notFound when unauthenticated visitor tries to activate demo service with live demo prefix', async () => {
      vi.spyOn(repository, 'getOffer').mockResolvedValueOnce(null);
      vi.mocked(nextHeaders.cookies).mockImplementationOnce(async () => ({ get: () => undefined } as any));

      await expect(
        OfferDetailPage({
          params: Promise.resolve({ offerId: 'offer-live-cabai-123' }),
          searchParams: Promise.resolve({}),
        })
      ).rejects.toThrow('notFound');
    });

    it('returns notFound when unrelated authenticated user tries to access live demo prefix', async () => {
      vi.spyOn(repository, 'getOffer').mockResolvedValueOnce(null);
      vi.mocked(nextHeaders.cookies).mockImplementationOnce(async () => ({ get: (name: string) => name === 'mock_actor' ? { value: 'buyer-jakarta-trader' } : undefined } as any));

      await expect(
        OfferDetailPage({
          params: Promise.resolve({ offerId: 'offer-live-cabai-123' }),
          searchParams: Promise.resolve({}),
        })
      ).rejects.toThrow('notFound');
    });

    it('returns notFound when repository returns null and unauthenticated user visits demo URL', async () => {
      vi.spyOn(repository, 'getOffer').mockResolvedValueOnce(null);
      vi.mocked(nextHeaders.cookies).mockImplementationOnce(async () => ({ get: () => undefined } as any));

      await expect(
        OfferDetailPage({
          params: Promise.resolve({ offerId: 'offer-demo-cabai-001' }),
          searchParams: Promise.resolve({}),
        })
      ).rejects.toThrow('notFound');
    });

    it('allows approved buyer participant to read native offer URL without demo=1', async () => {
      vi.spyOn(repository, 'getOffer').mockResolvedValueOnce(null);
      vi.mocked(nextHeaders.cookies).mockImplementationOnce(async () => ({ get: (name: string) => name === 'mock_actor' ? { value: 'buyer-surabaya-restaurant' } : undefined } as any));

      const html = renderToString(
        await OfferDetailPage({
          params: Promise.resolve({ offerId: 'offer-demo-cabai-001' }),
          searchParams: Promise.resolve({ stage: 'open' }), // Using stage parameter solely for UI state as allowed
        }),
      );
      expect(html).toContain('The offer has been submitted.');
    });
    
    it('allows approved seller participant to read native offer URL without demo=1', async () => {
      vi.spyOn(repository, 'getOffer').mockResolvedValueOnce(null);
      vi.mocked(nextHeaders.cookies).mockImplementationOnce(async () => ({ get: (name: string) => name === 'mock_actor' ? { value: 'seller-probolinggo-cabai' } : undefined } as any));

      const html = renderToString(
        await OfferDetailPage({
          params: Promise.resolve({ offerId: 'offer-demo-cabai-001' }),
          searchParams: Promise.resolve({ stage: 'review' }),
        }),
      );
      
      expect(html).toContain('Accept Terms');
      expect(html).not.toContain('404');
    });

    it('returns notFound when approved demo actor is not a participant in the exact offer', async () => {
      // Mock an offer that doesn't belong to the demo actor
      const mockOffer = {
        id: 'offer-live-cabai-other',
        buyer_id: 'buyer-other',
        seller_id: 'seller-other',
        listing_id: 'listing-1',
        commodity: 'Red Chili',
        status: 'pending',
        quantity: 100,
        price: 1000,
        currency: 'IDR',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      vi.spyOn(repository, 'getOffer').mockResolvedValueOnce(mockOffer as any);
      vi.mocked(getDemoOffer).mockResolvedValueOnce(mockOffer as any);

      vi.mocked(nextHeaders.cookies).mockImplementationOnce(async () => ({ get: (name: string) => name === 'mock_actor' ? { value: 'buyer-surabaya-restaurant' } : undefined } as any));

      await expect(
        OfferDetailPage({
          params: Promise.resolve({ offerId: 'offer-live-cabai-other' }),
          searchParams: Promise.resolve({}),
        })
      ).rejects.toThrow('notFound');
    });
  });
});

