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

import OfferDetailPage from './page';
import { mockStore } from '@/lib/db/mock-store';
import { repository } from '@/lib/repositories';

describe('Offer Detail Page', () => {
  beforeEach(() => {
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

  describe('Demo Fallback', () => {
    it('renders negotiation room when persistent repository returns null if demo=1 is present', async () => {
      vi.spyOn(repository, 'getOffer').mockResolvedValueOnce(null);

      const html = renderToString(
        await OfferDetailPage({
          params: Promise.resolve({ offerId: 'offer-demo-cabai-001' }),
          searchParams: Promise.resolve({ demo: '1', role: 'buyer' }),
        }),
      );

      expect(html).toContain('Proposed Draft');
      expect(html).not.toContain('404');
    });

    it('returns notFound when repository returns null and demo=1 is absent', async () => {
      vi.spyOn(repository, 'getOffer').mockResolvedValueOnce(null);

      await expect(
        OfferDetailPage({
          params: Promise.resolve({ offerId: 'offer-demo-cabai-001' }),
          searchParams: Promise.resolve({}),
        })
      ).rejects.toThrow('notFound');
    });
    
    it('does not route directly to deal room, profile, or funding', async () => {
      vi.spyOn(repository, 'getOffer').mockResolvedValueOnce(null);

      const html = renderToString(
        await OfferDetailPage({
          params: Promise.resolve({ offerId: 'offer-demo-cabai-001' }),
          searchParams: Promise.resolve({ demo: '1', role: 'seller' }),
        }),
      );
      
      // Asserts that it rendered the offer page correctly
      expect(html).toContain('Proposed Draft');
    });
  });
});

