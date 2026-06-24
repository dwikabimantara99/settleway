import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import BuyerRequestDetailPage from './page';

describe('BuyerRequestDetailPage', () => {
  it('keeps the Sell opportunity path explicit and pre-deal first', async () => {
    const html = renderToString(
      await BuyerRequestDetailPage({
        params: Promise.resolve({ requestId: 'req-spice-001' }),
      }),
    );

    expect(html).toContain('Buyer request');
    expect(html).toContain('Offer first, Deal Room later');
    expect(html).toContain('Submit Offer');
    expect(html).toContain('recorded negotiation');
  });
});
