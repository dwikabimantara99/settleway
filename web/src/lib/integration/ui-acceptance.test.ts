import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as nextHeaders from 'next/headers';

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));
import DealRoomPage from '../../app/deals/[dealId]/page';
import LandingPage from '../../app/page';
import MarketplacePage from '../../app/marketplace/page';
import ListingDetailPage from '../../app/marketplace/[listingId]/page';
import BuyerRequestsPage from '../../app/buyer-requests/page';
import NewOfferPage from '../../app/offers/new/page';
import ProfilePage from '../../app/profiles/[userId]/page';
import { mockStore } from '../db/mock-store';
import { demoProfiles } from '../demo/demo-data';
import { buildActiveRoomDealTerms } from '../deals/terms';

// Helper to deeply search a React Element tree for text
function extractText(element: unknown): string {
  if (!element) return '';
  if (typeof element === 'string' || typeof element === 'number') {
    return String(element);
  }
  if (Array.isArray(element)) {
    return element.map(extractText).join('');
  }
  
  // Safe cast for element props since we verified it's an object
  const el = element as Record<string, unknown>;
  
  if (el.props && typeof el.props === 'object') {
    let text = '';
    const props = el.props as Record<string, unknown>;
    if (props.children) {
      text += extractText(props.children);
    }
    if (props.title) text += String(props.title);
    if (props.value) text += String(props.value);
    if (props.description) text += String(props.description);
    return text;
  }
  if (el.type && typeof el.type === 'function' && el.type.name) {
    return el.type.name;
  }
  return '';
}

function hasText(element: unknown, text: string): boolean {
  return extractText(element).includes(text);
}

