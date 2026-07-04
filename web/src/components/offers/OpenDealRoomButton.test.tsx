import { describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { OpenDealRoomButton } from './OpenDealRoomButton';

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

describe('OpenDealRoomButton', () => {
  it('shows the waiting state copy after the user has already opened the room', () => {
    const html = renderToString(
      OpenDealRoomButton({
        offerId: 'offer-1',
        hasOpened: true,
        activeDealId: null,
      }),
    );

    expect(html).toContain('Waiting for Counterparty Commitment');
  });

  it('allows retrying room creation after both parties opened but no active room exists yet', () => {
    const html = renderToString(
      OpenDealRoomButton({
        offerId: 'offer-1',
        hasOpened: true,
        bothOpened: true,
        activeDealId: null,
      }),
    );

    expect(html).toContain('Open Deal Room');
    expect(html).not.toContain('disabled=""');
  });

  it('shows the active-room CTA after activation', () => {
    const html = renderToString(
      OpenDealRoomButton({
        offerId: 'offer-1',
        hasOpened: true,
        activeDealId: 'deal-1',
      }),
    );

    expect(html).toContain('Enter Active Escrow Room');
  });
});
