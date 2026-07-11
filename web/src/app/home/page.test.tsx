import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import HomePage from './page';

describe('HomePage', () => {
  it('renders role-aware buyer guidance when role is buyer', () => {
    const searchParams = { demo: '1', role: 'buyer' };
    const html = renderToString(<HomePage searchParams={searchParams} />);

    expect(html).toContain('Buyer Demo Walkthrough');
    expect(html).toContain('Browse Supply');
    expect(html).toContain('href="/marketplace?demo=1&amp;role=buyer"');
    expect(html).toContain('href="/buyer-requests?demo=1&amp;role=buyer"');
    expect(html).toContain('href="/deals?demo=1&amp;role=buyer"');
    expect(html).toContain('href="/funding?demo=1&amp;role=buyer"');
  });

  it('renders role-aware seller guidance when role is seller', () => {
    const searchParams = { demo: '1', role: 'seller' };
    const html = renderToString(<HomePage searchParams={searchParams} />);

    expect(html).toContain('Seller Demo Walkthrough');
    expect(html).toContain('Review Demand');
    expect(html).toContain('href="/marketplace?demo=1&amp;role=seller"');
  });

  it('renders generic guidance for non-demo users', () => {
    const searchParams = {};
    const html = renderToString(<HomePage searchParams={searchParams} />);

    expect(html).not.toContain('Buyer Demo Walkthrough');
    expect(html).not.toContain('Seller Demo Walkthrough');
    expect(html).toContain('Welcome to Settleway');
    expect(html).toContain('href="/marketplace"');
  });
});