describe('Product UI Acceptance (Phase 8)', () => {
  beforeEach(() => {
    vi.mocked(nextHeaders.cookies).mockResolvedValue({ get: () => undefined } as never);
    mockStore.seed();
  });

  describe('Discovery Trust UI', () => {
    it('shows a founder-facing landing corridor before users enter the marketplace', async () => {
      const page = LandingPage();

      expect(hasText(page, 'Protected trade flow')).toBe(true);
      expect(hasText(page, 'What Settleway makes possible')).toBe(true);
      expect(
        hasText(page, 'Settleway transactions are protected by escrow logic and recorded on Stellar.'),
      ).toBe(true);
      expect(hasText(page, 'Explore Guided Flow')).toBe(true);
    });

    it('shows trust signals on marketplace cards and includes three demo listings', async () => {
      const page = MarketplacePage();

      expect(hasText(page, 'Trust Signal')).toBe(true);
      expect(hasText(page, 'Protected transaction history visible before negotiation starts')).toBe(
        true,
      );
      expect(hasText(page, 'Submit Offer starts recorded negotiation before any protected room opens')).toBe(true);
      expect(hasText(page, 'White Rice (Premium Milling)')).toBe(true);
    });

    it('shows seller credibility and offer continuity on listing detail', async () => {
      const page = await ListingDetailPage({
        params: Promise.resolve({ listingId: 'listing-cabai-001' }),
      });

      expect(hasText(page, 'Why this seller looks credible')).toBe(true);
      expect(hasText(page, 'Protected volume')).toBe(true);
      expect(hasText(page, 'Proof visibility')).toBe(true);
      expect(hasText(page, 'Recorded negotiation starts first.')).toBe(true);
    });

    it('shows buyer trust signals and protected-room continuity on buyer requests', async () => {
      const page = BuyerRequestsPage();

      expect(hasText(page, 'Procurement Trust Signal')).toBe(true);
      expect(hasText(page, 'Protected purchase history visible before supply discussion')).toBe(
        true,
      );
      expect(
        hasText(page, 'Protected escrow begins only after both sides commit to open the Deal Room.'),
      ).toBe(true);
    });

    it('frames submit offer as the start of a shared negotiation conversation', async () => {
      const page = await NewOfferPage({
        searchParams: Promise.resolve({ listingId: 'listing-cabai-001' }),
      });

      expect(
        hasText(
          page,
          'Negotiate here first, then submit the commercial terms from the Deal Terms card.',
        ),
      ).toBe(true);
      expect(hasText(page, 'Pre-Deal Negotiation')).toBe(true);
      expect(hasText(page, 'Indicative baseline:')).toBe(true);
    });
  });

  describe('Evidence UI (Deal Room)', () => {
    it('shows a calmer funding-first deal room in waiting deposits state', async () => {
      const dealId = 'demo-cabai-001';

      const page = await DealRoomPage({ params: Promise.resolve({ dealId }) });

      expect(hasText(page, 'Funding Gate')).toBe(true);
      expect(hasText(page, 'Back to recorded negotiation')).toBe(true);
      expect(hasText(page, 'Activated from recorded negotiation')).toBe(true);
      expect(hasText(page, 'Buyer deposit obligation')).toBe(true);
      expect(hasText(page, 'Seller deposit obligation')).toBe(true);
      expect(hasText(page, 'Funding gate')).toBe(true);
      expect(hasText(page, 'Deposit deadline:')).toBe(true);
      expect(hasText(page, 'Protected by escrow logic and recorded on Stellar')).toBe(true);
      expect(hasText(page, 'Negotiation Context')).toBe(true);
      expect(hasText(page, 'Open recorded thread')).toBe(true);
      expect(hasText(page, 'Role Wallets')).toBe(true);
      expect(hasText(page, 'Buyer Testnet wallet')).toBe(true);
      expect(hasText(page, 'Seller Testnet wallet')).toBe(true);
      expect(hasText(page, 'Settleway fee wallet')).toBe(true);
      expect(hasText(page, 'Awaiting buyer deposit')).toBe(true);
      expect(hasText(page, 'Awaiting seller deposit')).toBe(true);
      expect(hasText(page, 'Fee routing stays pending until the room clears funding and eventually reaches settlement.')).toBe(true);
      expect(hasText(page, 'settleway-testnet-buyer-demo')).toBe(true);
      expect(hasText(page, 'settleway-testnet-seller-demo')).toBe(true);
      expect(hasText(page, 'settleway-testnet-admin')).toBe(true);
      expect(
        hasText(
          page,
          'We can prepare the lot and upload shipment evidence after both deposits clear.',
        ),
      ).toBe(true);
      expect(hasText(page, 'Trust layer')).toBe(true);
      expect(hasText(page, 'View Transaction')).toBe(true);
    });

    it('carries negotiation continuity into the active room when activated from an offer', async () => {
      const dealId = 'demo-cabai-001';
      const offerId = 'offer-linked-1';
      const now = new Date().toISOString();

      mockStore.offers.set(offerId, {
        id: offerId,
        listing_id: 'listing-cabai-001',
        buyer_request_id: null,
        buyer_id: 'buyer-surabaya-restaurant',
        seller_id: 'seller-probolinggo-cabai',
        initiated_by_id: 'buyer-surabaya-restaurant',
        commodity: "Red Chili (Bird's Eye Chili)",
        volume_kg: 700,
        price_per_kg_idr: 28500,
        principal_idr: 19950000,
        terms_note: 'Same-day pickup after escrow lock.',
        status: 'active_escrow',
        latest_message_preview: 'Please confirm same-day pickup window.',
        terms_submitted_at: now,
        terms_accepted_at: now,
        terms_accepted_by_id: 'seller-probolinggo-cabai',
        buyer_open_room_at: now,
        seller_open_room_at: now,
        active_deal_id: dealId,
        created_at: now,
        updated_at: now,
      });
      mockStore.offerMessages.set(offerId, [
        {
          id: 'msg-1',
          offer_id: offerId,
          author_id: 'buyer-surabaya-restaurant',
          body: 'Please confirm same-day pickup window.',
          created_at: now,
        },
        {
          id: 'msg-2',
          offer_id: offerId,
          author_id: 'seller-probolinggo-cabai',
          body: 'We can prepare the lot after both deposits clear.',
          created_at: now,
        },
      ]);
      mockStore.updateDeal(dealId, {
        terms: buildActiveRoomDealTerms({
          offerId,
          activatedAt: now,
          depositWindowHours: 24,
        }),
      });

      const page = await DealRoomPage({ params: Promise.resolve({ dealId }) });

      expect(hasText(page, 'Negotiation Context')).toBe(true);
      expect(hasText(page, 'Open recorded thread')).toBe(true);
      expect(hasText(page, 'Recorded negotiation')).toBe(true);
      expect(hasText(page, 'Please confirm same-day pickup window.')).toBe(true);
      expect(hasText(page, 'We can prepare the lot after both deposits clear.')).toBe(
        true,
      );
    });

    it('shows protected execution timeline and room events after lock', async () => {
      const dealId = 'demo-cabai-001';
      mockStore.updateDeal(dealId, {
        status: 'LOCKED',
        stellar_mode: 'testnet',
        stellar_contract_id: 'C-LOCK-TRUTH-123',
        stellar_escrow_id: 'escrow-lock-123',
        latest_stellar_tx_hash: 'locktruth1234567890abcdef',
      });
      mockStore.addEvent({
        id: 'event-lock-1',
        deal_id: dealId,
        event_type: 'escrow_locked',
        actor_id: 'seller-probolinggo-cabai',
        message: 'Escrow locked after both required deposits were confirmed.',
        tx_hash: 'locktruth1234567890abcdef',
        proof_hash: null,
        metadata: { protected_value_idr: 21945000 },
        created_at: new Date().toISOString(),
      });

      const page = await DealRoomPage({ params: Promise.resolve({ dealId }) });

      expect(hasText(page, 'Protected Execution Timeline')).toBe(true);
      expect(hasText(page, 'Escrow Locked')).toBe(true);
      expect(hasText(page, 'Room Events')).toBe(true);
      expect(hasText(page, 'Newest entries appear first.')).toBe(true);
      expect(hasText(page, 'Lock truth')).toBe(true);
      expect(hasText(page, 'View Lock Proof')).toBe(true);
      expect(hasText(page, 'Contract ID')).toBe(true);
      expect(hasText(page, 'Escrow reference')).toBe(true);
      expect(hasText(page, 'Lock proof')).toBe(true);
      expect(hasText(page, 'Locked in escrow')).toBe(true);
      expect(hasText(page, 'Waiting for settlement')).toBe(true);
      expect(hasText(page, 'C-LOCK-TRUTH-123')).toBe(true);
      expect(hasText(page, 'escrow-lock-123')).toBe(true);
      expect(hasText(page, 'Escrow locked after both required deposits were confirmed.')).toBe(true);
    });

    it('shows success settlement summary after buyer acceptance', async () => {
      const dealId = 'demo-cabai-001';
      mockStore.updateDeal(dealId, { status: 'COMPLETED' });

      const page = await DealRoomPage({ params: Promise.resolve({ dealId }) });

      expect(hasText(page, 'Success Settlement Summary')).toBe(true);
      expect(hasText(page, 'Settled')).toBe(true);
      expect(hasText(page, 'Completion Proof')).toBe(true);
      expect(hasText(page, 'Settlement transaction')).toBe(true);
      expect(hasText(page, 'Escrow reference')).toBe(true);
      expect(hasText(page, 'Contract ID')).toBe(true);
      expect(hasText(page, 'Proof hash')).toBe(true);
      expect(hasText(page, 'View Settlement Transaction')).toBe(true);
      expect(hasText(page, 'Payout Destinations')).toBe(true);
      expect(hasText(page, 'Reputation ledger')).toBe(true);
      expect(hasText(page, 'Buyer bond return')).toBe(true);
      expect(hasText(page, 'Seller principal receipt')).toBe(true);
      expect(hasText(page, 'Seller bond return')).toBe(true);
      expect(hasText(page, 'Platform fee retention')).toBe(true);
      expect(hasText(page, 'Procurement treasury wallet')).toBe(true);
      expect(hasText(page, 'Farmer treasury wallet')).toBe(true);
      expect(hasText(page, 'Settleway fee wallet')).toBe(true);
      expect(hasText(page, 'Linked wallet destination is the only active payout rail in this MVP.')).toBe(true);
      expect(hasText(page, 'Settlement completed')).toBe(true);
    });

    it('shows refund-oriented room messaging when the deal closes before lock', async () => {
      const dealId = 'demo-cabai-001';
      mockStore.updateDeal(dealId, { status: 'REFUNDED' });

      const page = await DealRoomPage({ params: Promise.resolve({ dealId }) });

      expect(hasText(page, 'Refund outcome recorded')).toBe(true);
      expect(
        hasText(
          page,
          'Review who was refunded, whether any penalty applied, and how the outcome affects reputation.',
        ),
      ).toBe(true);
      expect(hasText(page, 'Closed Funding Snapshot')).toBe(true);
      expect(hasText(page, 'No proof corridor opened')).toBe(true);
      expect(hasText(page, 'Platform fees')).toBe(true);
      expect(hasText(page, 'Not charged before lock')).toBe(true);
    });

    it('distinguishes unfunded expiry from refunded outcomes', async () => {
      const dealId = 'demo-cabai-001';
      mockStore.updateDeal(dealId, { status: 'EXPIRED' });

      const page = await DealRoomPage({ params: Promise.resolve({ dealId }) });

      expect(hasText(page, 'Funding window expired')).toBe(true);
      expect(
        hasText(
          page,
          'The funding window expired before either side funded. No refund movement, reputation penalty, or post-lock execution was triggered.',
        ),
      ).toBe(true);
      expect(hasText(page, 'Closed Funding Snapshot')).toBe(true);
      expect(hasText(page, 'No proof corridor opened')).toBe(true);
      expect(hasText(page, 'Buyer: no deposit was recorded before expiry.')).toBe(true);
      expect(hasText(page, 'Seller: no deposit was recorded before expiry.')).toBe(true);
    });

    it('shows refund outcome and penalty visibility after a failed counterparty deposit', async () => {
      const dealId = 'demo-cabai-001';
      mockStore.updateDeal(dealId, { status: 'REFUNDED' });
      mockStore.addEvent({
        id: 'event-buyer-funded-phase-e',
        deal_id: dealId,
        event_type: 'buyer_deposit',
        actor_id: 'buyer-surabaya-restaurant',
        message: 'Buyer deposit recorded for escrow preparation.',
        tx_hash: null,
        proof_hash: null,
        metadata: {
          deposit_total_idr: 21047250,
        },
        created_at: new Date().toISOString(),
      });
      mockStore.addEvent({
        id: 'event-expire-phase-e',
        deal_id: dealId,
        event_type: 'expire',
        actor_id: 'buyer-surabaya-restaurant',
        message:
          'Funding window expired. Buyer should be refunded in full before lock and seller takes the reputation penalty.',
        tx_hash: null,
        proof_hash: null,
        metadata: {
          refund_to_party: 'buyer',
          penalized_party: 'seller',
          no_slashing_before_lock: true,
        },
        created_at: new Date().toISOString(),
      });
      mockStore.appendReputationEventPair([
        {
          id: 'phase-e-room-buyer',
          deal_id: dealId,
          participant_id: 'buyer-surabaya-restaurant',
          participant_role: 'buyer',
          reputation_outcome: 'seller_failed_deposit',
          reputation_rule_version: 'v1',
          idempotency_key: 'phase-e-room-buyer',
          score_delta: 0,
          volume_delta_idr: 0,
          created_at: new Date().toISOString(),
        },
        {
          id: 'phase-e-room-seller',
          deal_id: dealId,
          participant_id: 'seller-probolinggo-cabai',
          participant_role: 'seller',
          reputation_outcome: 'seller_failed_deposit',
          reputation_rule_version: 'v1',
          idempotency_key: 'phase-e-room-seller',
          score_delta: -3,
          volume_delta_idr: 0,
          created_at: new Date().toISOString(),
        },
      ]);

      const page = await DealRoomPage({ params: Promise.resolve({ dealId }) });

      expect(hasText(page, 'Outcome & Reputation Consequences')).toBe(true);
      expect(hasText(page, 'Buyer: full pre-lock refund, no score loss.')).toBe(true);
      expect(hasText(page, 'Seller: missed deposit commitment, reputation reduced.')).toBe(true);
      expect(hasText(page, 'Seller Failed Deposit | score -3')).toBe(true);
      expect(hasText(page, 'Latest room outcome: Seller Failed Deposit (-3)')).toBe(true);
      expect(hasText(page, 'Buyer funding outcome')).toBe(true);
      expect(hasText(page, 'Returned in full')).toBe(true);
    });

    it('displays EvidenceSubmitter when deal is LOCKED', async () => {
      const dealId = 'demo-cabai-001';
      mockStore.updateDeal(dealId, { status: 'LOCKED' });
      
      const page = await DealRoomPage({ params: Promise.resolve({ dealId }) });
            // EvidenceSubmitter is rendered instead of the upload placeholder
      expect(hasText(page, 'Evidence submission becomes available')).toBe(false);
    });

    it('displays submitted evidence correctly and not as confirmed', async () => {
      const dealId = 'demo-cabai-001';
      mockStore.updateDeal(dealId, { status: 'PROOF_SUBMITTED' });
      mockStore.addEvidence({
        id: 'ev-123',
        deal_id: dealId,
        submitted_by: 'p-002',
        evidence_kind: 'waybill',
        original_filename: 'resi.jpg',
        mime_type: 'image/jpeg',
        byte_size: 2048,
        sha256_hash: 'abcdef123456',
        display_visibility: 'deal_only',
        chain_operation_reference: null,
        created_at: new Date().toISOString()
      });

      const page = await DealRoomPage({ params: Promise.resolve({ dealId }) });
      
      expect(hasText(page, 'resi.jpg')).toBe(true);
      expect(hasText(page, '2.0 KB')).toBe(true);
      expect(hasText(page, 'Visibility:')).toBe(true);
      expect(hasText(page, 'Submitted by:')).toBe(true);
      expect(hasText(page, 'Anchoring reference:')).toBe(true);
      expect(hasText(page, 'Anchoring status: Pending')).toBe(true);
      expect(hasText(page, 'abcdef123456')).toBe(true);
      expect(hasText(page, 'Pending')).toBe(true);
      expect(hasText(page, 'Confirmed')).toBe(false); // Because operation reference is null
    });

    it('displays confirmed anchoring state when operation reference is present', async () => {
      const dealId = 'demo-cabai-001';
      mockStore.updateDeal(dealId, { status: 'DELIVERED' });
      mockStore.addEvidence({
        id: 'ev-124',
        deal_id: dealId,
        submitted_by: 'p-002',
        evidence_kind: 'waybill',
        original_filename: 'resi2.jpg',
        mime_type: 'image/jpeg',
        byte_size: 4096,
        sha256_hash: '123456abcdef',
        display_visibility: 'deal_only',
        chain_operation_reference: 'op-123',
        created_at: new Date().toISOString()
      });

      const page = await DealRoomPage({ params: Promise.resolve({ dealId }) });
      
      expect(hasText(page, 'resi2.jpg')).toBe(true);
      expect(hasText(page, 'Anchoring status: Confirmed')).toBe(true);
      expect(hasText(page, 'Confirmed')).toBe(true);
    });

    it('shows evidence-state and operator demo cues in the proof section', async () => {
      const dealId = 'demo-cabai-001';
      mockStore.updateDeal(dealId, { status: 'LOCKED' });

      const page = await DealRoomPage({ params: Promise.resolve({ dealId }) });

      expect(hasText(page, 'Evidence state')).toBe(true);
      expect(hasText(page, 'Anchoring state')).toBe(true);
      expect(hasText(page, 'Operator demo cue')).toBe(true);
      expect(
        hasText(page, 'For MVP, evidence can be uploaded or simulated; the file hash is recorded'),
      ).toBe(true);
    });

    it('keeps mock-mode honesty while still showing any stored Stellar references', async () => {
      const dealId = 'demo-cabai-001';
      // Mock mode without contract ID
      mockStore.updateDeal(dealId, { stellar_mode: 'mock_only', stellar_contract_id: null });
      let page = await DealRoomPage({ params: Promise.resolve({ dealId }) });
      expect(hasText(page, 'Demo mode')).toBe(true);
      
      // Testnet mode without contract ID
      mockStore.updateDeal(dealId, { stellar_mode: 'testnet', stellar_contract_id: null });
      page = await DealRoomPage({ params: Promise.resolve({ dealId }) });
      expect(hasText(page, 'Pending')).toBe(true);
      expect(hasText(page, 'Demo mode')).toBe(false);

      // With contract ID (Confirmed)
      mockStore.updateDeal(dealId, { stellar_mode: 'mock_only', stellar_contract_id: 'C-MOCK-123', latest_stellar_tx_hash: 'tx-123' });
      page = await DealRoomPage({ params: Promise.resolve({ dealId }) });
      expect(hasText(page, 'C-MOCK-123')).toBe(true);
      expect(hasText(page, 'tx-123')).toBe(true);
      expect(hasText(page, 'Demo mode')).toBe(true);
    });
  });

  describe('Reputation UI (Profile)', () => {
    it('renders aggregate fields correctly and distinct scores', async () => {
      const userId = 'buyer-surabaya-restaurant'; // Buyer Budi
      
      // Inject some mock reputation events to verify aggregation
      mockStore.appendReputationEventPair([
        {
          id: 're-1',
          deal_id: 'd-test-1',
          participant_id: userId,
          participant_role: 'buyer',
          reputation_outcome: 'transaction_completed',
          reputation_rule_version: 'v1',
          idempotency_key: 'idk1',
          score_delta: 10,
          volume_delta_idr: 5000000,
          created_at: new Date().toISOString()
        },
        {
          id: 're-2',
          deal_id: 'd-test-1',
          participant_id: 'seller-probolinggo-cabai', // Seller Siti
          participant_role: 'seller',
          reputation_outcome: 'transaction_completed',
          reputation_rule_version: 'v1',
          idempotency_key: 'idk2',
          score_delta: 10,
          volume_delta_idr: 5000000,
          created_at: new Date().toISOString()
        }
      ]);

      const page = await ProfilePage({ params: Promise.resolve({ userId }) });
      
      const profile = demoProfiles[userId];
      const expectedBuyerScore = profile.buyerScore + 10;
      
      // Ensure we see the updated score
      expect(hasText(page, `${expectedBuyerScore}/100`)).toBe(true);
      expect(hasText(page, 'Buyer Reputation')).toBe(true);
      expect(hasText(page, 'Seller Reputation')).toBe(true);
    });

    it('renders zero values and no public transaction hash', async () => {
      const userId = 'buyer-jakarta-factory'; // Existent user
      
      const page = await ProfilePage({ params: Promise.resolve({ userId }) });
      
      expect(hasText(page, '0/100')).toBe(true);
      expect(hasText(page, 'Rp 5.800M')).toBe(true); // verified volume formatting using id-ID locale
      expect(hasText(page, 'Private verification mode')).toBe(true);
      expect(hasText(page, 'Visible verification signals')).toBe(true);
      expect(hasText(page, 'tx_hash')).toBe(false); // No public transaction hash exposed
    });

    it('shows recent verified outcomes and dispute honesty on the profile page', async () => {
      const userId = 'buyer-surabaya-restaurant';
      mockStore.appendReputationEventPair([
        {
          id: 'profile-phase-e-1',
          deal_id: 'deal-phase-e-1',
          participant_id: userId,
          participant_role: 'buyer',
          reputation_outcome: 'refunded_before_locked',
          reputation_rule_version: 'v1',
          idempotency_key: 'profile-phase-e-1',
          score_delta: 0,
          volume_delta_idr: 0,
          created_at: new Date().toISOString(),
        },
        {
          id: 'profile-phase-e-2',
          deal_id: 'deal-phase-e-1',
          participant_id: 'seller-probolinggo-cabai',
          participant_role: 'seller',
          reputation_outcome: 'refunded_before_locked',
          reputation_rule_version: 'v1',
          idempotency_key: 'profile-phase-e-2',
          score_delta: 0,
          volume_delta_idr: 0,
          created_at: new Date().toISOString(),
        },
      ]);

      const page = await ProfilePage({ params: Promise.resolve({ userId }) });

      expect(hasText(page, 'Reputation Ledger')).toBe(true);
      expect(hasText(page, 'Trust Passport')).toBe(true);
      expect(hasText(page, 'Verification Model')).toBe(true);
      expect(hasText(page, 'Outcome-backed reputation')).toBe(true);
      expect(hasText(page, 'Refunded Before Lock')).toBe(true);
      expect(hasText(page, 'Open protected room')).toBe(true);
      expect(
        hasText(page, 'After lock, disputes still require operator review using room chat'),
      ).toBe(true);
    });

    it('shows public verification references when a linked public room has them', async () => {
      const userId = 'seller-probolinggo-cabai';
      const dealId = 'deal-phase-i-public';
      const now = new Date().toISOString();

      mockStore.deals.set(dealId, {
        id: dealId,
        listing_id: 'listing-cabai-001',
        buyer_request_id: null,
        buyer_id: 'buyer-surabaya-restaurant',
        seller_id: userId,
        commodity: "Red Chili (Bird's Eye Chili)",
        volume_kg: 700,
        principal_idr: 19950000,
        buyer_bond_idr: 997500,
        seller_bond_idr: 997500,
        buyer_fee_idr: 99750,
        seller_fee_idr: 99750,
        buyer_total_idr: 21047250,
        seller_total_idr: 1097250,
        status: 'COMPLETED',
        stellar_mode: 'testnet',
        stellar_contract_id: 'C-PUBLIC-123',
        stellar_escrow_id: 'escrow-public-1',
        latest_stellar_tx_hash: 'abcdef1234567890fedcba',
        stellar_sync_status: 'idle',
        proof_hash: 'proofhash1234567890abcdef',
        terms: {},
        created_at: now,
        updated_at: now,
      });

      mockStore.appendReputationEventPair([
        {
          id: 'phase-i-public-buyer',
          deal_id: dealId,
          participant_id: 'buyer-surabaya-restaurant',
          participant_role: 'buyer',
          reputation_outcome: 'transaction_completed',
          reputation_rule_version: 'v1',
          idempotency_key: 'phase-i-public-buyer',
          score_delta: 10,
          volume_delta_idr: 19950000,
          created_at: now,
        },
        {
          id: 'phase-i-public-seller',
          deal_id: dealId,
          participant_id: userId,
          participant_role: 'seller',
          reputation_outcome: 'transaction_completed',
          reputation_rule_version: 'v1',
          idempotency_key: 'phase-i-public-seller',
          score_delta: 10,
          volume_delta_idr: 19950000,
          created_at: now,
        },
      ]);

      const page = await ProfilePage({ params: Promise.resolve({ userId }) });

      expect(hasText(page, 'Public verification mode')).toBe(true);
      expect(hasText(page, 'Transaction reference:')).toBe(true);
      expect(hasText(page, 'Proof hash:')).toBe(true);
      expect(hasText(page, 'Open protected room')).toBe(true);
    });
  });
});
