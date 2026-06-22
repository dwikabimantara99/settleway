import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import LandingPage from './page';

describe('Landing Page', () => {
  it('renders the approved hero, CTA row, and trust highlights', () => {
    const html = renderToString(LandingPage());

    expect(html).toContain('Settleway');
    expect(html).toContain('Agricultural trade,');
    expect(html).toContain('from discovery to settlement.');
    expect(html).toContain(
      'Settleway is a secure marketplace and settlement flow for agricultural commodity',
    );
    expect(html).toContain('Explore Marketplace');
    expect(html).toContain('Learn How It Works');
    expect(html).toContain('Protected Trade Flow');
    expect(html).toContain('Recorded &amp; Verifiable');
    expect(html).toContain('Built on Trust');
  });

  it('keeps the restored below-fold product story available', () => {
    const html = renderToString(LandingPage());

    expect(html).toContain('id="about"');
    expect(html).toContain('The Problem');
    expect(html).toContain('What Settleway Makes Possible');
    expect(html).toContain('The Corridor');
    expect(html).toContain('Why Stellar Stays Mostly Invisible');
    expect(html).toContain(
      'Settleway brings negotiation, escrow protection, delivery proof, and reputation into one workspace.',
    );
  });
});
