/**
 * Demo hardening: UI truthfulness and label integrity tests.
 *
 * Asserts that:
 * - All DealStatus values have honest StatusPill labels
 * - REFUND_PENDING is never labelled "Refunded" or similar confirmed-refund language
 * - No status shows forbidden labels (Mainnet, Production custody, AI decision, AgriTrust)
 * - Demo data brand and role assignments are consistent
 * - Demo quick-jump route IDs are consistent with seeded data
 */
import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { StatusPill } from '@/components/ui/StatusPill';
import type { DealStatus } from '@/lib/escrow/state-machine';

const ALL_STATUSES: DealStatus[] = [
  'WAITING_DEPOSITS',
  'BUYER_FUNDED',
  'SELLER_FUNDED',
  'CUSTODY_PENDING',
  'LOCKED',
  'PROOF_SUBMITTED',
  'DELIVERED',
  'COMPLETED',
  'EXPIRED',
  'REFUND_PENDING',
  'REFUNDED',
  'CANCELLED',
  'DELIVERY_REJECTED',
  'REVIEW_REQUIRED',
];

const EXPECTED_LABELS: Record<DealStatus, string> = {
  WAITING_DEPOSITS: 'Awaiting deposits',
  BUYER_FUNDED: 'Buyer funded',
  SELLER_FUNDED: 'Seller funded',
  CUSTODY_PENDING: 'Confirming custody',
  LOCKED: 'Escrow protected',
  PROOF_SUBMITTED: 'Evidence submitted',
  DELIVERED: 'Buyer review',
  COMPLETED: 'Settled',
  EXPIRED: 'Expired',
  REFUND_PENDING: 'Refund Pending',
  REFUNDED: 'Refunded',
  CANCELLED: 'Cancelled',
  DELIVERY_REJECTED: 'Delivery Rejected',
  REVIEW_REQUIRED: 'Manual Review',
};

const GLOBALLY_FORBIDDEN_LABELS = [
  'Mainnet',
  'Production custody',
  'AI decision',
  'AgriTrust',
  'Bond penalized',
  'Case resolved',
];

describe('StatusPill — complete status label coverage', () => {
  it('renders expected label for every DealStatus', () => {
    for (const status of ALL_STATUSES) {
      const html = renderToString(<StatusPill status={status} />);
      expect(html, `StatusPill for ${status}`).toContain(EXPECTED_LABELS[status]);
    }
  });

  it('falls back to raw status string for unknown status', () => {
    const html = renderToString(<StatusPill status="UNKNOWN_CUSTOM_STATE" />);
    expect(html).toContain('UNKNOWN_CUSTOM_STATE');
  });
});

describe('StatusPill — REFUND_PENDING is not REFUNDED', () => {
  it('REFUND_PENDING shows "Refund Pending", not "Refunded"', () => {
    const html = renderToString(<StatusPill status="REFUND_PENDING" />);
    expect(html).toContain('Refund Pending');
    expect(html).not.toContain('>Refunded<');
  });

  it('REFUND_PENDING does not contain any confirmed-refund claim', () => {
    const html = renderToString(<StatusPill status="REFUND_PENDING" />);
    for (const forbidden of ['Bond paid', 'Seller paid', 'Buyer refunded', 'Case resolved']) {
      expect(html, `REFUND_PENDING must not say "${forbidden}"`).not.toContain(forbidden);
    }
  });
});

describe('StatusPill — no globally forbidden labels in any status', () => {
  it('no status renders forbidden global label strings', () => {
    for (const status of ALL_STATUSES) {
      const html = renderToString(<StatusPill status={status} />);
      for (const forbidden of GLOBALLY_FORBIDDEN_LABELS) {
        expect(html, `StatusPill for ${status} must not say "${forbidden}"`).not.toContain(
          forbidden
        );
      }
    }
  });
});

