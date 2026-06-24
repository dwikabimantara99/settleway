import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Footer } from './Footer';

describe('Footer', () => {
  it('uses concise Aurora marketplace labels', () => {
    const html = renderToString(<Footer />);

    expect(html).toContain('Buy');
    expect(html).toContain('Sell');
    expect(html).not.toContain('Buy commodities');
    expect(html).not.toContain('Sell to demand');
  });
});
