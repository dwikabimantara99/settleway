import { useRouter } from 'next/navigation';
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

  it('buyer agreed offer links to /deals/demo-cabai-001?demo=1&role=buyer', () => {
    const mockPush = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ push: mockPush } as unknown as ReturnType<typeof useRouter>);

    const element = OpenDealRoomButton({
      offerId: 'offer-1',
      hasOpened: true,
      activeDealId: 'demo-cabai-001',
      isDemo: true,
      role: 'buyer'
    }) as React.ReactElement<unknown>;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const button = (element.props as any).children[0];
    button.props.onClick();

    expect(mockPush).toHaveBeenCalledWith('/deals/demo-cabai-001?demo=1&role=buyer');
  });

  it('seller agreed offer links to /deals/demo-cabai-001?demo=1&role=seller', () => {
    const mockPush = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ push: mockPush } as unknown as ReturnType<typeof useRouter>);

    const element = OpenDealRoomButton({
      offerId: 'offer-1',
      hasOpened: true,
      activeDealId: 'demo-cabai-001',
      isDemo: true,
      role: 'seller'
    }) as React.ReactElement<unknown>;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const button = (element.props as any).children[0];
    button.props.onClick();

    expect(mockPush).toHaveBeenCalledWith('/deals/demo-cabai-001?demo=1&role=seller');
  });
});
