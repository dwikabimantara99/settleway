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
});
