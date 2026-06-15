import { describe, it, expect, beforeEach } from 'vitest';
import DealRoomPage from '../../app/deals/[dealId]/page';
import ProfilePage from '../../app/profiles/[userId]/page';
import { mockStore } from '../db/mock-store';
import { demoProfiles } from '../demo/demo-data';

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
    mockStore.seed();
  });

  describe('Evidence UI (Deal Room)', () => {
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
      expect(hasText(page, 'Confirmed')).toBe(true);
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
      expect(hasText(page, 'tx_hash')).toBe(false); // No public transaction hash exposed
    });
  });
});
