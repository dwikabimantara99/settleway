/* eslint-disable @typescript-eslint/no-explicit-any */
import { demoProfiles, demoListings, demoBuyerRequests, demoDeals } from '../demo/demo-data';
import { DbProfile, DbListing, DbBuyerRequest, DbDeal, DbEscrowEvent } from './types';

const toDbProfile = (p: any): DbProfile => ({
  id: p.id,
  display_name: p.displayName,
  role_label: p.roleLabel,
  location: p.location,
  user_type: p.userType,
  seller_score: p.sellerScore,
  buyer_score: p.buyerScore,
  seller_completed_count: p.sellerCompletedCount,
  buyer_completed_count: p.buyerCompletedCount,
  verified_volume_idr: p.verifiedVolumeIdr,
  proof_visibility: p.proofVisibility,
  created_at: new Date().toISOString(),
});

const toDbListing = (l: any): DbListing => ({
  id: l.id,
  seller_id: l.sellerId,
  commodity: l.commodity,
  variety: l.variety || null,
  status: l.status,
  location: l.location || null,
  estimated_volume_kg: l.estimatedVolumeKg || null,
  price_per_kg_idr: l.pricePerKgIdr || null,
  estimated_value_idr: l.estimatedValueIdr || null,
  harvest_date: l.harvestDate || null,
  description: l.description || null,
  created_at: new Date().toISOString(),
});

const toDbBuyerRequest = (r: any): DbBuyerRequest => ({
  id: r.id,
  buyer_id: r.buyerId,
  commodity: r.commodity,
  required_volume_kg: r.requiredVolumeKg || null,
  target_price_per_kg_idr: r.targetPricePerKgIdr || null,
  delivery_location: r.deliveryLocation || null,
  required_by: r.requiredDate || null,
  description: r.description || null,
  status: r.status,
  created_at: new Date().toISOString(),
});

const toDbDeal = (d: any): DbDeal => ({
  id: d.id,
  listing_id: d.listingId || null,
  buyer_request_id: d.buyerRequestId || null,
  buyer_id: d.buyerId,
  seller_id: d.sellerId,
  commodity: d.commodity,
  volume_kg: d.volumeKg || null,
  principal_idr: d.principalIdr,
  buyer_bond_idr: d.buyerBondIdr,
  seller_bond_idr: d.sellerBondIdr,
  buyer_fee_idr: d.buyerFeeIdr,
  seller_fee_idr: d.sellerFeeIdr,
  buyer_total_idr: d.buyerTotalIdr,
  seller_total_idr: d.sellerTotalIdr,
  status: d.status,
  stellar_mode: d.stellarMode,
  contract_id: null,
  latest_tx_hash: null,
  proof_hash: null,
  terms: {},
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

class MockStore {
  profiles: Map<string, DbProfile> = new Map();
  listings: Map<string, DbListing> = new Map();
  buyerRequests: Map<string, DbBuyerRequest> = new Map();
  deals: Map<string, DbDeal> = new Map();
  events: Map<string, DbEscrowEvent[]> = new Map(); // Keyed by dealId

  constructor() {
    this.seed();
  }

  seed() {
    this.profiles.clear();
    this.listings.clear();
    this.buyerRequests.clear();
    this.deals.clear();
    this.events.clear();

    Object.values(demoProfiles).forEach(p => this.profiles.set(p.id, toDbProfile(p)));
    demoListings.forEach(l => this.listings.set(l.id, toDbListing(l)));
    demoBuyerRequests.forEach(r => this.buyerRequests.set(r.id, toDbBuyerRequest(r)));
    Object.values(demoDeals).forEach(d => {
      this.deals.set(d.id, toDbDeal(d));
      this.events.set(d.id, []);
    });
  }

  updateDeal(dealId: string, partialDeal: Partial<DbDeal>) {
    const existing = this.deals.get(dealId);
    if (!existing) throw new Error('Deal not found');
    this.deals.set(dealId, { ...existing, ...partialDeal, updated_at: new Date().toISOString() });
  }

  addEvent(event: DbEscrowEvent) {
    const dealEvents = this.events.get(event.deal_id) || [];
    dealEvents.push(event);
    this.events.set(event.deal_id, dealEvents);
  }

  getDealEvents(dealId: string): DbEscrowEvent[] {
    return this.events.get(dealId) || [];
  }
}

declare global {
  var __mockStore: MockStore | undefined;
}

export const mockStore = globalThis.__mockStore || new MockStore();
if (process.env.NODE_ENV !== 'production') {
  globalThis.__mockStore = mockStore;
}
