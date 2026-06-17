import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import LandingPage from './page';

describe('Landing Page', () => {
  it('renders the founder-facing product story and demo corridor', () => {
    const html = renderToString(LandingPage());

    expect(html).toContain('Agricultural trade infrastructure');
    expect(html).toContain(
      'Settleway turns commodity trade from blind trust into disciplined execution.',
    );
    expect(html).toContain('Protected trade flow');
    expect(html).toContain('What Settleway makes possible');
    expect(html).toContain(
      'Settleway transactions are protected by escrow logic and recorded on Stellar.',
    );
  });

  it('keeps the main workflow and CTAs visible', () => {
    const html = renderToString(LandingPage());

    expect(html).toContain('1. Discover');
    expect(html).toContain('3. Submit offer');
    expect(html).toContain('4. Open Deal Room together');
    expect(html).toContain('View Marketplace');
    expect(html).toContain('Explore Guided Flow');
    expect(html).toContain(
      'Settleway brings negotiation, escrow protection, delivery proof, and reputation into one transaction workspace.',
    );
  });
});
