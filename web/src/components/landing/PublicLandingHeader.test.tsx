import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { PublicLandingHeader } from './PublicLandingHeader';

describe('PublicLandingHeader', () => {
  it('renders the product-driven public navigation and functional marketplace routes', () => {
    const html = renderToString(<PublicLandingHeader initialMarketplaceOpen />);

    expect(html).toContain('Marketplace');
    expect(html).toContain('Buy');
    expect(html).toContain('href="/marketplace"');
    expect(html).toContain('Review verified agricultural supply.');
    expect(html).toContain('Sell');
    expect(html).toContain('href="/buyer-requests"');
    expect(html).toContain('Respond to active buyer requirements.');
    expect(html).not.toContain('Buy commodities');
    expect(html).not.toContain('Sell to verified demand');
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
    expect(html).toContain('Protected by design');
  });
});
