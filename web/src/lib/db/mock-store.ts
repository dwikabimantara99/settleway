/* eslint-disable @typescript-eslint/no-explicit-any */
import { demoProfiles, demoListings, demoBuyerRequests, demoDeals } from '../demo/demo-data';
import { transition, EscrowAction } from '../escrow/state-machine';
import { DbProfile, DbListing, DbBuyerRequest, DbDeal, DbEscrowEvent, DbEvidenceFile, DbReputationEvent } from './types';
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

export class MockStore {
  profiles: Map<string, DbProfile> = new Map();
  listings: Map<string, DbListing> = new Map();
  buyerRequests: Map<string, DbBuyerRequest> = new Map();
  deals: Map<string, DbDeal> = new Map();
  events: Map<string, DbEscrowEvent[]> = new Map(); // Keyed by dealId
  operations: Map<string, StellarOperation> = new Map();
  evidenceFiles: Map<string, DbEvidenceFile> = new Map();
  reputationEvents: Map<string, DbReputationEvent> = new Map();
  reputationIdempotencyKeys: Set<string> = new Set();

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
    this.evidenceFiles.clear();
    this.reputationEvents.clear();
    this.reputationIdempotencyKeys.clear();

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

  replaceDealIfCurrent(input: {
    current: DbDeal;
    next: DbDeal;
  }): {
    replaced: boolean;
    deal: DbDeal | null;
  } {
    const stored = this.deals.get(input.current.id);
    if (!stored) {
      return { replaced: false, deal: null };
    }

    const currentKeys = Object.keys(input.current) as (keyof DbDeal)[];
    const storedKeys = Object.keys(stored) as (keyof DbDeal)[];

    if (currentKeys.length !== storedKeys.length) return { replaced: false, deal: null };

    for (const key of currentKeys) {
      if (JSON.stringify(input.current[key]) !== JSON.stringify(stored[key])) {
        return { replaced: false, deal: null };
      }
    }

    const nextKeys = Object.keys(input.next) as (keyof DbDeal)[];
    for (const key of nextKeys) {
      if (key !== "status" && key !== "stellar_sync_status" && key !== "stellar_contract_id" && key !== "stellar_escrow_id" && key !== "latest_stellar_tx_hash" && key !== "updated_at") {
        if (JSON.stringify(input.next[key]) !== JSON.stringify(input.current[key])) {
          return { replaced: false, deal: null };
        }
      }
    }

    let isLegal = false;
    if (input.current.status === input.next.status) {
      isLegal = true;
    } else {
      const allActions: EscrowAction[] = [
        'buyer_deposit', 'seller_deposit', 'submit_proof',
        'mark_delivered', 'accept_delivery', 'expire', 'refund'
      ];
      for (const act of allActions) {
        try {
          const result = transition(input.current, act);
          if (result.status === input.next.status) {
            isLegal = true;
            break;
          }
        } catch {
          // ignore invalid transitions
        }
      }
    }

    if (!isLegal) {
      return { replaced: false, deal: null };
    }

    if (input.current.status === input.next.status) {
      if (
        input.current.stellar_sync_status === input.next.stellar_sync_status &&
        input.current.stellar_contract_id === input.next.stellar_contract_id &&
        input.current.stellar_escrow_id === input.next.stellar_escrow_id &&
        input.current.latest_stellar_tx_hash === input.next.latest_stellar_tx_hash &&
        input.current.updated_at === input.next.updated_at
      ) {
        return { replaced: false, deal: null };
      }
    }

    const defensiveCopy = JSON.parse(JSON.stringify(input.next));
    this.deals.set(input.current.id, defensiveCopy);
    return {
      replaced: true,
      deal: JSON.parse(JSON.stringify(defensiveCopy))
    };
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

  replaceStellarOperationIfCurrent(input: {
    current: StellarOperation;
    next: StellarOperation;
  }): {
    replaced: boolean;
    operation: StellarOperation | null;
  } {
    const stored = this.operations.get(input.current.idempotency_key);
    if (!stored) {
      return { replaced: false, operation: null };
    }

    // Deep equality check: every field of stored must match current
    const currentKeys = Object.keys(input.current) as (keyof StellarOperation)[];
    for (const key of currentKeys) {
      if (stored[key] !== input.current[key]) {
        return { replaced: false, operation: { ...stored } };
      }
    }
    // Also check stored has no extra keys
    const storedKeys = Object.keys(stored) as (keyof StellarOperation)[];
    if (storedKeys.length !== currentKeys.length) {
      return { replaced: false, operation: { ...stored } };
    }

    // Verify immutable intent fields unchanged between current and next
    const immutableFields: (keyof StellarOperation)[] = [
      "idempotency_key",
      "deal_id",
      "requested_action",
      "expected_local_status",
      "target_local_status",
      "stellar_method",
      "created_at",
    ];
    for (const field of immutableFields) {
      if (input.current[field] !== input.next[field]) {
        return { replaced: false, operation: { ...stored } };
      }
    }

    // Status validation
    if (input.next.operation_status !== input.current.operation_status) {
      // Allow unknown -> unknown as a special case
      const isUnknownToUnknown =
        input.current.operation_status === "unknown" &&
        input.next.operation_status === "unknown";
      if (!isUnknownToUnknown) {
        if (!canTransitionStellarOperation(input.current.operation_status, input.next.operation_status)) {
          return { replaced: false, operation: { ...stored } };
        }
      }
    } else {
      // Same-status replacement: only allow unknown -> unknown
      if (input.current.operation_status !== "unknown") {
        return { replaced: false, operation: { ...stored } };
      }
    }

    // CAS succeeds: store and return defensive copy
    this.operations.set(input.next.idempotency_key, { ...input.next });
    return { replaced: true, operation: { ...input.next } };
  }

  resetStellarOperations(): void {
    this.operations.clear();
  }

  // Evidence
  addEvidence(evidence: DbEvidenceFile) {
    if (!evidence || !evidence.id) {
      throw new Error('Invalid evidence input');
    }
    if (this.evidenceFiles.has(evidence.id)) {
      throw new Error('Evidence record already exists');
    }
    
    // Explicit allowlist to discard unknown properties
    const normalized: DbEvidenceFile = {
      id: evidence.id,
      deal_id: evidence.deal_id,
      submitted_by: evidence.submitted_by,
      evidence_kind: evidence.evidence_kind,
      original_filename: evidence.original_filename,
      mime_type: evidence.mime_type,
      byte_size: evidence.byte_size,
      sha256_hash: evidence.sha256_hash,
      display_visibility: evidence.display_visibility,
      chain_operation_reference: evidence.chain_operation_reference,
      created_at: evidence.created_at
    };

    const defensiveCopy = JSON.parse(JSON.stringify(normalized));
    this.evidenceFiles.set(normalized.id, defensiveCopy);
  }

  getEvidence(id: string): DbEvidenceFile | null {
    const ev = this.evidenceFiles.get(id);
    return ev ? JSON.parse(JSON.stringify(ev)) : null;
  }

  getDealEvidence(dealId: string): DbEvidenceFile[] {
    return Array.from(this.evidenceFiles.values())
      .filter(e => e.deal_id === dealId)
      .map(e => JSON.parse(JSON.stringify(e)));
  }

  // Reputation Events
  appendReputationEvent(event: DbReputationEvent): { appended: boolean, event: DbReputationEvent } {
    if (!event || !event.id || !event.idempotency_key) {
      throw new Error('Invalid reputation event input');
    }

    const existing = Array.from(this.reputationEvents.values()).find(e => e.idempotency_key === event.idempotency_key);
    
    if (existing) {
      if (
        existing.deal_id === event.deal_id &&
        existing.participant_id === event.participant_id &&
        existing.terminal_outcome === event.terminal_outcome &&
        existing.reputation_rule_version === event.reputation_rule_version &&
        existing.score_delta === event.score_delta &&
        existing.volume_delta_idr === event.volume_delta_idr
      ) {
        return { appended: false, event: JSON.parse(JSON.stringify(existing)) };
      }
      throw new Error('Idempotency conflict: conflicting business payload');
    }

    if (this.reputationEvents.has(event.id)) {
      throw new Error('Reputation event ID already exists');
    }

    const defensiveCopy = JSON.parse(JSON.stringify(event));
    this.reputationEvents.set(event.id, defensiveCopy);
    this.reputationIdempotencyKeys.add(event.idempotency_key);
    
    return { appended: true, event: JSON.parse(JSON.stringify(event)) };
  }

  getReputationEvent(id: string): DbReputationEvent | null {
    const ev = this.reputationEvents.get(id);
    return ev ? JSON.parse(JSON.stringify(ev)) : null;
  }

  getParticipantReputationEvents(participantId: string): DbReputationEvent[] {
    return Array.from(this.reputationEvents.values())
      .filter(e => e.participant_id === participantId)
      .map(e => JSON.parse(JSON.stringify(e)));
  }

  getDealReputationEvents(dealId: string): DbReputationEvent[] {
    return Array.from(this.reputationEvents.values())
      .filter(e => e.deal_id === dealId)
      .map(e => JSON.parse(JSON.stringify(e)));
  }
}

declare global {
  var __mockStore: MockStore | undefined;
}

export const mockStore = globalThis.__mockStore || new MockStore();
if (process.env.NODE_ENV !== 'production') {
  globalThis.__mockStore = mockStore;
}
