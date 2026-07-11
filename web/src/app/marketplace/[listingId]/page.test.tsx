import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth/server', () => ({
  getCurrentUser: vi.fn().mockResolvedValue(null),
}));
import ListingDetailPage from './page';

describe('ListingDetailPage', () => {
  it('renders a seller-written description before offer submission', async () => {
    const html = renderToString(
      await ListingDetailPage({
        params: Promise.resolve({ listingId: 'listing-cabai-001' }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(html).toContain('Seller Description');
    expect(html).toContain('What to clarify next');
    expect(html).toContain('Submit Offer');
    expect(html).toContain('recorded negotiation');
    // For unauthenticated and non-demo mode, defaults to demo chooser login
    expect(html).toContain('href="/#settleway-demo-chooser"');
    expect(html).not.toContain('href="/deals/');
    expect(html).not.toContain('href="/profiles/');
  });

  it('points Submit Offer to demo negotiation room when demo mode is active with role buyer', async () => {
    const html = renderToString(
      await ListingDetailPage({
        params: Promise.resolve({ listingId: 'listing-cabai-001' }),
        searchParams: Promise.resolve({ demo: '1', role: 'buyer' }),
      }),
    );

    expect(html).toContain('href="/offers/new?listingId=listing-cabai-001&amp;demo=1&amp;role=buyer"');
    expect(html).not.toContain('href="/offers/offer-demo-cabai-001');
    expect(html).not.toContain('href="/deals/');
    expect(html).not.toContain('href="/profiles/');
  });

  it('points Submit Offer to demo negotiation room defaulting to buyer when role is missing', async () => {
    const html = renderToString(
      await ListingDetailPage({
        params: Promise.resolve({ listingId: 'listing-cabai-001' }),
        searchParams: Promise.resolve({ demo: '1' }),
      }),
    );

    expect(html).toContain('href="/offers/new?listingId=listing-cabai-001&amp;demo=1&amp;role=buyer"');
    expect(html).not.toContain('href="/offers/offer-demo-cabai-001');
    expect(html).not.toContain('href="/deals/');
    expect(html).not.toContain('href="/profiles/');
  });
});
