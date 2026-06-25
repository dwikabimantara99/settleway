import type {
  DbDeal,
  DbEscrowEvent,
  DbEvidenceFile,
  DbOffer,
  DbReputationEvent,
} from '@/lib/db/types';
import type { DealStatus } from '@/lib/escrow/state-machine';
import { buildActiveRoomDealTerms } from '@/lib/deals/terms';
import { resolveDealRoomDefaultStellarState } from '@/lib/stellar/server/deal-room-testnet-runtime';

export const DEAL_STATE_GALLERY_STATUSES = [
  'WAITING_DEPOSITS',
  'BUYER_FUNDED',
  'SELLER_FUNDED',
  'CUSTODY_PENDING',
  'LOCKED',
  'PROOF_SUBMITTED',
  'DELIVERED',
  'COMPLETED',
  'EXPIRED',
  'REFUNDED',
  'CANCELLED',
] as const satisfies readonly DealStatus[];

export type DealStateGalleryStatus = (typeof DEAL_STATE_GALLERY_STATUSES)[number];

const FIXTURE_PREFIX = 'dev-aurora-state';
const BUYER_ID = 'buyer-surabaya-restaurant';
const SELLER_ID = 'seller-probolinggo-cabai';
const LISTING_ID = 'listing-cabai-001';
const BASE_TIME = Date.UTC(2026, 5, 24, 2, 0, 0);

export function isDealStateGalleryEnabled(nodeEnv = process.env.NODE_ENV): boolean {
  return nodeEnv !== 'production';
}

export function getDealStateGalleryFixtureId(status: DealStateGalleryStatus): string {
  return `${FIXTURE_PREFIX}-${status.toLowerCase().replaceAll('_', '-')}`;
}

function at(minutes: number): string {
  return new Date(BASE_TIME + minutes * 60_000).toISOString();
}

function proofHash(status: DealStateGalleryStatus): string {
  const source = `aurora-development-visual-fixture-${status.toLowerCase()}`;
  return Buffer.from(source).toString('hex').padEnd(64, '0').slice(0, 64);
}

function txHash(status: DealStateGalleryStatus, label: string): string {
  const source = `${status.toLowerCase()}-${label}-visual-fixture`;
  return Buffer.from(source).toString('hex').padEnd(64, 'a').slice(0, 64);
}