describe('Demo data consistency', () => {
  it('no demo profile contains "AgriTrust"', async () => {
    const { demoProfiles } = await import('@/lib/demo/demo-data');
    for (const profile of Object.values(demoProfiles)) {
      expect(profile.displayName).not.toContain('AgriTrust');
      expect(profile.roleLabel ?? '').not.toContain('AgriTrust');
    }
  });

  it('demo profiles have correct buyer/seller role separation', async () => {
    const { demoProfiles } = await import('@/lib/demo/demo-data');
    const buyers = Object.values(demoProfiles).filter((p) => p.userType === 'buyer');
    const sellers = Object.values(demoProfiles).filter((p) => p.userType === 'seller');
    expect(buyers.length).toBeGreaterThan(0);
    expect(sellers.length).toBeGreaterThan(0);
    for (const buyer of buyers) {
      expect(buyer.buyerCompletedCount).toBeGreaterThan(0);
    }
    for (const seller of sellers) {
      expect(seller.sellerCompletedCount).toBeGreaterThan(0);
    }
  });

  it('primary demo deal has correct buyer and seller', async () => {
    const { demoDeals } = await import('@/lib/demo/demo-data');
    const deal = demoDeals['demo-cabai-001'];
    expect(deal, 'demo-cabai-001 must exist').toBeDefined();
    expect(deal.buyerId).toBe('buyer-surabaya-restaurant');
    expect(deal.sellerId).toBe('seller-probolinggo-cabai');
  });

  it('primary demo deal commodity matches the linked listing commodity', async () => {
    const { demoDeals, demoListings } = await import('@/lib/demo/demo-data');
    const deal = demoDeals['demo-cabai-001'];
    const listing = demoListings.find((l) => l.id === 'listing-cabai-001');
    expect(deal).toBeDefined();
    expect(listing).toBeDefined();
    expect(deal.commodity).toBe(listing!.commodity);
  });

  it('demo listing seller matches demo deal seller', async () => {
    const { demoDeals, demoListings } = await import('@/lib/demo/demo-data');
    const deal = demoDeals['demo-cabai-001'];
    const listing = demoListings.find((l) => l.id === 'listing-cabai-001');
    expect(deal.sellerId).toBe(listing!.sellerId);
  });
});

describe('Demo route ID consistency', () => {
  it('demo quick jump IDs are present in seeded mock store', async () => {
    const { mockStore } = await import('@/lib/db/mock-store');
    mockStore.seed();

    // Primary demo IDs used throughout the walkthrough and quick-jump panel
    expect(mockStore.offers.has('offer-demo-cabai-001')).toBe(true);
    expect(mockStore.deals.has('demo-cabai-001')).toBe(true);
    expect(mockStore.listings.has('listing-cabai-001')).toBe(true);
    expect(mockStore.profiles.has('seller-probolinggo-cabai')).toBe(true);
    expect(mockStore.profiles.has('buyer-surabaya-restaurant')).toBe(true);
  });

  it('seeded offer links to the correct demo deal', async () => {
    const { mockStore } = await import('@/lib/db/mock-store');
    mockStore.seed();
    const offer = mockStore.offers.get('offer-demo-cabai-001');
    expect(offer).toBeDefined();
    expect(offer?.active_deal_id).toBe('demo-cabai-001');
    expect(offer?.buyer_id).toBe('buyer-surabaya-restaurant');
    expect(offer?.seller_id).toBe('seller-probolinggo-cabai');
  });
});

describe('Account-first UI — no external wallet CTA on public surfaces', () => {
  it('GetStartedModal does not contain Connect Stellar Wallet', async () => {
    const { renderToString } = await import('react-dom/server');
    const { createRef } = await import('react');
    const { GetStartedModal } = await import('@/components/landing/GetStartedModal');
    const html = renderToString(
      <GetStartedModal
        isOpen={true}
        onClose={() => {}}
        returnFocusRef={createRef()}
      />
    );
    expect(html).not.toContain('Connect Stellar Wallet');
    expect(html).not.toContain('WalletConnect');
    expect(html).toContain('Continue with Google');
  });

  it('PublicLandingHeader does not contain Connect Stellar Wallet in open modal state', async () => {
    const { renderToString } = await import('react-dom/server');
    const { PublicLandingHeader } = await import('@/components/landing/PublicLandingHeader');
    const html = renderToString(<PublicLandingHeader initialModalOpen={true} />);
    expect(html).not.toContain('Connect Stellar Wallet');
    expect(html).not.toContain('WalletConnect');
    expect(html).toContain('Continue with Google');
  });

  it('ConnectExternalWalletButton does not render a Connect Wallet button when no address is provided', async () => {
    const { renderToString } = await import('react-dom/server');
    const { ConnectExternalWalletButton } = await import(
      '@/components/profile/ConnectExternalWalletButton'
    );
    const html = renderToString(
      <ConnectExternalWalletButton
        profileId="test-user"
        initialAddress={null}
        initialProvider={null}
        initialNetwork={null}
        canConnect={false}
      />
    );
    expect(html).not.toContain('Connect Stellar Wallet');
    expect(html).not.toContain('Reconnect Wallet');
    expect(html).not.toContain('Connect Wallet');
    expect(html).toContain('managed internally by Settleway');
  });
});
