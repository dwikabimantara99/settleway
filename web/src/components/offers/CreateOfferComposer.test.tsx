import { describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { CreateOfferComposer } from './CreateOfferComposer';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
  })),
}));

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
});
