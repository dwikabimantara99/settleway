import { describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { AuthenticatedHeader } from './AuthenticatedHeader';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/marketplace'),
}));

describe('AuthenticatedHeader', () => {
  it('keeps notifications as a bell action instead of a text navigation item', () => {
    const html = renderToString(<AuthenticatedHeader />);

    expect(html).toContain('Buy');
    expect(html).toContain('Sell');
    expect(html).toContain('Deals');
    expect(html).toContain('Funding');
    expect(html).toContain('aria-label="Notifications"');
    expect(html).not.toContain('>Notifications</a>');
  });

  it('does not render public-only nav clutter', () => {
    const html = renderToString(<AuthenticatedHeader />);
    expect(html).not.toContain('How It Works');
    expect(html).not.toContain('Trust &amp; Settlement');
    expect(html).not.toContain('Demo');
    expect(html).not.toContain('Choose a Demo Role');
  });
});
