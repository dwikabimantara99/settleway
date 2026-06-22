import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import DemoPage from './page';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  })),
}));

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    useState: (initial: unknown) => [initial, vi.fn()],
  };
});

describe('Demo Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the founder-facing dashboard structure', () => {
    const html = renderToString(DemoPage());

    expect(html).toContain('Guided founder demo corridor');
    expect(html).toContain('Demo Controls');
    expect(html).toContain('Quick Jumps');
    expect(html).toContain('Presentation Route');
    expect(html).toContain('Talk Track Anchors');
    expect(html).toContain('Trust Checkpoints');
    expect(html).toContain('Honesty Boundaries');
    expect(html).toContain('Closing Line');
  });

  it('keeps the canonical demo corridor and trust narrative visible', () => {
    const html = renderToString(DemoPage());

    expect(html).toContain('Show negotiation before money');
    expect(html).toContain('Open Deal Room is mutual commitment');
    expect(html).toContain('Local-bank funding remains simulated in this MVP.');
    expect(html).toContain('Stellar-backed trust references');
    expect(html).toContain('Notifications');
    expect(html).toContain('Negotiation Thread');
    expect(html).toContain('Active Deal Room');
    expect(html).toContain('Start From Landing Page');
    expect(html).toContain(
      'Settleway helps real commodity buyers and sellers move from discovery to settlement',
    );
  });
});
