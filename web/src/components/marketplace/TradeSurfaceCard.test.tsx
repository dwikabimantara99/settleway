import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TradeSurfaceCard } from './TradeSurfaceCard';

const baseProps = {
  commodity: 'Red Curly Chili',
  subtitle: 'Grade A',
  badgeLabel: 'Immediate need',
  badgeTone: 'warning' as const,
  locationLabel: 'Delivery to',
  locationValue: 'Surabaya',
  volumeValue: '700 kg needed',
  pricePerKgIdr: 28500,
  estimatedValueIdr: 19950000,
  trustScore: 94,
  verificationLabel: 'Verified buyer',
  activityLabel: '18 completed purchases',
  counterpartyName: 'Nusantara Food Distribution',
  detailHref: '/buyer-requests/request-cabai-001',
  detailLabel: 'Review opportunity',
};

describe('TradeSurfaceCard', () => {
  it('renders explicit Sell marketplace opportunity CTA text', () => {
    const html = renderToString(<TradeSurfaceCard {...baseProps} audience="sell" />);

    expect(html).toContain('Review opportunity');
    expect(html).toContain('aria-label="Review opportunity: Red Curly Chili"');
  });
});
