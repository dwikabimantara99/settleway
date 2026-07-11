import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { RoleSwitcher } from './RoleSwitcher';

// Mock Next.js navigation hooks
vi.mock('next/navigation', () => ({
  usePathname: () => '/home',
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

describe('RoleSwitcher', () => {
  it('does not render by default in demo mode if devRoleSwitcher is not set', () => {
    // We run in jsdom environment for this if we were fully mounting,
    // but in SSR string render without cookies/search params it will be null.
    const html = renderToString(<RoleSwitcher />);
    expect(html).toBe('');
  });
});
