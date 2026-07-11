import { describe, expect, it, vi } from 'vitest';
import { useRouter } from 'next/navigation';
import { renderToString } from 'react-dom/server';
import { CreateOfferComposer } from './CreateOfferComposer';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
  })),
}));

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    useState: (initialArg: unknown) => {
      const initial = typeof initialArg === 'function' ? initialArg() : initialArg;
      if (Array.isArray(initial)) return [[{ id: '1', authorId: 'buyer-surabaya-restaurant', body: 'msg', createdAt: '2026-01-01T00:00:00.000Z', readBy: [] }], vi.fn()];
      if (typeof initial === 'string') {
        if (initial === '') return ['', vi.fn()];
        if (initial.includes('-')) return ['2026-01-01', vi.fn()];
        return [initial, vi.fn()];
      }
      return [initial, vi.fn()];
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useMemo: (fn: any) => fn(),
    useEffect: vi.fn(),
  };
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findButton(element: any): any {
  if (!element || !element.props) return null;
  if (element.props.onClick && typeof element.props.children === 'string' && element.props.children.includes('Submit')) {
    return element;
  }
  const children = element.props.children;
  if (Array.isArray(children)) {
    for (const child of children) {
      const found = findButton(child);
      if (found) return found;
    }
  } else if (typeof children === 'object') {
    return findButton(children);
  }
  return null;
}

describe('CreateOfferComposer', () => {
  it('renders submit-offer terms editing in English for the demo corridor', () => {
    const html = renderToString(
      <CreateOfferComposer
        listingId="listing-cabai-001"
        initialVolumeKg={700}
        initialPricePerKgIdr={28500}
        commodity="Red Chili (Bird's Eye Chili)"
        counterpartyName="Probolinggo Farmer Group"
        counterpartyRoleLabel="Aggregator & Farmer Group"
        counterpartyLocation="Probolinggo, East Java"
        counterpartyScore={92}
        counterpartyKind="seller"
        currentActorId="buyer-surabaya-restaurant"
      />,
    );

    expect(html).toContain('Deal Terms');
    expect(html).toContain('Volume (kg)');
    expect(html).toContain('Price per kg (IDR)');
    expect(html).toContain('Delivery deadline');
    expect(html).toContain('Submit Offer');
  });

  it('keeps the composer natural and chat-like', () => {
    const html = renderToString(
      <CreateOfferComposer
        listingId="listing-cabai-001"
        initialVolumeKg={700}
        initialPricePerKgIdr={28500}
        commodity="Red Chili (Bird's Eye Chili)"
        counterpartyName="Probolinggo Farmer Group"
        counterpartyRoleLabel="Aggregator & Farmer Group"
        counterpartyLocation="Probolinggo, East Java"
        counterpartyScore={92}
        counterpartyKind="seller"
        currentActorId="buyer-surabaya-restaurant"
      />,
    );

    expect(html).toContain('Probolinggo Farmer Group');
    expect(html).toContain('Ask for recent photos');
    expect(html).toContain('Write a message...');
    expect(html).toContain('aria-label="Send message"');
    expect(html).toContain('fresh-chili-lot.jpg');
    expect(html).toContain('quality-check.pdf');
    expect(html).toContain('packing-walkthrough.mp4');
    expect(html).toContain('Terms note');
    expect(html).not.toContain('Attachments (3)');
    expect(html).not.toContain('Shared negotiation panel');
  });

  it('CreateOfferComposer demo submit routes to /offers/offer-demo-cabai-001?demo=1&role=buyer&stage=open', async () => {
    const mockPush = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ push: mockPush } as unknown as ReturnType<typeof useRouter>);

    const element = CreateOfferComposer({
      listingId: 'listing-cabai-001',
      initialVolumeKg: 700,
      initialPricePerKgIdr: 28500,
      commodity: 'Red Chili',
      counterpartyName: 'Seller',
      counterpartyRoleLabel: 'Seller',
      counterpartyLocation: 'Loc',
      counterpartyScore: 100,
      counterpartyKind: 'seller',
      currentActorId: 'buyer-surabaya-restaurant',
      isDemo: true,
      role: 'buyer'
    }) as React.ReactElement<unknown>;

    const button = findButton(element);
    expect(button).not.toBeNull();
    await button.props.onClick();

    expect(mockPush).toHaveBeenCalledWith('/offers/offer-demo-cabai-001?demo=1&role=buyer&stage=open');
  });

  it('non-demo CreateOfferComposer still uses POST /api/offers', async () => {
    const mockPush = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ push: mockPush } as unknown as ReturnType<typeof useRouter>);
    
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, data: { redirect_to: '/offers/offer-123' } })
    });
    global.fetch = mockFetch as unknown as typeof fetch;

    const element = CreateOfferComposer({
      listingId: 'listing-cabai-001',
      initialVolumeKg: 700,
      initialPricePerKgIdr: 28500,
      commodity: 'Red Chili',
      counterpartyName: 'Seller',
      counterpartyRoleLabel: 'Seller',
      counterpartyLocation: 'Loc',
      counterpartyScore: 100,
      counterpartyKind: 'seller',
      currentActorId: 'buyer-surabaya-restaurant',
      isDemo: false
    }) as React.ReactElement<unknown>;

    const button = findButton(element);
    expect(button).not.toBeNull();
    await button.props.onClick();

    expect(mockFetch).toHaveBeenCalledWith('/api/offers', expect.objectContaining({ method: 'POST' }));
    expect(mockPush).toHaveBeenCalledWith('/offers/offer-123');
  });
});
