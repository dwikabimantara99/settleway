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
      }),
    );

    expect(html).toContain('Back to notifications');
    expect(html).toContain('Back to source listing');
    expect(html).toContain('Commercial terms are aligned. Review the agreement summary below.');
    expect(html).toContain('Agreed Deal Terms');
    expect(html).toContain(
      'One commitment click is only a signal. The second confirmation activates the escrow',
    );
    expect(html).toContain('Enter Active Escrow Room');
  });

  it('presents the agreed offer as a locked recorded conversation', async () => {
    const html = renderToString(
      await OfferDetailPage({
        params: Promise.resolve({ offerId: 'offer-demo-cabai-001' }),
      }),
    );

    expect(html).toContain('Recorded Conversation History');
    expect(html).toContain('Conversation Locked');
    expect(html).toContain('View Full Conversation');
    expect(html).toContain('Wed 17 Jun');
    expect(html).toContain('Agreed Points');
  });
});
