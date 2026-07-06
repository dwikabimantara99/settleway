import { describe, it, expect } from "vitest";
import { planDealLocalCommit } from "./deal-local-commit";
import type { DbDeal } from "../../db/types";
import type { StellarOperation, StellarContractMethod } from "../types";
import type { StellarLocalCommitDecision } from "./execution-reducer";

describe("Deal Local Commit", () => {
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
      stellar_escrow_id: "escrow-1",
      latest_stellar_tx_hash: "tx1",
      stellar_sync_status: "pending",
      proof_hash: null,
      terms: {},
      created_at: "2023-01-01T00:00:00Z",
      updated_at: "2023-01-01T00:00:00Z",
      ...overrides,
    };
  }

  function makeOp(overrides: Partial<StellarOperation> = {}): StellarOperation {
    return {
      idempotency_key: "key1",
      deal_id: "deal-1",
      requested_action: "create_deal",
      expected_local_status: null,
      target_local_status: "WAITING_DEPOSITS",
      stellar_method: "create_escrow",
      operation_status: "confirmed",
      transaction_hash: "tx1",
      result_escrow_id: "escrow-1",
      public_error_code: null,
      created_at: "2023-01-01T00:00:00Z",
      submitted_at: "2023-01-01T00:00:01Z",
      confirmed_at: "2023-01-01T00:00:02Z",
      updated_at: "2023-01-01T00:00:02Z",
      ...overrides,
    };
  }

  const plans = [
    { action: "create_deal", expected: null, target: "WAITING_DEPOSITS", method: "create_escrow" },
    { action: "buyer_deposit", expected: "WAITING_DEPOSITS", target: "BUYER_FUNDED", method: "deposit_buyer" },
    { action: "buyer_deposit", expected: "SELLER_FUNDED", target: "LOCKED", method: "deposit_buyer" },
    { action: "seller_deposit", expected: "WAITING_DEPOSITS", target: "SELLER_FUNDED", method: "deposit_seller" },
    { action: "seller_deposit", expected: "BUYER_FUNDED", target: "LOCKED", method: "deposit_seller" },
    { action: "submit_proof", expected: "LOCKED", target: "PROOF_SUBMITTED", method: "submit_proof_hash" },
    { action: "mark_delivered", expected: "PROOF_SUBMITTED", target: "DELIVERED", method: "mark_delivered" },
    { action: "accept_delivery", expected: "DELIVERED", target: "COMPLETED", method: "accept_and_complete" },
    { action: "expire", expected: "WAITING_DEPOSITS", target: "EXPIRED", method: "expire_if_unfunded" },
    { action: "expire", expected: "BUYER_FUNDED", target: "REFUND_PENDING", method: "expire_if_unfunded" },
    { action: "expire", expected: "SELLER_FUNDED", target: "REFUND_PENDING", method: "expire_if_unfunded" },
    { action: "refund", expected: "BUYER_FUNDED", target: "REFUNDED", method: "refund_before_locked" },
    { action: "refund", expected: "SELLER_FUNDED", target: "REFUNDED", method: "refund_before_locked" },
  ] as const;

  it("all 13 canonical valid action/status plans pass", () => {
    for (const plan of plans) {
      const deal = makeDeal({
        status: plan.expected === null ? "WAITING_DEPOSITS" : plan.expected,
        stellar_contract_id: "contract-1",
        stellar_escrow_id: plan.action === "create_deal" ? null : "escrow-1"
      });
      const operation = makeOp({
        requested_action: plan.action,
        expected_local_status: plan.expected,
        target_local_status: plan.target,
        stellar_method: plan.method as StellarContractMethod,
        result_escrow_id: plan.action === "create_deal" ? "escrow-1" : null
      });

      let local_commit: StellarLocalCommitDecision;
      if (plan.action === "create_deal") {
        local_commit = { kind: "sync_create_deal", transaction_hash: "tx1", result_escrow_id: "escrow-1" };
      } else {
        local_commit = { kind: "advance_status", target_status: plan.target, transaction_hash: "tx1" };
      }

      const result = planDealLocalCommit({
        deal,
        operation,
        local_commit,
        contract_id: "contract-1",
        committed_at: "2023-01-01T01:00:00Z"
      });

      if (!result.ok) {
        console.error("Failed on plan:", plan, "reason:", result.reason);
      }

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.next_deal.status).toBe(plan.target);
        expect(result.next_deal.stellar_sync_status).toBe("idle");
        expect(result.next_deal.updated_at).toBe("2023-01-01T01:00:00Z");
      }
    }
  });

  it("exact create-deal synchronization", () => {
    const deal = makeDeal({ status: "WAITING_DEPOSITS", stellar_contract_id: null, stellar_escrow_id: null });
    const operation = makeOp({ requested_action: "create_deal", expected_local_status: null, target_local_status: "WAITING_DEPOSITS", stellar_method: "create_escrow", result_escrow_id: "escrow-1" });
    const local_commit: StellarLocalCommitDecision = { kind: "sync_create_deal", transaction_hash: "tx1", result_escrow_id: "escrow-1" };

    const result = planDealLocalCommit({ deal, operation, local_commit, contract_id: "contract-1", committed_at: "time1" });
    expect(result).toStrictEqual({
      ok: true,
      current_deal: deal,
      next_deal: {
        ...deal,
        stellar_contract_id: "contract-1",
        stellar_escrow_id: "escrow-1",
        stellar_sync_status: "idle",
        updated_at: "time1"
      }
    });
  });

  it("exact transition advancement", () => {
    const deal = makeDeal({ status: "WAITING_DEPOSITS" });
    const operation = makeOp({ requested_action: "buyer_deposit", expected_local_status: "WAITING_DEPOSITS", target_local_status: "BUYER_FUNDED", stellar_method: "deposit_buyer", result_escrow_id: null });
    const local_commit: StellarLocalCommitDecision = { kind: "advance_status", target_status: "BUYER_FUNDED", transaction_hash: "tx1" };

    const result = planDealLocalCommit({ deal, operation, local_commit, contract_id: "contract-1", committed_at: "time1" });
    expect(result).toStrictEqual({
      ok: true,
      current_deal: deal,
      next_deal: {
        ...deal,
        status: "BUYER_FUNDED",
        stellar_sync_status: "idle",
        updated_at: "time1"
      }
    });
  });

  describe("failure discriminators", () => {
    it("ERR_INVALID_IDENTIFIER - contract_id", () => {
      const result = planDealLocalCommit({ deal: makeDeal(), operation: makeOp(), local_commit: { kind: "none" }, contract_id: "  ", committed_at: "t1" });
      expect(result).toStrictEqual({ ok: false, reason: "ERR_INVALID_IDENTIFIER" });
    });

    it("ERR_INVALID_IDENTIFIER - committed_at", () => {
      const result = planDealLocalCommit({ deal: makeDeal(), operation: makeOp(), local_commit: { kind: "none" }, contract_id: "c1", committed_at: "  " });
      expect(result).toStrictEqual({ ok: false, reason: "ERR_INVALID_IDENTIFIER" });
    });

    it("ERR_DEAL_OPERATION_MISMATCH", () => {
      const result = planDealLocalCommit({ deal: makeDeal({ id: "deal-2" }), operation: makeOp(), local_commit: { kind: "none" }, contract_id: "c1", committed_at: "t1" });
      expect(result).toStrictEqual({ ok: false, reason: "ERR_DEAL_OPERATION_MISMATCH" });
    });

    it("ERR_OPERATION_NOT_CONFIRMED", () => {
      const result = planDealLocalCommit({ deal: makeDeal(), operation: makeOp({ operation_status: "submitted" }), local_commit: { kind: "none" }, contract_id: "c1", committed_at: "t1" });
      expect(result).toStrictEqual({ ok: false, reason: "ERR_OPERATION_NOT_CONFIRMED" });
    });

    it("ERR_TRANSACTION_HASH_MISMATCH - op missing hash", () => {
      const result = planDealLocalCommit({ deal: makeDeal(), operation: makeOp({ transaction_hash: null }), local_commit: { kind: "none" }, contract_id: "c1", committed_at: "t1" });
      expect(result).toStrictEqual({ ok: false, reason: "ERR_TRANSACTION_HASH_MISMATCH" });
    });

    it("ERR_TRANSACTION_HASH_MISMATCH - local commit hash mismatch", () => {
      const result = planDealLocalCommit({ deal: makeDeal(), operation: makeOp(), local_commit: { kind: "sync_create_deal", transaction_hash: "tx2", result_escrow_id: "e1" }, contract_id: "c1", committed_at: "t1" });
      expect(result).toStrictEqual({ ok: false, reason: "ERR_TRANSACTION_HASH_MISMATCH" });
    });

    it("ERR_OPERATION_POLICY_MISMATCH - op mismatch with policy", () => {
      const result = planDealLocalCommit({ deal: makeDeal(), operation: makeOp({ target_local_status: "COMPLETED" }), local_commit: { kind: "sync_create_deal", transaction_hash: "tx1", result_escrow_id: "e1" }, contract_id: "c1", committed_at: "t1" });
      expect(result).toStrictEqual({ ok: false, reason: "ERR_OPERATION_POLICY_MISMATCH" });
    });

    it("ERR_LOCAL_COMMIT_MISMATCH - kind mismatch", () => {
      const result = planDealLocalCommit({ deal: makeDeal(), operation: makeOp(), local_commit: { kind: "advance_status", target_status: "WAITING_DEPOSITS", transaction_hash: "tx1" }, contract_id: "c1", committed_at: "t1" });
      expect(result).toStrictEqual({ ok: false, reason: "ERR_LOCAL_COMMIT_MISMATCH" });
    });

    it("ERR_ILLEGAL_LOCAL_TRANSITION - create deal wrong status", () => {
      const result = planDealLocalCommit({ deal: makeDeal({ status: "BUYER_FUNDED" }), operation: makeOp(), local_commit: { kind: "sync_create_deal", transaction_hash: "tx1", result_escrow_id: "e1" }, contract_id: "c1", committed_at: "t1" });
      expect(result).toStrictEqual({ ok: false, reason: "ERR_ILLEGAL_LOCAL_TRANSITION" });
    });

    it("ERR_CONTRACT_ID_MISMATCH - create deal", () => {
      const result = planDealLocalCommit({ deal: makeDeal({ stellar_contract_id: "c2" }), operation: makeOp(), local_commit: { kind: "sync_create_deal", transaction_hash: "tx1", result_escrow_id: "e1" }, contract_id: "c1", committed_at: "t1" });
      expect(result).toStrictEqual({ ok: false, reason: "ERR_CONTRACT_ID_MISMATCH" });
    });

    it("ERR_ESCROW_ID_MISMATCH - create deal", () => {
      const result = planDealLocalCommit({ deal: makeDeal(), operation: makeOp({ result_escrow_id: "e2" }), local_commit: { kind: "sync_create_deal", transaction_hash: "tx1", result_escrow_id: "e1" }, contract_id: "contract-1", committed_at: "t1" });
      expect(result).toStrictEqual({ ok: false, reason: "ERR_ESCROW_ID_MISMATCH" });
    });

    it("ERR_ILLEGAL_LOCAL_TRANSITION - transition wrong status", () => {
      const result = planDealLocalCommit({ deal: makeDeal({ status: "SELLER_FUNDED" }), operation: makeOp({ requested_action: "buyer_deposit", expected_local_status: "WAITING_DEPOSITS", target_local_status: "BUYER_FUNDED", stellar_method: "deposit_buyer", result_escrow_id: null }), local_commit: { kind: "advance_status", target_status: "BUYER_FUNDED", transaction_hash: "tx1" }, contract_id: "contract-1", committed_at: "t1" });
      expect(result).toStrictEqual({ ok: false, reason: "ERR_ILLEGAL_LOCAL_TRANSITION" });
    });

    it("ERR_UNEXPECTED_ESCROW_ID - transition", () => {
      const result = planDealLocalCommit({ deal: makeDeal({ status: "WAITING_DEPOSITS" }), operation: makeOp({ requested_action: "buyer_deposit", expected_local_status: "WAITING_DEPOSITS", target_local_status: "BUYER_FUNDED", stellar_method: "deposit_buyer", result_escrow_id: "e1" }), local_commit: { kind: "advance_status", target_status: "BUYER_FUNDED", transaction_hash: "tx1" }, contract_id: "contract-1", committed_at: "t1" });
      expect(result).toStrictEqual({ ok: false, reason: "ERR_UNEXPECTED_ESCROW_ID" });
    });
  });

  it("source deal and operation unchanged", () => {
    const deal = makeDeal({ status: "WAITING_DEPOSITS", stellar_contract_id: null, stellar_escrow_id: null });
    const operation = makeOp({ requested_action: "create_deal", expected_local_status: null, target_local_status: "WAITING_DEPOSITS", stellar_method: "create_escrow", result_escrow_id: "escrow-1" });
    const local_commit: StellarLocalCommitDecision = { kind: "sync_create_deal", transaction_hash: "tx1", result_escrow_id: "escrow-1" };

    const dealCopy = JSON.parse(JSON.stringify(deal));
    const opCopy = JSON.parse(JSON.stringify(operation));

    planDealLocalCommit({ deal, operation, local_commit, contract_id: "contract-1", committed_at: "time1" });

    expect(deal).toEqual(dealCopy);
    expect(operation).toEqual(opCopy);
  });
});
