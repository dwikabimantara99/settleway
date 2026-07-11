import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import NewOfferPage from './page';

import { vi } from 'vitest';
import { redirect } from 'next/navigation';
import { repository } from '@/lib/repositories';
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
  })),
  redirect: vi.fn(),
}));

vi.mock('@/lib/auth/server', () => ({
  getCurrentUser: vi.fn(async () => ({ id: 'buyer-surabaya-restaurant' })),
}));

describe('New Offer Page', () => {
  it('presents offer creation as the start of a negotiation conversation', async () => {
    const html = renderToString(
      await NewOfferPage({
        searchParams: Promise.resolve({ listingId: 'listing-cabai-001' }),
      }),
    );

    expect(html).toContain('This is the recorded negotiation area.');
    expect(html).toContain('Pre-Deal Negotiation');
    expect(html).toContain('Indicative baseline:');
    expect(html).toContain('Recorded Negotiation');
    expect(html).toContain('Deal Terms');
    expect(html).toContain('Submit Offer');
  });

  it('renders demo fallback when repository returns null in demo mode', async () => {
    vi.spyOn(repository, 'getListing').mockResolvedValueOnce(null);
    const html = renderToString(
      await NewOfferPage({
        searchParams: Promise.resolve({ listingId: 'listing-cabai-001', demo: '1', role: 'buyer' }),
      }),
    );

    expect(html).toContain('Recorded Negotiation');
    expect(html).toContain('Submit Offer');
    expect(html).not.toContain('Commitment Gate');
    expect(html).not.toContain('Activation Reminder');
  });

  it('redirects for unknown listing in non-demo mode when repository returns null', async () => {
    vi.spyOn(repository, 'getListing').mockResolvedValueOnce(null);
    renderToString(
      await NewOfferPage({
        searchParams: Promise.resolve({ listingId: 'listing-cabai-999' }),
      }),
    );
    expect(redirect).toHaveBeenCalledWith('/marketplace');
  });
});
