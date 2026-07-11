import { describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { DealTermsActionButton } from './DealTermsActionButton';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    refresh: vi.fn(),
  })),
}));

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    useState: (initial: unknown) => [initial, vi.fn()],
  };
});

describe('DealTermsActionButton', () => {
  it('shows accept offer inside the deal terms card before agreement', () => {
    const html = renderToString(
      DealTermsActionButton({
        offerId: 'offer-1',
        canAcceptTerms: true,
        termsAccepted: false,
        hasOpened: false,
        activeDealId: null,
      }),
    );

    expect(html).toContain('Accept Terms');
  });
});
