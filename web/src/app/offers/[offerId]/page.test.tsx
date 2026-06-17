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
    expect(html).toContain('Terms must be accepted first,');
    expect(html).toContain('Deal Terms');
    expect(html).toContain(
      'One commitment click is only a signal. The second confirmed click activates the active escrow room and opens the deposit window.',
    );
    expect(html).toContain('Enter Active Escrow Room');
  });

  it('presents the offer thread as a shared negotiation conversation', async () => {
    const html = renderToString(
      await OfferDetailPage({
        params: Promise.resolve({ offerId: 'offer-demo-cabai-001' }),
      }),
    );

    expect(html).toContain('Buyer and seller exchange messages here before either side opens the protected');
    expect(html).toContain('Recorded messages');
    expect(html).toContain('Type a message...');
    expect(html).toContain('aria-label="Send message"');
    expect(html).toContain('Wed 17 Jun');
    expect(html).toContain('Terms note');
  });
});