function statusTitle(status: DealStateGalleryStatus): string {
  return status
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildOffer(status: DealStateGalleryStatus): DbOffer {
  const id = `${getDealStateGalleryFixtureId(status)}-offer`;
  return {
    id,
    listing_id: LISTING_ID,
    buyer_request_id: null,
    buyer_id: BUYER_ID,
    seller_id: SELLER_ID,
    initiated_by_id: BUYER_ID,
    commodity: "Red Chili (Bird's Eye Chili)",
    volume_kg: 700,
    price_per_kg_idr: 28500,
    principal_idr: 19950000,
    terms_note:
      'Delivery deadline: 24 May 2026\nGrade A, minimum size 3 cm. Development visual fixture only; not a live Testnet event.',
    status: 'active_escrow',
    latest_message_preview: `Development visual fixture for ${statusTitle(status)}.`,
    terms_submitted_at: at(0),
    terms_accepted_at: at(15),
    terms_accepted_by_id: SELLER_ID,
    buyer_open_room_at: at(20),
    seller_open_room_at: at(24),
    active_deal_id: getDealStateGalleryFixtureId(status),
    created_at: at(0),
    updated_at: at(24),
  };
}

function buildDeal(status: DealStateGalleryStatus): DbDeal {
  const dealId = getDealStateGalleryFixtureId(status);
  const hasLock = ['LOCKED', 'PROOF_SUBMITTED', 'DELIVERED', 'COMPLETED'].includes(status);
  const hasProof = ['PROOF_SUBMITTED', 'DELIVERED', 'COMPLETED'].includes(status);
  const hasLatestReference =
    status === 'CUSTODY_PENDING' || hasLock || status === 'REFUNDED' || status === 'COMPLETED';

  return {
    ...resolveDealRoomDefaultStellarState(),
    id: dealId,
    listing_id: LISTING_ID,
    buyer_request_id: null,
    buyer_id: BUYER_ID,
    seller_id: SELLER_ID,
    commodity: "Red Chili (Bird's Eye Chili)",
    volume_kg: 700,
    principal_idr: 19950000,
    buyer_bond_idr: 997500,
    seller_bond_idr: 997500,
    buyer_fee_idr: 99750,
    seller_fee_idr: 99750,
    buyer_total_idr: 21047250,
    seller_total_idr: 1097250,
    status,
    stellar_mode: 'testnet',
    stellar_contract_id: hasLock ? 'CDL2DEVELOPMENTVISUALFIXTURECONTRACTONLY000000000000000000000000' : null,
    stellar_escrow_id: hasLock ? `${dealId}-escrow-reference` : null,
    latest_stellar_tx_hash: hasLatestReference ? txHash(status, 'latest') : null,
    stellar_sync_status: hasLatestReference ? 'pending' : 'idle',
    proof_hash: hasProof ? proofHash(status) : null,
    terms: buildActiveRoomDealTerms({
      offerId: `${dealId}-offer`,
      activatedAt: at(24),
      depositWindowHours: 24,
    }),
    created_at: at(24),
    updated_at: at(60),
  };
}

function buildEvents(status: DealStateGalleryStatus, dealId: string): DbEscrowEvent[] {
  const events: DbEscrowEvent[] = [
    {
      id: `${dealId}-event-room-opened`,
      deal_id: dealId,
      event_type: 'deal_room_opened',
      actor_id: null,
      message: 'Development visual fixture: both parties opened the Deal Room.',
      tx_hash: null,
      proof_hash: null,
      metadata: { fixture_kind: 'development_visual_state_gallery' },
      created_at: at(24),
    },
  ];

  if (
    [
      'BUYER_FUNDED',
      'CUSTODY_PENDING',
      'LOCKED',
      'PROOF_SUBMITTED',
      'DELIVERED',
      'COMPLETED',
      'REFUNDED',
    ].includes(status)
  ) {
    events.push({
      id: `${dealId}-event-buyer-funded`,
      deal_id: dealId,
      event_type: 'buyer_deposit',
      actor_id: BUYER_ID,
      message: 'Development fixture: buyer commitment recorded.',
      tx_hash: txHash(status, 'buyer-funding'),
      proof_hash: null,
      metadata: { deposit_total_idr: 21047250, fixture_kind: 'development_visual_state_gallery' },
      created_at: at(32),
    });
  }

  if (
    ['SELLER_FUNDED', 'CUSTODY_PENDING', 'LOCKED', 'PROOF_SUBMITTED', 'DELIVERED', 'COMPLETED'].includes(
      status,
    )
  ) {
    events.push({
      id: `${dealId}-event-seller-funded`,
      deal_id: dealId,
      event_type: 'seller_deposit',
      actor_id: SELLER_ID,
      message: 'Development fixture: seller performance bond recorded.',
      tx_hash: txHash(status, 'seller-funding'),
      proof_hash: null,
      metadata: { deposit_total_idr: 1097250, fixture_kind: 'development_visual_state_gallery' },
      created_at: at(36),
    });
  }

  if (['LOCKED', 'PROOF_SUBMITTED', 'DELIVERED', 'COMPLETED'].includes(status)) {
    events.push({
      id: `${dealId}-event-locked`,
      deal_id: dealId,
      event_type: 'escrow_locked',
      actor_id: null,
      message: 'Development fixture: escrow lock reference recorded on Stellar Testnet.',
      tx_hash: txHash(status, 'lock'),
      proof_hash: null,
      metadata: { protected_value_idr: 19950000, fixture_kind: 'development_visual_state_gallery' },
      created_at: at(40),
    });
  }

  if (['PROOF_SUBMITTED', 'DELIVERED', 'COMPLETED'].includes(status)) {
    events.push({
      id: `${dealId}-event-proof`,
      deal_id: dealId,
      event_type: 'submit_proof',
      actor_id: SELLER_ID,
      message: 'Development fixture: delivery evidence fingerprint recorded.',
      tx_hash: txHash(status, 'proof'),
      proof_hash: proofHash(status),
      metadata: {
        original_filename: 'delivery-photo-and-receipt-pack.zip',
        fixture_kind: 'development_visual_state_gallery',
      },
      created_at: at(52),
    });
  }

  if (['DELIVERED', 'COMPLETED'].includes(status)) {
    events.push({
      id: `${dealId}-event-delivered`,
      deal_id: dealId,
      event_type: 'mark_delivered',
      actor_id: SELLER_ID,
      message: 'Development fixture: delivery milestone marked for buyer review.',
      tx_hash: txHash(status, 'delivery'),
      proof_hash: proofHash(status),
      metadata: { fixture_kind: 'development_visual_state_gallery' },
      created_at: at(68),
    });
  }

  if (status === 'COMPLETED') {
    events.push({
      id: `${dealId}-event-completed`,
      deal_id: dealId,
      event_type: 'accept_delivery',
      actor_id: BUYER_ID,
      message: 'Development fixture: buyer accepted delivery and settlement completed.',
      tx_hash: txHash(status, 'settlement'),
      proof_hash: proofHash(status),
      metadata: {
        principal_to_seller_idr: 19950000,
        settlement_reference: txHash(status, 'settlement'),
        settled_at: at(74),
        fixture_kind: 'development_visual_state_gallery',
      },
      created_at: at(74),
    });
  }

  if (status === 'EXPIRED') {
    events.push({
      id: `${dealId}-event-expired`,
      deal_id: dealId,
      event_type: 'expire',
      actor_id: null,
      message: 'Development fixture: funding window expired before any lock.',
      tx_hash: null,
      proof_hash: null,
      metadata: { no_slashing_before_lock: true, fixture_kind: 'development_visual_state_gallery' },
      created_at: at(90),
    });
  }

  if (status === 'REFUNDED') {
    events.push({
      id: `${dealId}-event-refunded`,
      deal_id: dealId,
      event_type: 'refund',
      actor_id: null,
      message: 'Development fixture: buyer funded, seller missed deposit, buyer refund recorded.',
      tx_hash: txHash(status, 'refund'),
      proof_hash: null,
      metadata: {
        refund_to_party: 'buyer',
        penalized_party: 'seller',
        no_slashing_before_lock: true,
        fixture_kind: 'development_visual_state_gallery',
      },
      created_at: at(90),
    });
  }

  if (status === 'CANCELLED') {
    events.push({
      id: `${dealId}-event-cancelled`,
      deal_id: dealId,
      event_type: 'cancelled',
      actor_id: null,
      message: 'Development fixture: room cancelled before protected execution.',
      tx_hash: null,
      proof_hash: null,
      metadata: { no_slashing_before_lock: true, fixture_kind: 'development_visual_state_gallery' },
      created_at: at(64),
    });
  }

  return events;
}

function buildEvidence(status: DealStateGalleryStatus, dealId: string): DbEvidenceFile[] {
  if (!['PROOF_SUBMITTED', 'DELIVERED', 'COMPLETED'].includes(status)) {
    return [];
  }

  return [
    {
      id: `${dealId}-evidence-photo`,
      deal_id: dealId,
      submitted_by: SELLER_ID,
      evidence_kind: 'delivery_photo',
      original_filename: 'red-chili-loading-bay.jpg',
      mime_type: 'image/jpeg',
      byte_size: 1842000,
      sha256_hash: proofHash(status),
      display_visibility: 'deal_only',
      chain_operation_reference: ['DELIVERED', 'COMPLETED'].includes(status)
        ? txHash(status, 'proof')
        : null,
      created_at: at(52),
    },
  ];
}

function buildReputationEvents(status: DealStateGalleryStatus, dealId: string): DbReputationEvent[] {
  if (status === 'COMPLETED') {
    return [
      {
        id: `${dealId}-rep-buyer`,
        deal_id: dealId,
        participant_id: BUYER_ID,
        participant_role: 'buyer',
        reputation_outcome: 'transaction_completed',
        reputation_rule_version: 'aurora-fixture-v1',
        idempotency_key: `${dealId}:buyer:completed`,
        score_delta: 2,
        volume_delta_idr: 19950000,
        transaction_hash: txHash(status, 'settlement'),
        proof_hash: proofHash(status),
        settlement_reference: txHash(status, 'settlement'),
        settled_at: at(74),
        created_at: at(74),
      },
      {
        id: `${dealId}-rep-seller`,
        deal_id: dealId,
        participant_id: SELLER_ID,
        participant_role: 'seller',
        reputation_outcome: 'transaction_completed',
        reputation_rule_version: 'aurora-fixture-v1',
        idempotency_key: `${dealId}:seller:completed`,
        score_delta: 2,
        volume_delta_idr: 19950000,
        transaction_hash: txHash(status, 'settlement'),
        proof_hash: proofHash(status),
        settlement_reference: txHash(status, 'settlement'),
        settled_at: at(74),
        created_at: at(74),
      },
    ];
  }

  if (status === 'REFUNDED') {
    return [
      {
        id: `${dealId}-rep-buyer-refund`,
        deal_id: dealId,
        participant_id: BUYER_ID,
        participant_role: 'buyer',
        reputation_outcome: 'seller_failed_deposit',
        reputation_rule_version: 'aurora-fixture-v1',
        idempotency_key: `${dealId}:buyer:refund`,
        score_delta: 0,
        volume_delta_idr: 0,
        transaction_hash: txHash(status, 'refund'),
        proof_hash: null,
        settlement_reference: txHash(status, 'refund'),
        settled_at: at(90),
        created_at: at(90),
      },
      {
        id: `${dealId}-rep-seller-refund`,
        deal_id: dealId,
        participant_id: SELLER_ID,
        participant_role: 'seller',
        reputation_outcome: 'seller_failed_deposit',
        reputation_rule_version: 'aurora-fixture-v1',
        idempotency_key: `${dealId}:seller:refund`,
        score_delta: -4,
        volume_delta_idr: 0,
        transaction_hash: txHash(status, 'refund'),
        proof_hash: null,
        settlement_reference: txHash(status, 'refund'),
        settled_at: at(90),
        created_at: at(90),
      },
    ];
  }

  return [];
}

export function buildDealStateGalleryFixtures() {
  return DEAL_STATE_GALLERY_STATUSES.map((status) => {
    const deal = buildDeal(status);
    const offer = buildOffer(status);
    return {
      status,
      deal,
      offer,
      events: buildEvents(status, deal.id),
      evidence: buildEvidence(status, deal.id),
      reputationEvents: buildReputationEvents(status, deal.id),
    };
  });
}
