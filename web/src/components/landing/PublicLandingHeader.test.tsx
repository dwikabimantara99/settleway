import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { PublicLandingHeader } from './PublicLandingHeader';

describe('PublicLandingHeader', () => {
  it('renders the product-driven public navigation and functional marketplace routes', () => {
    const html = renderToString(<PublicLandingHeader initialMarketplaceOpen />);

    expect(html).toContain('Marketplace');
    expect(html).toContain('Buy commodities');
    expect(html).toContain('href="/marketplace"');
    expect(html).toContain('Sell to verified demand');
    expect(html).toContain('href="/buyer-requests"');
    expect(html).toContain('How It Works');
    expect(html).toContain('href="#how-it-works"');
    expect(html).toContain('Trust &amp; Settlement');
    expect(html).toContain('href="#trust-settlement"');
    expect(html).toContain('Login');
    expect(html).not.toContain('Get Started');
  });

  it('opens the single provider-selection dialog without inventing provider success', () => {
    const html = renderToString(<PublicLandingHeader initialModalOpen />);

    expect(html).toContain('role="dialog"');
    expect(html).toContain('Continue with Google');
    expect(html).toContain('Connect Stellar Wallet');
    expect(html).toContain('Protected by design');
  });
});
