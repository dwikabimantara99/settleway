import type {
  DbBuyerRequest,
  DbDealTerms,
  DbListing,
  DbNegotiationMessage,
  DbNotification,
  DbNotificationType,
  DbOffer,
} from '@/lib/db/types';
import type { DbDeal } from '@/lib/db/types';
import { buildActiveRoomDealTerms } from '@/lib/deals/terms';
import { resolveDealRoomDefaultStellarState } from '@/lib/stellar/server/deal-room-testnet-runtime';

const BUYER_BOND_BPS = 500;
const SELLER_BOND_BPS = 500;
const BUYER_FEE_BPS = 50;
const SELLER_FEE_BPS = 50;
const BPS_DENOMINATOR = 10_000;

function computeBpsAmount(principalIdr: number, bps: number): number {
  return Math.round((principalIdr * bps) / BPS_DENOMINATOR);
}

export function buildOfferFromListing(input: {
  id: string;
  listing: DbListing;
  buyerId: string;
  openingMessage: string | null;
  volumeKg: number;
  pricePerKgIdr: number;
  termsNote: string | null;
  now: string;
}): DbOffer {
  return {
    id: input.id,
    listing_id: input.listing.id,
    buyer_request_id: null,
    buyer_id: input.buyerId,
    seller_id: input.listing.seller_id,
    initiated_by_id: input.buyerId,
    commodity: input.listing.commodity,
    volume_kg: input.volumeKg,
    price_per_kg_idr: input.pricePerKgIdr,
    principal_idr: input.volumeKg * input.pricePerKgIdr,
    terms_note: input.termsNote,
    status: 'awaiting_counterparty_acceptance',
    latest_message_preview: input.openingMessage,
    terms_submitted_at: input.now,
    terms_accepted_at: null,
    terms_accepted_by_id: null,
    buyer_open_room_at: null,
    seller_open_room_at: null,
    active_deal_id: null,
    created_at: input.now,
    updated_at: input.now,
  };
}

export function buildOfferFromBuyerRequest(input: {
  id: string;
  buyerRequest: DbBuyerRequest;
  sellerId: string;
  openingMessage: string | null;
  volumeKg: number;
  pricePerKgIdr: number;
  termsNote: string | null;
  now: string;
}): DbOffer {
  return {
    id: input.id,
    listing_id: null,
    buyer_request_id: input.buyerRequest.id,
    buyer_id: input.buyerRequest.buyer_id,
    seller_id: input.sellerId,
    initiated_by_id: input.sellerId,
    commodity: input.buyerRequest.commodity,
    volume_kg: input.volumeKg,
    price_per_kg_idr: input.pricePerKgIdr,
    principal_idr: input.volumeKg * input.pricePerKgIdr,
    terms_note: input.termsNote,
    status: 'awaiting_counterparty_acceptance',
    latest_message_preview: input.openingMessage,
    terms_submitted_at: input.now,
    terms_accepted_at: null,
    terms_accepted_by_id: null,
    buyer_open_room_at: null,
    seller_open_room_at: null,
    active_deal_id: null,
    created_at: input.now,
    updated_at: input.now,
  };
}

export function buildOpeningMessage(input: {
  id: string;
  offerId: string;
  authorId: string;
  body: string;
  now: string;
}): DbNegotiationMessage {
  return {
    id: input.id,
    offer_id: input.offerId,
    author_id: input.authorId,
    body: input.body,
    created_at: input.now,
  };
}

export function getCounterpartyId(offer: DbOffer, actorId: string): string {
  return offer.buyer_id === actorId ? offer.seller_id : offer.buyer_id;
}

export function hasActorOpenedRoom(offer: DbOffer, actorId: string): boolean {
  return offer.buyer_id === actorId
    ? Boolean(offer.buyer_open_room_at)
    : Boolean(offer.seller_open_room_at);
}

export function buildNotification(input: {
  id: string;
  recipientId: string;
  offerId: string;
  type: DbNotificationType;
  message: string;
  now: string;
}): DbNotification {
  return {
    id: input.id,
    recipient_id: input.recipientId,
    offer_id: input.offerId,
    type: input.type,
    message: input.message,
    read_at: null,
    created_at: input.now,
  };
}

export function buildDealFromOffer(input: {
  id: string;
  offer: DbOffer;
  now: string;
}): DbDeal {
  const principalIdr = input.offer.principal_idr;
  const buyerBondIdr = computeBpsAmount(principalIdr, BUYER_BOND_BPS);
  const sellerBondIdr = computeBpsAmount(principalIdr, SELLER_BOND_BPS);
  const buyerFeeIdr = computeBpsAmount(principalIdr, BUYER_FEE_BPS);
  const sellerFeeIdr = computeBpsAmount(principalIdr, SELLER_FEE_BPS);

  const depositWindowHours = 24;
  const terms: DbDealTerms = buildActiveRoomDealTerms({
    offerId: input.offer.id,
    activatedAt: input.now,
    depositWindowHours,
  });
  const stellarDefaults = resolveDealRoomDefaultStellarState();

  return {
    id: input.id,
    listing_id: input.offer.listing_id,
    buyer_request_id: input.offer.buyer_request_id,
    buyer_id: input.offer.buyer_id,
    seller_id: input.offer.seller_id,
    commodity: input.offer.commodity,
    volume_kg: input.offer.volume_kg,
    principal_idr: principalIdr,
    buyer_bond_idr: buyerBondIdr,
    seller_bond_idr: sellerBondIdr,
    buyer_fee_idr: buyerFeeIdr,
    seller_fee_idr: sellerFeeIdr,
    buyer_total_idr: principalIdr + buyerBondIdr + buyerFeeIdr,
    seller_total_idr: sellerBondIdr + sellerFeeIdr,
    status: 'WAITING_DEPOSITS',
    stellar_mode: stellarDefaults.stellar_mode,
    stellar_contract_id: stellarDefaults.stellar_contract_id,
    stellar_escrow_id: null,
    latest_stellar_tx_hash: null,
    stellar_sync_status: 'idle',
    proof_hash: null,
    terms,
    created_at: input.now,
    updated_at: input.now,
  };
}
