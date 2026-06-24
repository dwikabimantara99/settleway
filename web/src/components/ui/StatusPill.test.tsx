import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { StatusPill } from './StatusPill';

describe('StatusPill', () => {
  it('renders deliberate labels for every Deal Room status', () => {
    const expectedLabels = {
      WAITING_DEPOSITS: 'Awaiting deposits',
      BUYER_FUNDED: 'Buyer funded',
      SELLER_FUNDED: 'Seller funded',
      CUSTODY_PENDING: 'Confirming custody',
      LOCKED: 'Escrow protected',
      PROOF_SUBMITTED: 'Evidence submitted',
      DELIVERED: 'Buyer review',
      COMPLETED: 'Settled',
      EXPIRED: 'Expired',
      REFUNDED: 'Refunded',
      CANCELLED: 'Cancelled',
    };

    for (const [status, label] of Object.entries(expectedLabels)) {
      const html = renderToString(<StatusPill status={status} />);
      expect(html).toContain(label);
    }
  });

  it('renders COMPLETED as the canonical terminal success label', () => {
    const html = renderToString(<StatusPill status="COMPLETED" />);

    expect(html).toContain('Settled');
    expect(html).not.toContain('Accepted');
  });

  it('falls back to unknown status text without reintroducing stale success vocabulary', () => {
    const html = renderToString(<StatusPill status="CUSTOM_STATUS" />);

    expect(html).toContain('CUSTOM_STATUS');
    expect(html).not.toContain('Accepted');
  });
});
