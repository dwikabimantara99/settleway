import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import LandingPage from './page';

describe('Landing Page', () => {
  it('renders the approved Aurora hero and product-specific entry actions', () => {
    const html = renderToString(LandingPage());

    expect(html).toContain('Trade with commitment on both sides.');
    expect(html).toContain(
      'Discover supply and demand, negotiate commercial terms, secure buyer principal',
    );
    expect(html).toContain('Explore Marketplace');
    expect(html).toContain('See How It Works');
    expect(html).toContain('Buyer assurance');
    expect(html).toContain('Principal + commitment bond');
    expect(html).toContain('Seller assurance');
    expect(html).toContain('Performance bond');
    expect(html).toContain('Commercial terms locked by both sides');
    expect(html).toContain('Evidence verification');
    expect(html).toContain('Stellar-backed settlement');
    expect(html).not.toContain('Rp 19.950.000');
    expect(html).not.toContain('Rp 997.500');
  });

  it('keeps capability, workflow, and settlement truth available below the fold', () => {
    const html = renderToString(LandingPage());

    expect(html).toContain('id="capabilities"');
    expect(html).toContain('Discover Supply');
    expect(html).toContain('Post Buyer Demand');
    expect(html).toContain('id="how-it-works"');
    expect(html).toContain('Both Commit');
    expect(html).toContain('id="trust-settlement"');
    expect(html).toContain('Stellar Testnet honesty');
  });
});
