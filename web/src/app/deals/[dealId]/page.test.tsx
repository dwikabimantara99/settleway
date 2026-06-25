import { describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import DealRoomPage from './page';
import {
  DEAL_STATE_GALLERY_STATUSES,
  type DealStateGalleryStatus,
  getDealStateGalleryFixtureId,
} from '@/lib/deal-state-gallery';

const statusLabels: Record<DealStateGalleryStatus, string> = {
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

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(() => undefined),
  })),
}));

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('not-found');
  }),
  useRouter: vi.fn(() => ({
    refresh: vi.fn(),
  })),
}));

describe('Deal Room state gallery fixtures', () => {
  it('renders every deterministic Deal Room state through the production route', async () => {
    for (const status of DEAL_STATE_GALLERY_STATUSES) {
      const element = await DealRoomPage({
        params: Promise.resolve({ dealId: getDealStateGalleryFixtureId(status) }),
      });
      const html = renderToString(element);

      expect(html).toContain("Red Chili (Bird&#x27;s Eye Chili)");
      expect(html).toContain(getDealStateGalleryFixtureId(status));
      expect(html).toContain(statusLabels[status]);

      if (
        status === 'WAITING_DEPOSITS' ||
        status === 'BUYER_FUNDED' ||
        status === 'SELLER_FUNDED' ||
        status === 'CUSTODY_PENDING'
      ) {
        expect(html).toContain('Aurora Assurance Rail');
      } else {
        expect(html).toContain('Protected by escrow logic and recorded on Stellar');
      }

      if (status === 'CUSTODY_PENDING') {
        expect(html).toContain('Refresh Escrow Status');
      }

      if (status === 'LOCKED') {
        expect(html).toContain('Submit Delivery Evidence');
      }

      if (status === 'PROOF_SUBMITTED') {
        expect(html).toContain('Confirm Delivery Milestone');
      }

      if (status === 'DELIVERED') {
        expect(html).toContain('Confirm Receipt And Settle');
      }

      if (status === 'COMPLETED') {
        expect(html).toContain('Success Settlement Summary');
        expect(html).toContain('Payout Destinations');
      }

      if (status === 'EXPIRED' || status === 'REFUNDED' || status === 'CANCELLED') {
        expect(html).toContain('Closed Funding Snapshot');
      }
    }
  });
});
