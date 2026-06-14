import { describe, it, expect, beforeEach } from "vitest";
import { coordinateDealExecution } from "./deal-execution-coordinator";
import { MockStore } from "../../db/mock-store";
import { MockStoreStellarOperationPersistence } from "./mock-store-execution-persistence";
import { MockStoreDealPersistence } from "./mock-store-deal-persistence";
import type { DbDeal } from "../../db/types";
import type { StellarExecutionAdapter } from "./adapter-contracts";
import type { StellarExecutionPublicMetadata } from "./execution-input-assembler";
import type { StellarAction } from "../types";

describe("Deal Execution Integration (Offline E2E)", () => {
  let store: MockStore;
  let opPersistence: MockStoreStellarOperationPersistence;
  let dealPersistence: MockStoreDealPersistence;
  let adapter: StellarExecutionAdapter;

  const validTx = "1111111111111111111111111111111111111111111111111111111111111111";
  const validHash = "0000000000000000000000000000000000000000000000000000000000000001";
  const validProof = "0000000000000000000000000000000000000000000000000000000000000002";

  beforeEach(() => {
    store = new MockStore();
    opPersistence = new MockStoreStellarOperationPersistence(store);
    dealPersistence = new MockStoreDealPersistence(store);
    adapter = {
      submit: async () => ({ outcome: "submitted", action: "create_deal", transaction_hash: validTx }),
      confirm: async () => ({ outcome: "confirmed", action: "create_deal", transaction_hash: validTx, result_escrow_id: "123" })
    } as import('./adapter-contracts').StellarExecutionAdapter;
  });

  function makeDeal(overrides: Partial<DbDeal> = {}): DbDeal {
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
      stellar_mode: "testnet",
      stellar_contract_id: "contract-1",
      stellar_escrow_id: "123",
      latest_stellar_tx_hash: null,
      stellar_sync_status: "idle",
      proof_hash: null,
      terms: {},
      created_at: "2023-01-01T00:00:00Z",
      updated_at: "2023-01-01T00:00:00Z",
      ...overrides,
    };
  }

  function makeMeta(): StellarExecutionPublicMetadata {
    return { contract_id: "contract-1", admin_address: "admin1", buyer_demo_address: "buyer1", seller_demo_address: "seller1" };
  }

  const plans = [
    { action: "create_deal", expected: null, target: "WAITING_DEPOSITS" },
    { action: "buyer_deposit", expected: "WAITING_DEPOSITS", target: "BUYER_FUNDED" },
    { action: "buyer_deposit", expected: "SELLER_FUNDED", target: "LOCKED" },
    { action: "seller_deposit", expected: "WAITING_DEPOSITS", target: "SELLER_FUNDED" },
    { action: "seller_deposit", expected: "BUYER_FUNDED", target: "LOCKED" },
    { action: "submit_proof", expected: "LOCKED", target: "PROOF_SUBMITTED" },
    { action: "mark_delivered", expected: "PROOF_SUBMITTED", target: "DELIVERED" },
    { action: "accept_delivery", expected: "DELIVERED", target: "COMPLETED" },
    { action: "expire", expected: "WAITING_DEPOSITS", target: "EXPIRED" },
    { action: "expire", expected: "BUYER_FUNDED", target: "REFUNDED" },
    { action: "expire", expected: "SELLER_FUNDED", target: "REFUNDED" },
    { action: "refund", expected: "BUYER_FUNDED", target: "REFUNDED" },
    { action: "refund", expected: "SELLER_FUNDED", target: "REFUNDED" },
  ] as const;

  it("Full 13-plan matrix happy path", async () => {
    for (const plan of plans) {
      store.seed(); // reset store each loop
      const initialStatus = plan.expected === null ? "WAITING_DEPOSITS" : plan.expected;
      const deal = makeDeal({
        status: initialStatus as import('../types').StellarAction,
        stellar_contract_id: "contract-1",
        stellar_escrow_id: plan.action === "create_deal" ? null : "123"
      });
      store.deals.set(deal.id, deal);

      // Force adapter to return specific escrow ID behavior
      adapter = {
        submit: async () => ({ outcome: "submitted", action: plan.action as import('../types').StellarAction, transaction_hash: validTx }),
        confirm: async () => ({ outcome: "confirmed", action: plan.action as import('../types').StellarAction, transaction_hash: validTx, result_escrow_id: plan.action === "create_deal" ? "123" : null })
      } as import('./adapter-contracts').StellarExecutionAdapter;

      const input: import('./deal-execution-coordinator').StellarDealExecutionCoordinatorInput = {
        action: plan.action as StellarAction,
        operation_id: `key-${plan.action}`,
        deal,
        metadata: makeMeta(),
        deal_hash: validHash,
        expires_at: "1700000000",
        proof_hash: validProof,
        existing_operation: null,
        stellar_contract_id: "contract-1",
        operation_timestamps: { created_at: "t1", updated_at: "t2" },
        local_commit_timestamp: "t3",
        operation_persistence: opPersistence,
        deal_persistence: dealPersistence,
        execution_adapter: adapter
      };

      const res = await coordinateDealExecution(input);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.next_deal.status).toBe(plan.target);
        expect(res.next_deal.stellar_sync_status).toBe("idle");

        // 1. operation persistence occurs
        const idempotencyKey = `v1:${deal.id}:${initialStatus === "WAITING_DEPOSITS" && plan.action === "create_deal" ? "CREATE" : initialStatus}:${plan.action}`;
        const op = store.getStellarOperation(idempotencyKey);
        expect(op).not.toBeNull();
        // 2. operation becomes confirmed
        expect(op?.operation_status).toBe("confirmed");
        // 7. transaction hash is persisted
        expect(op?.transaction_hash).toBe(validTx);
        // 8. create-deal escrow ID is synchronized
        if (plan.action === "create_deal") {
           expect(res.next_deal.stellar_escrow_id).toBe("123");
           expect(op?.result_escrow_id).toBe("123");
        } else {
           expect(op?.result_escrow_id).toBeNull();
           expect(res.next_deal.stellar_escrow_id).toBe("123");
        }

        // 13. identity and monetary remain unchanged
        expect(res.next_deal.buyer_id).toBe("b1");
        expect(res.next_deal.principal_idr).toBe(1000);
      }
    }
  });

  describe("Recovery matrix", () => {
    it("Unknown reconciliation", async () => {
      adapter = {
        submit: async () => ({ outcome: "submitted", action: "buyer_deposit", transaction_hash: validTx }),
        confirm: async () => ({ outcome: "unknown", action: "buyer_deposit", transaction_hash: validTx, error_code: "ERR_UNKNOWN", reconciliation_required: true, resubmission_allowed: false })
      } as import('./adapter-contracts').StellarExecutionAdapter;

      const deal = makeDeal();
      store.deals.set(deal.id, deal);
      let input: import('./deal-execution-coordinator').StellarDealExecutionCoordinatorInput = { action: "buyer_deposit", operation_id: "k1", deal, metadata: makeMeta(), existing_operation: null, stellar_contract_id: "contract-1", operation_timestamps: { created_at: "t1", updated_at: "t2" }, local_commit_timestamp: "t3", operation_persistence: opPersistence, deal_persistence: dealPersistence, execution_adapter: adapter };

      let res = await coordinateDealExecution(input);
      expect(res.ok).toBe(true);
      expect((res as import('../types').StellarAction).next_deal.stellar_sync_status).toBe("unknown");

      const idempotencyKey = `v1:${deal.id}:WAITING_DEPOSITS:buyer_deposit`;
      const op = store.getStellarOperation(idempotencyKey)!;
      expect(op).not.toBeUndefined();
      expect(op.operation_status).toBe("unknown");

      // Restart with stored unknown operation
      adapter = {
        submit: async () => { throw new Error("Should not resubmit"); },
        confirm: async () => ({ outcome: "confirmed", action: "buyer_deposit", transaction_hash: validTx, result_escrow_id: null })
      } as import('./adapter-contracts').StellarExecutionAdapter;

      input = { ...input, deal: (res as import('../types').StellarAction).next_deal, existing_operation: op, execution_adapter: adapter };
      res = await coordinateDealExecution(input);
      expect(res.ok).toBe(true);
      expect((res as import('../types').StellarAction).next_deal.status).toBe("BUYER_FUNDED");
      expect((res as import('../types').StellarAction).next_deal.stellar_sync_status).toBe("idle");
    });

    it("Pending restart", async () => {
      adapter = {
        submit: async () => ({ outcome: "failed", action: "buyer_deposit", stage: "submit", error_code: "ERR_NETWORK_FAILURE", retryable: true, transaction_hash: null }),
        confirm: async () => ({ outcome: "failed", action: "buyer_deposit", error_code: "ERR_UNKNOWN", retryable: true, transaction_hash: null })
      } as import('./adapter-contracts').StellarExecutionAdapter;

      const deal = makeDeal();
      const op: import('../types').StellarOperation = { idempotency_key: `v1:${deal.id}:WAITING_DEPOSITS:buyer_deposit`, deal_id: "deal-1", requested_action: "buyer_deposit", expected_local_status: "WAITING_DEPOSITS", target_local_status: "BUYER_FUNDED", stellar_method: "deposit_buyer", operation_status: "pending", transaction_hash: null, result_escrow_id: null, public_error_code: null, created_at: "t1", submitted_at: null, confirmed_at: null, updated_at: "t1" };

      const input: import('./deal-execution-coordinator').StellarDealExecutionCoordinatorInput = { action: "buyer_deposit", operation_id: "k1", deal, metadata: makeMeta(), existing_operation: op, stellar_contract_id: "contract-1", operation_timestamps: { created_at: "t1", updated_at: "t2" }, local_commit_timestamp: "t3", operation_persistence: opPersistence, deal_persistence: dealPersistence, execution_adapter: adapter };

      const res = await coordinateDealExecution(input);
      expect(res.ok).toBe(false);
      expect(res.reason).toBe("ERR_EXECUTION_SERVICE_FAILURE");
    });

    it("Confirmed restart", async () => {
      adapter = {
        submit: async () => { throw new Error("No"); },
        confirm: async () => { throw new Error("No"); }
      } as import('./adapter-contracts').StellarExecutionAdapter;

      const deal = makeDeal();
      store.deals.set(deal.id, deal);
      const op: import('../types').StellarOperation = { idempotency_key: `v1:${deal.id}:WAITING_DEPOSITS:buyer_deposit`, deal_id: "deal-1", requested_action: "buyer_deposit", expected_local_status: "WAITING_DEPOSITS", target_local_status: "BUYER_FUNDED", stellar_method: "deposit_buyer", operation_status: "confirmed", transaction_hash: validTx, result_escrow_id: null, public_error_code: null, created_at: "t1", submitted_at: "t2", confirmed_at: "t3", updated_at: "t3" };

      const input: import('./deal-execution-coordinator').StellarDealExecutionCoordinatorInput = { action: "buyer_deposit", operation_id: "k1", deal, metadata: makeMeta(), existing_operation: op, stellar_contract_id: "contract-1", operation_timestamps: { created_at: "t1", updated_at: "t2" }, local_commit_timestamp: "t3", operation_persistence: opPersistence, deal_persistence: dealPersistence, execution_adapter: adapter };

      const res = await coordinateDealExecution(input);
      expect(res.ok).toBe(true);
      expect((res as import('../types').StellarAction).next_deal.status).toBe("BUYER_FUNDED");
    });
  });

  describe("Failure matrix", () => {
    it("unsafe monetary value", async () => {
      const deal = makeDeal({ principal_idr: NaN, stellar_escrow_id: null });
      const input: import('./deal-execution-coordinator').StellarDealExecutionCoordinatorInput = { action: "create_deal", operation_id: "k1", deal_hash: validHash, expires_at: "1700000000", deal, metadata: makeMeta(), existing_operation: null, stellar_contract_id: "contract-1", operation_timestamps: { created_at: "t1", updated_at: "t2" }, local_commit_timestamp: "t3", operation_persistence: opPersistence, deal_persistence: dealPersistence, execution_adapter: adapter };
      const res = await coordinateDealExecution(input);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.reason).toBe("ERR_ASSEMBLY_FAILURE");
    });

    it("deal persistence unavailable", async () => {
       const deal = makeDeal();
       store.deals.set(deal.id, deal);
       const badDealPersistence: import('./mock-store-deal-persistence').StellarDealPersistencePort = { replaceIfCurrent: async () => ({ ok: false, reason: "unavailable" }) };

       adapter = {
         submit: async () => ({ outcome: "submitted", action: "buyer_deposit", transaction_hash: validTx }),
         confirm: async () => ({ outcome: "confirmed", action: "buyer_deposit", transaction_hash: validTx, result_escrow_id: null })
       } as import('./adapter-contracts').StellarExecutionAdapter;

       const input: import('./deal-execution-coordinator').StellarDealExecutionCoordinatorInput = { action: "buyer_deposit", operation_id: "k1", deal, metadata: makeMeta(), existing_operation: null, stellar_contract_id: "contract-1", operation_timestamps: { created_at: "t1", updated_at: "t2" }, local_commit_timestamp: "t3", operation_persistence: opPersistence, deal_persistence: badDealPersistence, execution_adapter: adapter };
       const res = await coordinateDealExecution(input);
       expect(res.ok).toBe(false);
       if (!res.ok) expect(res.reason).toBe("ERR_OUT_OF_SYNC");
    });
  });

  describe("Security and immutability", () => {
    it("no forbidden JSON property keys in results", async () => {
      const deal = makeDeal();
      store.deals.set(deal.id, deal);
      const input: import('./deal-execution-coordinator').StellarDealExecutionCoordinatorInput = { action: "buyer_deposit", operation_id: "k1", deal, metadata: makeMeta(), existing_operation: null, stellar_contract_id: "contract-1", operation_timestamps: { created_at: "t1", updated_at: "t2" }, local_commit_timestamp: "t3", operation_persistence: opPersistence, deal_persistence: dealPersistence, execution_adapter: adapter };
      const res = await coordinateDealExecution(input);

      const jsonStr = JSON.stringify(res);
      const forbidden = [
        "secret", "secret_seed", "private_key", "keypair", "rpc", "rpc_client",
        "environment", "sdk_transaction", "database", "repository", "callback",
        "adapter", "persistence"
      ];
      for (const word of forbidden) {
        expect(jsonStr).not.toContain(`"${word}":`);
      }
    });
  });
});
