import { describe, it, expect, beforeEach, expectTypeOf } from "vitest";
import { MockStore } from "../db/mock-store";
import type { StellarOperation } from "./types";

function createValidOperation(
  idempotency_key: string,
  deal_id: string
): StellarOperation {
  return {
    idempotency_key,
    deal_id,
    requested_action: "create_deal",
    expected_local_status: null,
    target_local_status: "LOCKED",
    stellar_method: "initialize",
    operation_status: "pending",
    transaction_hash: null,
    result_escrow_id: null,
    public_error_code: null,
    submitted_at: null,
    confirmed_at: null,
    created_at: "2023-01-01T00:00:00Z",
    updated_at: "2023-01-01T00:00:00Z",
  };
}

describe("MockStore - Stellar Operations", () => {
  let store: MockStore;

  beforeEach(() => {
    store = new MockStore();
    // store.seed() runs in constructor, operations are empty
  });

  it("returns created: true on first operation creation and stores the operation", () => {
    const op = createValidOperation("key1", "deal1");
    const result = store.createStellarOperation(op);
    expect(result.created).toBe(true);
    expect(result.operation).toEqual(op);
    expect(store.getStellarOperation("key1")).toEqual(op);
  });

  it("returns created: false on duplicate creation and does not overwrite", () => {
    const op1 = createValidOperation("key1", "deal1");
    store.createStellarOperation(op1);

    const op2 = createValidOperation("key1", "deal1");
    op2.operation_status = "submitted"; // Mutated duplicate attempt
    const result = store.createStellarOperation(op2);

    expect(result.created).toBe(false);
    expect(result.operation.operation_status).toBe("pending"); // Returns original
    expect(store.getStellarOperation("key1")?.operation_status).toBe("pending");
  });

  it("does not mutate storage when returned object from createStellarOperation is mutated", () => {
    const op = createValidOperation("key1", "deal1");
    const result = store.createStellarOperation(op);
    result.operation.operation_status = "submitted";
    expect(store.getStellarOperation("key1")?.operation_status).toBe("pending");
  });

  it("does not mutate storage when returned object from getStellarOperation is mutated", () => {
    const op = createValidOperation("key1", "deal1");
    store.createStellarOperation(op);
    const retrieved = store.getStellarOperation("key1");
    if (retrieved) {
      retrieved.operation_status = "submitted";
    }
    expect(store.getStellarOperation("key1")?.operation_status).toBe("pending");
  });

  it("returns null when looking up a missing operation", () => {
    expect(store.getStellarOperation("missing")).toBeNull();
  });

  it("returns null when updating a missing operation", () => {
    expect(store.updateStellarOperation("missing", { operation_status: "submitted" })).toBeNull();
  });

  it("accepts a valid transition and persists approved patch fields", () => {
    const op = createValidOperation("key1", "deal1");
    store.createStellarOperation(op);

    const updated = store.updateStellarOperation("key1", {
      operation_status: "submitted",
      transaction_hash: "hash123",
      updated_at: "2023-01-02T00:00:00Z",
    });

    expect(updated?.operation_status).toBe("submitted");
    expect(updated?.transaction_hash).toBe("hash123");

    const retrieved = store.getStellarOperation("key1");
    expect(retrieved?.operation_status).toBe("submitted");
    expect(retrieved?.transaction_hash).toBe("hash123");
    expect(retrieved?.updated_at).toBe("2023-01-02T00:00:00Z");
  });

  it("accepts an unchanged-status patch", () => {
    const op = createValidOperation("key1", "deal1");
    store.createStellarOperation(op);

    const updated = store.updateStellarOperation("key1", {
      operation_status: "pending",
      transaction_hash: "hash123",
    });

    expect(updated?.operation_status).toBe("pending");
    expect(updated?.transaction_hash).toBe("hash123");
  });

  it("throws exact error on invalid transition and leaves record unchanged", () => {
    const op = createValidOperation("key1", "deal1");
    store.createStellarOperation(op);

    expect(() =>
      store.updateStellarOperation("key1", {
        operation_status: "confirmed",
        transaction_hash: "hash123",
      })
    ).toThrowError("Invalid Stellar operation status transition");

    const retrieved = store.getStellarOperation("key1");
    expect(retrieved?.operation_status).toBe("pending");
    expect(retrieved?.transaction_hash).toBeNull();
  });

  it("protects terminal status: confirmed cannot transition", () => {
    const op = createValidOperation("key1", "deal1");
    store.createStellarOperation(op);
    store.updateStellarOperation("key1", { operation_status: "submitted" });
    store.updateStellarOperation("key1", { operation_status: "confirmed" });

    expect(() =>
      store.updateStellarOperation("key1", { operation_status: "pending" })
    ).toThrowError("Invalid Stellar operation status transition");

    expect(() =>
      store.updateStellarOperation("key1", { operation_status: "failed" })
    ).toThrowError("Invalid Stellar operation status transition");
  });

  it("protects terminal status: failed cannot transition", () => {
    const op = createValidOperation("key1", "deal1");
    store.createStellarOperation(op);
    store.updateStellarOperation("key1", { operation_status: "failed" });

    expect(() =>
      store.updateStellarOperation("key1", { operation_status: "pending" })
    ).toThrowError("Invalid Stellar operation status transition");

    expect(() =>
      store.updateStellarOperation("key1", { operation_status: "confirmed" })
    ).toThrowError("Invalid Stellar operation status transition");
  });

  it("allows unknown -> confirmed transition", () => {
    const op = createValidOperation("key1", "deal1");
    store.createStellarOperation(op);
    store.updateStellarOperation("key1", { operation_status: "submitted" });
    store.updateStellarOperation("key1", { operation_status: "unknown" });
    store.updateStellarOperation("key1", { operation_status: "confirmed" });

    expect(store.getStellarOperation("key1")?.operation_status).toBe("confirmed");
  });

  it("findStellarOperationsByDeal filters, preserves order, and returns shallow copies", () => {
    store.createStellarOperation(createValidOperation("key1", "deal1"));
    store.createStellarOperation(createValidOperation("key2", "deal2"));
    store.createStellarOperation(createValidOperation("key3", "deal1"));

    const results = store.findStellarOperationsByDeal("deal1");
    expect(results.length).toBe(2);
    expect(results[0].idempotency_key).toBe("key1");
    expect(results[1].idempotency_key).toBe("key3");

    results[0].operation_status = "failed";
    expect(store.getStellarOperation("key1")?.operation_status).toBe("pending");
  });

  it("resetStellarOperations clears operations but not other maps", () => {
    store.createStellarOperation(createValidOperation("key1", "deal1"));
    expect(store.findStellarOperationsByDeal("deal1").length).toBe(1);
    expect(store.deals.size).toBeGreaterThan(0); // From seed

    store.resetStellarOperations();

    expect(store.findStellarOperationsByDeal("deal1").length).toBe(0);
    expect(store.deals.size).toBeGreaterThan(0);
  });

  it("full seed() clears operations", () => {
    store.createStellarOperation(createValidOperation("key1", "deal1"));
    store.seed();
    expect(store.findStellarOperationsByDeal("deal1").length).toBe(0);
  });

  it("duplicate creation cannot overwrite transaction_hash, operation_status, etc.", () => {
    const op1 = createValidOperation("key1", "deal1");
    store.createStellarOperation(op1);
    store.updateStellarOperation("key1", {
      operation_status: "submitted",
      transaction_hash: "hash1",
    });

    const op2 = createValidOperation("key1", "deal1");
    op2.transaction_hash = "hash2";
    op2.operation_status = "confirmed";
    op2.target_local_status = "DELIVERED";
    op2.stellar_method = "submit_proof";
    op2.created_at = "2023-12-31T23:59:59Z";

    const result = store.createStellarOperation(op2);
    expect(result.created).toBe(false);

    const retrieved = store.getStellarOperation("key1");
    expect(retrieved?.operation_status).toBe("submitted");
    expect(retrieved?.transaction_hash).toBe("hash1");
    expect(retrieved?.target_local_status).toBe("LOCKED");
    expect(retrieved?.stellar_method).toBe("initialize");
    expect(retrieved?.created_at).toBe("2023-01-01T00:00:00Z");
  });

  it("type checks identity fields", () => {
    type UpdatePatch = Parameters<typeof store.updateStellarOperation>[1];

    expectTypeOf<UpdatePatch>().not.toHaveProperty('idempotency_key');
    expectTypeOf<UpdatePatch>().not.toHaveProperty('deal_id');
    expectTypeOf<UpdatePatch>().not.toHaveProperty('requested_action');
    expectTypeOf<UpdatePatch>().not.toHaveProperty('expected_local_status');
    expectTypeOf<UpdatePatch>().not.toHaveProperty('target_local_status');
    expectTypeOf<UpdatePatch>().not.toHaveProperty('stellar_method');
    expectTypeOf<UpdatePatch>().not.toHaveProperty('created_at');
  });

  describe("replaceStellarOperationIfCurrent (CAS)", () => {
    function makeOp(overrides: Partial<StellarOperation> = {}): StellarOperation {
      return {
        idempotency_key: "cas-key",
        deal_id: "cas-deal",
        requested_action: "create_deal",
        expected_local_status: null,
        target_local_status: "WAITING_DEPOSITS",
        stellar_method: "create_escrow",
        operation_status: "pending",
        transaction_hash: null,
        result_escrow_id: null,
        public_error_code: null,
        submitted_at: null,
        confirmed_at: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        ...overrides,
      };
    }

    it("successful pending → submitted CAS", () => {
      const pending = makeOp();
      store.createStellarOperation(pending);
      const next = makeOp({ operation_status: "submitted", transaction_hash: "tx1", submitted_at: "2024-01-01T01:00:00Z", updated_at: "2024-01-01T01:00:00Z" });
      const res = store.replaceStellarOperationIfCurrent({ current: pending, next });
      expect(res.replaced).toBe(true);
      expect(res.operation?.operation_status).toBe("submitted");
      expect(store.getStellarOperation("cas-key")?.operation_status).toBe("submitted");
    });

    it("successful pending → failed CAS", () => {
      const pending = makeOp();
      store.createStellarOperation(pending);
      const next = makeOp({ operation_status: "failed", transaction_hash: null, public_error_code: "ERR_VALIDATION", updated_at: "2024-01-01T01:00:00Z" });
      const res = store.replaceStellarOperationIfCurrent({ current: pending, next });
      expect(res.replaced).toBe(true);
      expect(res.operation?.operation_status).toBe("failed");
    });

    it("successful submitted → confirmed CAS", () => {
      const submitted = makeOp({ operation_status: "submitted", transaction_hash: "tx1", submitted_at: "2024-01-01T01:00:00Z", updated_at: "2024-01-01T01:00:00Z" });
      store.createStellarOperation(submitted);
      const next = makeOp({ operation_status: "confirmed", transaction_hash: "tx1", submitted_at: "2024-01-01T01:00:00Z", confirmed_at: "2024-01-01T02:00:00Z", result_escrow_id: "esc1", updated_at: "2024-01-01T02:00:00Z" });
      const res = store.replaceStellarOperationIfCurrent({ current: submitted, next });
      expect(res.replaced).toBe(true);
      expect(res.operation?.operation_status).toBe("confirmed");
    });

    it("successful submitted → failed CAS", () => {
      const submitted = makeOp({ operation_status: "submitted", transaction_hash: "tx1", submitted_at: "2024-01-01T01:00:00Z", updated_at: "2024-01-01T01:00:00Z" });
      store.createStellarOperation(submitted);
      const next = makeOp({ operation_status: "failed", transaction_hash: "tx1", submitted_at: "2024-01-01T01:00:00Z", public_error_code: "ERR_CONTRACT_REJECTED", updated_at: "2024-01-01T02:00:00Z" });
      const res = store.replaceStellarOperationIfCurrent({ current: submitted, next });
      expect(res.replaced).toBe(true);
      expect(res.operation?.operation_status).toBe("failed");
    });

    it("successful submitted → unknown CAS", () => {
      const submitted = makeOp({ operation_status: "submitted", transaction_hash: "tx1", submitted_at: "2024-01-01T01:00:00Z", updated_at: "2024-01-01T01:00:00Z" });
      store.createStellarOperation(submitted);
      const next = makeOp({ operation_status: "unknown", transaction_hash: "tx1", submitted_at: "2024-01-01T01:00:00Z", public_error_code: "ERR_UNKNOWN", updated_at: "2024-01-01T02:00:00Z" });
      const res = store.replaceStellarOperationIfCurrent({ current: submitted, next });
      expect(res.replaced).toBe(true);
      expect(res.operation?.operation_status).toBe("unknown");
    });

    it("successful unknown → confirmed CAS", () => {
      const unknown = makeOp({ operation_status: "unknown", transaction_hash: "tx1", submitted_at: "2024-01-01T01:00:00Z", public_error_code: "ERR_UNKNOWN", updated_at: "2024-01-01T02:00:00Z" });
      store.createStellarOperation(unknown);
      const next = makeOp({ operation_status: "confirmed", transaction_hash: "tx1", submitted_at: "2024-01-01T01:00:00Z", confirmed_at: "2024-01-01T03:00:00Z", result_escrow_id: "esc1", updated_at: "2024-01-01T03:00:00Z" });
      const res = store.replaceStellarOperationIfCurrent({ current: unknown, next });
      expect(res.replaced).toBe(true);
      expect(res.operation?.operation_status).toBe("confirmed");
    });

    it("successful unknown → failed CAS", () => {
      const unknown = makeOp({ operation_status: "unknown", transaction_hash: "tx1", submitted_at: "2024-01-01T01:00:00Z", public_error_code: "ERR_UNKNOWN", updated_at: "2024-01-01T02:00:00Z" });
      store.createStellarOperation(unknown);
      const next = makeOp({ operation_status: "failed", transaction_hash: "tx1", submitted_at: "2024-01-01T01:00:00Z", public_error_code: "ERR_CONTRACT_REJECTED", confirmed_at: "2024-01-01T03:00:00Z", updated_at: "2024-01-01T03:00:00Z" });
      const res = store.replaceStellarOperationIfCurrent({ current: unknown, next });
      expect(res.replaced).toBe(true);
      expect(res.operation?.operation_status).toBe("failed");
    });

    it("successful unknown → unknown metadata refresh", () => {
      const unknown = makeOp({ operation_status: "unknown", transaction_hash: "tx1", submitted_at: "2024-01-01T01:00:00Z", public_error_code: "ERR_UNKNOWN", updated_at: "2024-01-01T02:00:00Z" });
      store.createStellarOperation(unknown);
      const next = makeOp({ operation_status: "unknown", transaction_hash: "tx1", submitted_at: "2024-01-01T01:00:00Z", public_error_code: "ERR_TIMEOUT", updated_at: "2024-01-01T03:00:00Z" });
      const res = store.replaceStellarOperationIfCurrent({ current: unknown, next });
      expect(res.replaced).toBe(true);
      expect(res.operation?.public_error_code).toBe("ERR_TIMEOUT");
    });

    it("missing operation returns replaced:false, operation:null", () => {
      const current = makeOp();
      const next = makeOp({ operation_status: "submitted", transaction_hash: "tx1", updated_at: "2024-01-01T01:00:00Z" });
      const res = store.replaceStellarOperationIfCurrent({ current, next });
      expect(res.replaced).toBe(false);
      expect(res.operation).toBeNull();
    });

    it("stale current snapshot fails CAS", () => {
      const pending = makeOp();
      store.createStellarOperation(pending);
      const submitted = makeOp({ operation_status: "submitted", transaction_hash: "tx1", submitted_at: "2024-01-01T01:00:00Z", updated_at: "2024-01-01T01:00:00Z" });
      store.replaceStellarOperationIfCurrent({ current: pending, next: submitted });
      const next2 = makeOp({ operation_status: "submitted", transaction_hash: "tx2", updated_at: "2024-01-01T02:00:00Z" });
      const res = store.replaceStellarOperationIfCurrent({ current: pending, next: next2 });
      expect(res.replaced).toBe(false);
      expect(res.operation?.operation_status).toBe("submitted");
    });

    it("changed immutable intent field rejects CAS", () => {
      const pending = makeOp();
      store.createStellarOperation(pending);
      const next = makeOp({ operation_status: "submitted", transaction_hash: "tx1", deal_id: "other-deal", updated_at: "2024-01-01T01:00:00Z" });
      const res = store.replaceStellarOperationIfCurrent({ current: pending, next });
      expect(res.replaced).toBe(false);
      expect(res.operation?.operation_status).toBe("pending");
    });

    it("illegal status transition rejects CAS", () => {
      const pending = makeOp();
      store.createStellarOperation(pending);
      const next = makeOp({ operation_status: "confirmed", transaction_hash: "tx1", updated_at: "2024-01-01T01:00:00Z" });
      const res = store.replaceStellarOperationIfCurrent({ current: pending, next });
      expect(res.replaced).toBe(false);
      expect(res.operation?.operation_status).toBe("pending");
    });

    it("generic same-status replacement rejection", () => {
      const pending = makeOp();
      store.createStellarOperation(pending);
      const next = makeOp({ updated_at: "2024-01-01T01:00:00Z" });
      const res = store.replaceStellarOperationIfCurrent({ current: pending, next });
      expect(res.replaced).toBe(false);
    });

    it("failed CAS leaves storage unchanged", () => {
      const pending = makeOp();
      store.createStellarOperation(pending);
      const next = makeOp({ operation_status: "confirmed", transaction_hash: "tx1", updated_at: "2024-01-01T01:00:00Z" });
      store.replaceStellarOperationIfCurrent({ current: pending, next });
      const stored = store.getStellarOperation("cas-key");
      expect(stored?.operation_status).toBe("pending");
      expect(stored?.transaction_hash).toBeNull();
    });

    it("caller objects are not mutated", () => {
      const pending = makeOp();
      store.createStellarOperation(pending);
      const current = makeOp();
      const next = makeOp({ operation_status: "submitted", transaction_hash: "tx1", updated_at: "2024-01-01T01:00:00Z" });
      const currentOriginal = JSON.parse(JSON.stringify(current));
      const nextOriginal = JSON.parse(JSON.stringify(next));
      store.replaceStellarOperationIfCurrent({ current, next });
      expect(current).toStrictEqual(currentOriginal);
      expect(next).toStrictEqual(nextOriginal);
    });

    it("returned value is a defensive copy", () => {
      const pending = makeOp();
      store.createStellarOperation(pending);
      const next = makeOp({ operation_status: "submitted", transaction_hash: "tx1", updated_at: "2024-01-01T01:00:00Z" });
      const res = store.replaceStellarOperationIfCurrent({ current: pending, next });
      expect(res.replaced).toBe(true);
      if (res.operation) {
        res.operation.operation_status = "confirmed";
      }
      expect(store.getStellarOperation("cas-key")?.operation_status).toBe("submitted");
    });
  });
});
  describe("replaceDealIfCurrent (CAS)", () => {
    let store: import('../db/mock-store').MockStore;
    beforeEach(() => { store = new (MockStore)(); });
    function makeDeal(overrides: Partial<import('../db/types').DbDeal> = {}): import('../db/types').DbDeal {
      return {
        id: "deal-1",
        listing_id: "listing-1",
        buyer_request_id: null,
        buyer_id: "b1",
        seller_id: "s1",
        commodity: "Coffee",
        volume_kg: 100,
        principal_idr: 1000,
        buyer_bond_idr: 100,
        seller_bond_idr: 100,
        buyer_fee_idr: 10,
        seller_fee_idr: 10,
        buyer_total_idr: 1110,
        seller_total_idr: 890,
        status: "WAITING_DEPOSITS",
        stellar_mode: "mock_only",
        stellar_contract_id: null,
        stellar_escrow_id: null,
        latest_stellar_tx_hash: null,
        stellar_sync_status: "idle",
        created_at: "2023-01-01T00:00:00Z",
        updated_at: "2023-01-01T00:00:00Z",
        ...overrides
      };
    }

    it("synchronization-only update", () => {
      const current = makeDeal();
      store.deals.set(current.id, current);
      const next = makeDeal({ stellar_sync_status: "pending", updated_at: "2023-01-01T01:00:00Z" });
      const res = store.replaceDealIfCurrent({ current, next });
      expect(res.replaced).toBe(true);
      expect(res.deal?.stellar_sync_status).toBe("pending");
    });

    it("create-deal contract/escrow synchronization", () => {
      const current = makeDeal();
      store.deals.set(current.id, current);
      const next = makeDeal({ stellar_contract_id: "c1", stellar_escrow_id: "e1", updated_at: "2023-01-01T01:00:00Z" });
      const res = store.replaceDealIfCurrent({ current, next });
      expect(res.replaced).toBe(true);
      expect(res.deal?.stellar_contract_id).toBe("c1");
    });

    it("every legal lifecycle transition used by the 13 canonical plans", () => {
      const transitions = [
        ["WAITING_DEPOSITS", "BUYER_FUNDED"],
        ["WAITING_DEPOSITS", "SELLER_FUNDED"],
        ["WAITING_DEPOSITS", "EXPIRED"],
        ["BUYER_FUNDED", "LOCKED"],
        ["BUYER_FUNDED", "REFUNDED"],

        ["SELLER_FUNDED", "LOCKED"],
        ["SELLER_FUNDED", "REFUNDED"],

        ["LOCKED", "PROOF_SUBMITTED"],
        ["PROOF_SUBMITTED", "DELIVERED"],
        ["DELIVERED", "COMPLETED"]
      ];
      for (const [from, to] of transitions) {
        const current = makeDeal({ id: `d-${from}-${to}`, status: from as import('../db/types').DealStatus });
        store.deals.set(current.id, current);
        const next = makeDeal({ id: current.id, status: to as import('../db/types').DealStatus, updated_at: "2023-01-01T01:00:00Z" });
        const res = store.replaceDealIfCurrent({ current, next });
        expect(res.replaced).toBe(true);
      }
    });

    it("stale snapshot", () => {
      const current = makeDeal();
      store.deals.set(current.id, makeDeal({ status: "BUYER_FUNDED" }));
      const next = makeDeal({ status: "BUYER_FUNDED", updated_at: "2023-01-01T01:00:00Z" });
      const res = store.replaceDealIfCurrent({ current, next });
      expect(res.replaced).toBe(false);
    });

    it("missing deal", () => {
      const current = makeDeal();
      const next = makeDeal({ status: "BUYER_FUNDED", updated_at: "2023-01-01T01:00:00Z" });
      const res = store.replaceDealIfCurrent({ current, next });
      expect(res.replaced).toBe(false);
    });

    it("buyer identity mutation", () => {
      const current = makeDeal();
      store.deals.set(current.id, current);
      const next = makeDeal({ buyer_id: "hacked", updated_at: "2023-01-01T01:00:00Z" });
      expect(store.replaceDealIfCurrent({ current, next }).replaced).toBe(false);
    });

    it("seller identity mutation", () => {
      const current = makeDeal();
      store.deals.set(current.id, current);
      const next = makeDeal({ seller_id: "hacked", updated_at: "2023-01-01T01:00:00Z" });
      expect(store.replaceDealIfCurrent({ current, next }).replaced).toBe(false);
    });

    it("listing/request identity mutation", () => {
      const current = makeDeal();
      store.deals.set(current.id, current);
      const next = makeDeal({ listing_id: "hacked", updated_at: "2023-01-01T01:00:00Z" });
      expect(store.replaceDealIfCurrent({ current, next }).replaced).toBe(false);
    });

    it("monetary-field mutation", () => {
      const current = makeDeal();
      store.deals.set(current.id, current);
      const next = makeDeal({ principal_idr: 9999, updated_at: "2023-01-01T01:00:00Z" });
      expect(store.replaceDealIfCurrent({ current, next }).replaced).toBe(false);
    });

    it("Stellar-mode mutation", () => {
      const current = makeDeal();
      store.deals.set(current.id, current);
      const next = makeDeal({ stellar_mode: "testnet", updated_at: "2023-01-01T01:00:00Z" });
      expect(store.replaceDealIfCurrent({ current, next }).replaced).toBe(false);
    });

    it("created timestamp mutation", () => {
      const current = makeDeal();
      store.deals.set(current.id, current);
      const next = makeDeal({ created_at: "2025-01-01T01:00:00Z", updated_at: "2023-01-01T01:00:00Z" });
      expect(store.replaceDealIfCurrent({ current, next }).replaced).toBe(false);
    });

    it("unrelated-field mutation", () => {
      const current = makeDeal();
      store.deals.set(current.id, current);
      const next = makeDeal({ commodity: "hacked", updated_at: "2023-01-01T01:00:00Z" });
      expect(store.replaceDealIfCurrent({ current, next }).replaced).toBe(false);
    });

    it("illegal transition", () => {
      const current = makeDeal();
      store.deals.set(current.id, current);
      const next = makeDeal({ status: "COMPLETED", updated_at: "2023-01-01T01:00:00Z" });
      expect(store.replaceDealIfCurrent({ current, next }).replaced).toBe(false);
    });

    it("no-op rejection", () => {
      const current = makeDeal();
      store.deals.set(current.id, current);
      const next = makeDeal();
      expect(store.replaceDealIfCurrent({ current, next }).replaced).toBe(false);
    });

    it("storage immutability on failure", () => {
      const current = makeDeal();
      store.deals.set(current.id, current);
      const next = makeDeal({ status: "COMPLETED", updated_at: "2023-01-01T01:00:00Z" });
      store.replaceDealIfCurrent({ current, next });
      expect(store.deals.get(current.id)?.status).toBe("WAITING_DEPOSITS");
    });

    it("caller immutability", () => {
      const current = makeDeal();
      store.deals.set(current.id, current);
      const next = makeDeal({ status: "BUYER_FUNDED", updated_at: "2023-01-01T01:00:00Z" });
      const currentOriginal = JSON.parse(JSON.stringify(current));
      const nextOriginal = JSON.parse(JSON.stringify(next));
      store.replaceDealIfCurrent({ current, next });
      expect(current).toStrictEqual(currentOriginal);
      expect(next).toStrictEqual(nextOriginal);
    });

    it("defensive copies", () => {
      const current = makeDeal();
      store.deals.set(current.id, current);
      const next = makeDeal({ status: "BUYER_FUNDED", updated_at: "2023-01-01T01:00:00Z" });
      const res = store.replaceDealIfCurrent({ current, next });
      if (res.deal) { res.deal.status = "COMPLETED"; }
      expect(store.deals.get(current.id)?.status).toBe("BUYER_FUNDED");
    });
  });
