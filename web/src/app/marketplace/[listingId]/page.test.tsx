import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
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
    expect(html).toContain('href="/offers/new?listingId=listing-cabai-001"');
  });

  it('points Submit Offer to demo negotiation room when demo mode is active', async () => {
    const html = renderToString(
      await ListingDetailPage({
        params: Promise.resolve({ listingId: 'listing-cabai-001' }),
        searchParams: Promise.resolve({ demo: '1' }),
      }),
    );

    expect(html).toContain('href="/offers/offer-demo-cabai-001?demo=1"');
  });
});
