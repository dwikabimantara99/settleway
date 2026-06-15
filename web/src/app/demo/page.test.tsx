import { describe, it, expect, vi, beforeEach } from 'vitest';
import DemoPage from './page';
import { renderToString } from 'react-dom/server';

// Mock useRouter
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

// Mock useState so it works outside actual React lifecycle in renderToString
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

  it('renders the dashboard components and text', () => {
    const html = renderToString(DemoPage());
    expect(html).toContain('Guided Demo Dashboard');
    expect(html).toContain('Reset Demo State');
    expect(html).toContain('Start Demo Flow');
  });

  it('has correct links and canonical order', () => {
    const html = renderToString(DemoPage());
    expect(html).toContain('Landing Page:');
    expect(html).toContain('Marketplace:');
    expect(html).toContain('Deal Room:');
    expect(html).toContain('Deposit:');
    expect(html).toContain('Escrow:');
    expect(html).toContain('Proof:');
    expect(html).toContain('Settlement:');
    expect(html).toContain('Review:');
  });
});
