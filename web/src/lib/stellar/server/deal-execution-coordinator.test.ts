import { describe, it, expect, vi, beforeEach } from "vitest";
import { coordinateDealExecution } from "./deal-execution-coordinator";
import type { DbDeal } from "../../db/types";
import type { StellarExecutionPublicMetadata } from "./execution-input-assembler";

describe("Deal Execution Coordinator", () => {
  let mockAdapter: import('./adapter-contracts').StellarExecutionAdapter;
  let mockOpPersistence: import('./execution-service').StellarOperationPersistencePort;
  let mockDealPersistence: import('./mock-store-deal-persistence').StellarDealPersistencePort;

  beforeEach(() => {
    mockAdapter = {
      submit: vi.fn(),
      confirm: vi.fn(),
    };

    mockOpPersistence = {
      createPending: vi.fn(),
      replaceIfCurrent: vi.fn(),
    };

    mockDealPersistence = {
      replaceIfCurrent: vi.fn(),
    };
  });

  const validHash = "0000000000000000000000000000000000000000000000000000000000000001";
  const validTx = "1111111111111111111111111111111111111111111111111111111111111111";

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
    return {
      contract_id: "contract-1",
      admin_address: "admin1",
      buyer_demo_address: "buyer1",
      seller_demo_address: "seller1",
    };
  }

  it("successful create-deal synchronization", async () => {
    mockOpPersistence.createPending.mockResolvedValueOnce({ ok: true });
    mockAdapter.submit.mockResolvedValueOnce({ outcome: "submitted", action: "create_deal", transaction_hash: validTx });
    mockOpPersistence.replaceIfCurrent.mockResolvedValueOnce({ ok: true });
    mockAdapter.confirm.mockResolvedValueOnce({ outcome: "confirmed", action: "create_deal", transaction_hash: validTx, result_escrow_id: "123" });
    mockOpPersistence.replaceIfCurrent.mockResolvedValueOnce({ ok: true });
    mockDealPersistence.replaceIfCurrent.mockResolvedValueOnce({ ok: true });

    const input: import('./deal-execution-coordinator').StellarDealExecutionCoordinatorInput = {
      action: "create_deal",
      operation_id: "key1",
      deal: makeDeal({ stellar_contract_id: null, stellar_escrow_id: null }),
      metadata: makeMeta(),
      deal_hash: validHash,
      expires_at: "1700000000",
      existing_operation: null,
      stellar_contract_id: "contract-1",
      operation_timestamps: { created_at: "t1", updated_at: "t2" },
      local_commit_timestamp: "t3",
      operation_persistence: mockOpPersistence,
      deal_persistence: mockDealPersistence,
      execution_adapter: mockAdapter
    };

    const res = await coordinateDealExecution(input);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.next_deal.stellar_contract_id).toBe("contract-1");
      expect(res.next_deal.stellar_escrow_id).toBe("123");
    }
  });

  it("successful transition", async () => {
    mockOpPersistence.createPending.mockResolvedValueOnce({ ok: true });
    mockAdapter.submit.mockResolvedValueOnce({ outcome: "submitted", action: "buyer_deposit", transaction_hash: validTx });
    mockOpPersistence.replaceIfCurrent.mockResolvedValueOnce({ ok: true });
    mockAdapter.confirm.mockResolvedValueOnce({ outcome: "confirmed", action: "buyer_deposit", transaction_hash: validTx, result_escrow_id: null });
    mockOpPersistence.replaceIfCurrent.mockResolvedValueOnce({ ok: true });
    mockDealPersistence.replaceIfCurrent.mockResolvedValueOnce({ ok: true });

    const input: import('./deal-execution-coordinator').StellarDealExecutionCoordinatorInput = {
      action: "buyer_deposit",
      operation_id: "key1",
      deal: makeDeal(),
      metadata: makeMeta(),
      existing_operation: null,
      stellar_contract_id: "contract-1",
      operation_timestamps: { created_at: "t1", updated_at: "t2" },
      local_commit_timestamp: "t3",
      operation_persistence: mockOpPersistence,
      deal_persistence: mockDealPersistence,
      execution_adapter: mockAdapter
    };

    const res = await coordinateDealExecution(input);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.next_deal.status).toBe("BUYER_FUNDED");
    }
  });

  it("assembler failure", async () => {
    const input: import('./deal-execution-coordinator').StellarDealExecutionCoordinatorInput = {
      action: "buyer_deposit",
      operation_id: "key1",
      deal: makeDeal({ stellar_escrow_id: "not-a-number" }), // triggers assembly failure
      metadata: makeMeta(),
      existing_operation: null,
      stellar_contract_id: "contract-1",
      operation_timestamps: { created_at: "t1", updated_at: "t2" },
      local_commit_timestamp: "t3",
      operation_persistence: mockOpPersistence,
      deal_persistence: mockDealPersistence,
      execution_adapter: mockAdapter
    };
    const res = await coordinateDealExecution(input);
    expect(res).toStrictEqual({ ok: false, reason: "ERR_ASSEMBLY_FAILURE", error_code: "ERR_BUILD_VALIDATION", builder_error_code: "ERR_MALFORMED_U64", builder_field: "escrow_id" });
  });

  it("execution planner failure", async () => {
    const input: import('./deal-execution-coordinator').StellarDealExecutionCoordinatorInput = {
      action: "seller_deposit",
      operation_id: "key1",
      deal: makeDeal({ status: "SELLER_FUNDED" }), // invalid transition
      metadata: makeMeta(),
      existing_operation: null,
      stellar_contract_id: "contract-1",
      operation_timestamps: { created_at: "t1", updated_at: "t2" },
      local_commit_timestamp: "t3",
      operation_persistence: mockOpPersistence,
      deal_persistence: mockDealPersistence,
      execution_adapter: mockAdapter
    };
    const res = await coordinateDealExecution(input);
    expect(res).toStrictEqual({ ok: false, reason: "ERR_ASSEMBLY_FAILURE", error_code: "ERR_OPERATION_POLICY_MISMATCH" });
  });

  it("pre-submit retryable failure", async () => {
    mockOpPersistence.createPending.mockResolvedValueOnce({ ok: true });
    mockAdapter.submit.mockResolvedValueOnce({ outcome: "failed", action: "buyer_deposit", retryable: true, error_code: "ERR_NETWORK_FAILURE" });
    mockOpPersistence.replaceIfCurrent.mockResolvedValueOnce({ ok: true }); // stores failed
    mockDealPersistence.replaceIfCurrent.mockResolvedValueOnce({ ok: true }); // sync status idle

    const input: import('./deal-execution-coordinator').StellarDealExecutionCoordinatorInput = {  action: "buyer_deposit", operation_id: "k1", deal: makeDeal(), metadata: makeMeta(), existing_operation: null, stellar_contract_id: "contract-1", operation_timestamps: { created_at: "t1", updated_at: "t2" }, local_commit_timestamp: "t3", operation_persistence: mockOpPersistence, deal_persistence: mockDealPersistence, execution_adapter: mockAdapter };
    const res = await coordinateDealExecution(input);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.next_deal.status).toBe("WAITING_DEPOSITS");
    }
  });

  it("confirmed contract failure", async () => {
    mockOpPersistence.createPending.mockResolvedValueOnce({ ok: true });
    mockAdapter.submit.mockResolvedValueOnce({ outcome: "submitted", action: "buyer_deposit", transaction_hash: validTx });
    mockOpPersistence.replaceIfCurrent.mockResolvedValueOnce({ ok: true });
    mockAdapter.confirm.mockResolvedValueOnce({ outcome: "failed", action: "buyer_deposit", error_code: "ERR_CONTRACT_REJECTED", transaction_hash: validTx, retryable: false });
    mockOpPersistence.replaceIfCurrent.mockResolvedValueOnce({ ok: true });
    mockDealPersistence.replaceIfCurrent.mockResolvedValueOnce({ ok: true });

    const input: import('./deal-execution-coordinator').StellarDealExecutionCoordinatorInput = {  action: "buyer_deposit", operation_id: "k1", deal: makeDeal(), metadata: makeMeta(), existing_operation: null, stellar_contract_id: "contract-1", operation_timestamps: { created_at: "t1", updated_at: "t2" }, local_commit_timestamp: "t3", operation_persistence: mockOpPersistence, deal_persistence: mockDealPersistence, execution_adapter: mockAdapter };
    const res = await coordinateDealExecution(input);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.next_deal.status).toBe("WAITING_DEPOSITS");
      expect(res.next_deal.stellar_sync_status).toBe("idle");
    }
  });

  it("deal persistence conflict", async () => {
    mockOpPersistence.createPending.mockResolvedValueOnce({ ok: true });
    mockAdapter.submit.mockResolvedValueOnce({ outcome: "submitted", action: "buyer_deposit", transaction_hash: validTx });
    mockOpPersistence.replaceIfCurrent.mockResolvedValueOnce({ ok: true });
    mockAdapter.confirm.mockResolvedValueOnce({ outcome: "confirmed", action: "buyer_deposit", transaction_hash: validTx, result_escrow_id: null });
    mockOpPersistence.replaceIfCurrent.mockResolvedValueOnce({ ok: true });
    mockDealPersistence.replaceIfCurrent.mockResolvedValueOnce({ ok: false, reason: "conflict" });

    const input: import('./deal-execution-coordinator').StellarDealExecutionCoordinatorInput = {  action: "buyer_deposit", operation_id: "k1", deal: makeDeal(), metadata: makeMeta(), existing_operation: null, stellar_contract_id: "contract-1", operation_timestamps: { created_at: "t1", updated_at: "t2" }, local_commit_timestamp: "t3", operation_persistence: mockOpPersistence, deal_persistence: mockDealPersistence, execution_adapter: mockAdapter };
    const res = await coordinateDealExecution(input);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("ERR_OUT_OF_SYNC");
  });

  it("unknown result", async () => {
    mockOpPersistence.createPending.mockResolvedValueOnce({ ok: true });
    mockAdapter.submit.mockResolvedValueOnce({ outcome: "submitted", action: "buyer_deposit", transaction_hash: validTx });
    mockOpPersistence.replaceIfCurrent.mockResolvedValueOnce({ ok: true });
    mockAdapter.confirm.mockResolvedValueOnce({ outcome: "unknown", action: "buyer_deposit", error_code: "ERR_UNKNOWN", reconciliation_required: true, resubmission_allowed: false, transaction_hash: validTx });
    mockOpPersistence.replaceIfCurrent.mockResolvedValueOnce({ ok: true }); // stores unknown
    mockDealPersistence.replaceIfCurrent.mockResolvedValueOnce({ ok: true }); // deal sync to unknown

    const input: import('./deal-execution-coordinator').StellarDealExecutionCoordinatorInput = {  action: "buyer_deposit", operation_id: "k1", deal: makeDeal(), metadata: makeMeta(), existing_operation: null, stellar_contract_id: "contract-1", operation_timestamps: { created_at: "t1", updated_at: "t2" }, local_commit_timestamp: "t3", operation_persistence: mockOpPersistence, deal_persistence: mockDealPersistence, execution_adapter: mockAdapter };
    const res = await coordinateDealExecution(input);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.next_deal.stellar_sync_status).toBe("unknown");
    }
  });

  it("input immutability", async () => {
    mockOpPersistence.createPending.mockResolvedValueOnce({ ok: true });
    mockAdapter.submit.mockResolvedValueOnce({ outcome: "submitted", action: "buyer_deposit", transaction_hash: validTx });
    mockOpPersistence.replaceIfCurrent.mockResolvedValueOnce({ ok: true });
    mockAdapter.confirm.mockResolvedValueOnce({ outcome: "confirmed", action: "buyer_deposit", transaction_hash: validTx, result_escrow_id: null });
    mockOpPersistence.replaceIfCurrent.mockResolvedValueOnce({ ok: true });
    mockDealPersistence.replaceIfCurrent.mockResolvedValueOnce({ ok: true });

    const deal = makeDeal();
    const dealCopy = JSON.parse(JSON.stringify(deal));
    const input: import('./deal-execution-coordinator').StellarDealExecutionCoordinatorInput = {  action: "buyer_deposit", operation_id: "k1", deal, metadata: makeMeta(), existing_operation: null, stellar_contract_id: "contract-1", operation_timestamps: { created_at: "t1", updated_at: "t2" }, local_commit_timestamp: "t3", operation_persistence: mockOpPersistence, deal_persistence: mockDealPersistence, execution_adapter: mockAdapter };
    await coordinateDealExecution(input);
    expect(deal).toEqual(dealCopy);
  });
});
