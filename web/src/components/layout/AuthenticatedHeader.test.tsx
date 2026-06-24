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
    expect(html).toContain('aria-label="Notifications"');
    expect(html).not.toContain('>Notifications</a>');
  });
});
