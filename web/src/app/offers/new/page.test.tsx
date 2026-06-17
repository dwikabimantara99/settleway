import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import NewOfferPage from './page';

import { vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
  })),
  redirect: vi.fn(),
}));

describe('New Offer Page', () => {
  it('presents offer creation as the start of a negotiation conversation', async () => {
    const html = renderToString(
      await NewOfferPage({
        searchParams: Promise.resolve({ listingId: 'listing-cabai-001' }),
      }),
    );

    expect(html).toContain('Negotiate here first, then submit the commercial terms from the Deal Terms card.');
    expect(html).toContain('Pre-Deal Negotiation');
    expect(html).toContain('Indicative baseline:');
    expect(html).toContain('Submit Offer');
  });
});
