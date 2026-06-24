import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import ListingDetailPage from './page';

describe('ListingDetailPage', () => {
  it('renders a seller-written description before offer submission', async () => {
    const html = renderToString(
      await ListingDetailPage({
        params: Promise.resolve({ listingId: 'listing-cabai-001' }),
      }),
    );

    expect(html).toContain('Seller Description');
    expect(html).toContain('What to clarify next');
    expect(html).toContain('Submit Offer');
    expect(html).toContain('recorded negotiation');
  });
});
