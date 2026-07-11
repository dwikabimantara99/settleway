import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { PublicLandingHeader } from './PublicLandingHeader';

describe('PublicLandingHeader', () => {
  it('renders the product-driven public navigation without marketplace clutter', () => {
    const html = renderToString(<PublicLandingHeader initialDemoOpen />);

    expect(html).not.toContain('Marketplace');
    expect(html).not.toContain('href="/marketplace"');
    expect(html).not.toContain('href="/buyer-requests"');
    expect(html).not.toContain('href="/deals"');

    expect(html).toContain('How It Works');
    expect(html).toContain('href="#how-it-works"');
    expect(html).toContain('Trust &amp; Settlement');
    expect(html).toContain('href="#trust-settlement"');
    expect(html).toContain('Demo');
    expect(html).toContain('Login');
  });

  it('opens the demo chooser modal with correct cards', () => {
    const html = renderToString(<PublicLandingHeader initialDemoOpen />);

    expect(html).toContain('Choose a Demo Role');
    expect(html).toContain('Try as Buyer');
    expect(html).toContain('href="/home?demo=1&amp;role=buyer"');
    expect(html).toContain('Try as Seller');
    expect(html).toContain('href="/home?demo=1&amp;role=seller"');
    expect(html).not.toContain('View Reputation Profile');
    expect(html).not.toContain('href="/profiles/seller-probolinggo-cabai?demo=1"');
  });

  it('opens the single provider-selection dialog without inventing provider success', () => {
    const html = renderToString(<PublicLandingHeader initialModalOpen />);

    expect(html).toContain('role="dialog"');
    expect(html).toContain('Continue with Google');
    expect(html).toContain('Protected by design');
  });
});
