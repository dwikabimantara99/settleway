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
      />,
    );

    expect(html).toContain('Deal terms');
    expect(html).toContain('Volume (kg)');
    expect(html).toContain('Price per kg (IDR)');
    expect(html).toContain('Submit Offer');
  });

  it('keeps the composer natural and chat-like', () => {
    const html = renderToString(
      <CreateOfferComposer
        listingId="listing-cabai-001"
        initialVolumeKg={700}
        initialPricePerKgIdr={28500}
      />,
    );

    expect(html).toContain('Start the conversation.');
    expect(html).toContain('Write a message...');
    expect(html).toContain('aria-label="Send message"');
    expect(html).toContain('Terms note');
    expect(html).not.toContain('Shared negotiation panel');
  });
});
