/* eslint-disable @typescript-eslint/no-explicit-any */
import { demoProfiles, demoListings, demoBuyerRequests, demoDeals } from '../demo/demo-data';
import { DbProfile, DbListing, DbBuyerRequest, DbDeal, DbEscrowEvent } from './types';
import { StellarOperation } from '../stellar/types';
import { canTransitionStellarOperation } from '../stellar/helpers';

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
  stellar_mode: d.stellarMode === "testnet" ? "testnet" : "mock_only",
  stellar_contract_id: null,
  stellar_escrow_id: null,
  latest_stellar_tx_hash: null,
  stellar_sync_status: "idle",
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
  operations: Map<string, StellarOperation> = new Map();

  constructor() {
    this.seed();
  }

  seed() {
    this.profiles.clear();
    this.listings.clear();
    this.buyerRequests.clear();
    this.deals.clear();
    this.events.clear();
    this.operations.clear();

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

  getStellarOperation(key: string): StellarOperation | null {
    const op = this.operations.get(key);
    return op ? { ...op } : null;
  }

  createStellarOperation(
    operation: StellarOperation,
  ): {
    created: boolean;
    operation: StellarOperation;
  } {
    if (this.operations.has(operation.idempotency_key)) {
      return {
        created: false,
        operation: { ...this.operations.get(operation.idempotency_key)! }
      };
    }
    this.operations.set(operation.idempotency_key, { ...operation });
    return {
      created: true,
      operation: { ...operation }
    };
  }

  updateStellarOperation(
    key: string,
    patch: Partial<
      Pick<
        StellarOperation,
        | "operation_status"
        | "transaction_hash"
        | "result_escrow_id"
        | "public_error_code"
        | "submitted_at"
        | "confirmed_at"
        | "updated_at"
      >
    >,
  ): StellarOperation | null {
    const existing = this.operations.get(key);
    if (!existing) return null;

    if (patch.operation_status && patch.operation_status !== existing.operation_status) {
      if (!canTransitionStellarOperation(existing.operation_status, patch.operation_status)) {
        throw new Error("Invalid Stellar operation status transition");
      }
    }

    const updated: StellarOperation = {
      ...existing,
      ...patch,
      idempotency_key: existing.idempotency_key,
      deal_id: existing.deal_id,
      requested_action: existing.requested_action,
      expected_local_status: existing.expected_local_status,
      target_local_status: existing.target_local_status,
      stellar_method: existing.stellar_method,
      created_at: existing.created_at,
    };

    this.operations.set(key, updated);
    return { ...updated };
  }

  findStellarOperationsByDeal(dealId: string): StellarOperation[] {
    const results: StellarOperation[] = [];
    for (const op of this.operations.values()) {
      if (op.deal_id === dealId) {
        results.push({ ...op });
      }
    }
    return results;
  }

  resetStellarOperations(): void {
    this.operations.clear();
  }
}

declare global {
  var __mockStore: MockStore | undefined;
}

export const mockStore = globalThis.__mockStore || new MockStore();
if (process.env.NODE_ENV !== 'production') {
  globalThis.__mockStore = mockStore;
}
