import { describe, it, expect } from "vitest";
import { reduceStellarExecution, type StellarExecutionReductionInput, type StellarExecutionReductionResult } from "./execution-reducer";
import type { StellarOperation, StellarOperationStatus, StellarAction } from "@/lib/stellar/types";
import type { DealStatus } from "@/lib/escrow/state-machine";
import { resolveStellarActionPlan } from "./action-policy";
import { canTransitionStellarOperation } from "@/lib/stellar/helpers";

const BASE_OPERATION: StellarOperation = {
  idempotency_key: "k1",
  deal_id: "d1",
  requested_action: "create_deal",
  expected_local_status: "WAITING_DEPOSITS",
  target_local_status: "WAITING_DEPOSITS",
  stellar_method: "create_escrow",
  operation_status: "pending",
  transaction_hash: null,
  result_escrow_id: null,
  public_error_code: null,
  created_at: "2023-01-01T00:00:00Z",
  submitted_at: null,
  confirmed_at: null,
  updated_at: "2023-01-01T00:00:00Z",
};

const TS = "2023-01-02T00:00:00Z";

describe("reduceStellarExecution - success matrix", () => {
  it("1. pending + submitted", () => {
    const input: StellarExecutionReductionInput = {
      stage: "submit",
      operation: { ...BASE_OPERATION },
      result: { outcome: "submitted", action: "create_deal", transaction_hash: "hash1" },
      occurred_at: TS,
    };
    const result = reduceStellarExecution(input);
    expect(result).toStrictEqual({
      ok: true,
      next_operation: {
        ...BASE_OPERATION,
        operation_status: "submitted",
        transaction_hash: "hash1",
        submitted_at: TS,
        updated_at: TS,
      },
      local_commit: { kind: "none" },
      continuation: { kind: "await_confirmation", transaction_hash: "hash1" },
    } satisfies StellarExecutionReductionResult);
  });

  it("2. pending + retryable pre-submit failure", () => {
    const input: StellarExecutionReductionInput = {
      stage: "submit",
      operation: { ...BASE_OPERATION },
      result: { outcome: "failed", action: "create_deal", stage: "simulate", transaction_hash: null, error_code: "ERR_NETWORK_FAILURE", retryable: true },
      occurred_at: TS,
    };
    const result = reduceStellarExecution(input);
    expect(result).toStrictEqual({
      ok: true,
      next_operation: {
        ...BASE_OPERATION,
        operation_status: "failed",
        public_error_code: "ERR_NETWORK_FAILURE",
        updated_at: TS,
      },
      local_commit: { kind: "none" },
      continuation: { kind: "manual_retry_review", stage: "simulate", error_code: "ERR_NETWORK_FAILURE" },
    } satisfies StellarExecutionReductionResult);
  });

  it("3. pending + non-retryable pre-submit failure", () => {
    const input: StellarExecutionReductionInput = {
      stage: "submit",
      operation: { ...BASE_OPERATION },
      result: { outcome: "failed", action: "create_deal", stage: "sign", transaction_hash: null, error_code: "ERR_AUTH_FAILED", retryable: false },
      occurred_at: TS,
    };
    const result = reduceStellarExecution(input);
    expect(result).toStrictEqual({
      ok: true,
      next_operation: {
        ...BASE_OPERATION,
        operation_status: "failed",
        public_error_code: "ERR_AUTH_FAILED",
        updated_at: TS,
      },
      local_commit: { kind: "none" },
      continuation: { kind: "none" },
    } satisfies StellarExecutionReductionResult);
  });

  it("4. submitted + confirmed create-deal", () => {
    const input: StellarExecutionReductionInput = {
      stage: "confirm",
      operation: { ...BASE_OPERATION, operation_status: "submitted", transaction_hash: "hash1", submitted_at: "2023-01-01T01:00:00Z" },
      result: { outcome: "confirmed", action: "create_deal", transaction_hash: "hash1", result_escrow_id: "esc1" },
      occurred_at: TS,
    };
    const result = reduceStellarExecution(input);
    expect(result).toStrictEqual({
      ok: true,
      next_operation: {
        ...BASE_OPERATION,
        operation_status: "confirmed",
        transaction_hash: "hash1",
        result_escrow_id: "esc1",
        submitted_at: "2023-01-01T01:00:00Z",
        confirmed_at: TS,
        updated_at: TS,
      },
      local_commit: { kind: "sync_create_deal", transaction_hash: "hash1", result_escrow_id: "esc1" },
      continuation: { kind: "none" },
    } satisfies StellarExecutionReductionResult);
  });

  it("5. unknown + confirmed create-deal", () => {
    const input: StellarExecutionReductionInput = {
      stage: "confirm",
      operation: { ...BASE_OPERATION, operation_status: "unknown", transaction_hash: "hash1", submitted_at: "2023-01-01T01:00:00Z" },
      result: { outcome: "confirmed", action: "create_deal", transaction_hash: "hash1", result_escrow_id: "esc1" },
      occurred_at: TS,
    };
    const result = reduceStellarExecution(input);
    expect(result).toStrictEqual({
      ok: true,
      next_operation: {
        ...BASE_OPERATION,
        operation_status: "confirmed",
        transaction_hash: "hash1",
        result_escrow_id: "esc1",
        submitted_at: "2023-01-01T01:00:00Z",
        confirmed_at: TS,
        updated_at: TS,
      },
      local_commit: { kind: "sync_create_deal", transaction_hash: "hash1", result_escrow_id: "esc1" },
      continuation: { kind: "none" },
    } satisfies StellarExecutionReductionResult);
  });

  it("6. submitted + confirmed transition action", () => {
    const op = { ...BASE_OPERATION, requested_action: "buyer_deposit" as StellarAction, expected_local_status: "WAITING_DEPOSITS" as DealStatus, target_local_status: "BUYER_FUNDED" as DealStatus, stellar_method: "deposit_buyer" as const, operation_status: "submitted" as StellarOperationStatus, transaction_hash: "hash1", submitted_at: "2023-01-01T01:00:00Z" };
    const input: StellarExecutionReductionInput = {
      stage: "confirm",
      operation: op,
      result: { outcome: "confirmed", action: "buyer_deposit", transaction_hash: "hash1", result_escrow_id: null },
      occurred_at: TS,
    };
    const result = reduceStellarExecution(input);
    expect(result).toStrictEqual({
      ok: true,
      next_operation: {
        ...op,
        operation_status: "confirmed",
        confirmed_at: TS,
        updated_at: TS,
      },
      local_commit: { kind: "advance_status", target_status: "BUYER_FUNDED", transaction_hash: "hash1" },
      continuation: { kind: "none" },
    } satisfies StellarExecutionReductionResult);
  });

  it("7. unknown + confirmed transition action", () => {
    const op = { ...BASE_OPERATION, requested_action: "buyer_deposit" as StellarAction, expected_local_status: "WAITING_DEPOSITS" as DealStatus, target_local_status: "BUYER_FUNDED" as DealStatus, stellar_method: "deposit_buyer" as const, operation_status: "unknown" as StellarOperationStatus, transaction_hash: "hash1", submitted_at: "2023-01-01T01:00:00Z" };
    const input: StellarExecutionReductionInput = {
      stage: "confirm",
      operation: op,
      result: { outcome: "confirmed", action: "buyer_deposit", transaction_hash: "hash1", result_escrow_id: null },
      occurred_at: TS,
    };
    const result = reduceStellarExecution(input);
    expect(result).toStrictEqual({
      ok: true,
      next_operation: {
        ...op,
        operation_status: "confirmed",
        confirmed_at: TS,
        updated_at: TS,
      },
      local_commit: { kind: "advance_status", target_status: "BUYER_FUNDED", transaction_hash: "hash1" },
      continuation: { kind: "none" },
    } satisfies StellarExecutionReductionResult);
  });

  it("8. submitted + confirmed failure", () => {
    const input: StellarExecutionReductionInput = {
      stage: "confirm",
      operation: { ...BASE_OPERATION, operation_status: "submitted", transaction_hash: "hash1", submitted_at: "2023-01-01T01:00:00Z" },
      result: { outcome: "failed", action: "create_deal", transaction_hash: "hash1", error_code: "ERR_CONTRACT_REJECTED", retryable: false },
      occurred_at: TS,
    };
    const result = reduceStellarExecution(input);
    expect(result).toStrictEqual({
      ok: true,
      next_operation: {
        ...BASE_OPERATION,
        operation_status: "failed",
        transaction_hash: "hash1",
        public_error_code: "ERR_CONTRACT_REJECTED",
        submitted_at: "2023-01-01T01:00:00Z",
        confirmed_at: TS,
        updated_at: TS,
      },
      local_commit: { kind: "none" },
      continuation: { kind: "none" },
    } satisfies StellarExecutionReductionResult);
  });

  it("9. unknown + confirmed failure", () => {
    const input: StellarExecutionReductionInput = {
      stage: "confirm",
      operation: { ...BASE_OPERATION, operation_status: "unknown", transaction_hash: "hash1", submitted_at: "2023-01-01T01:00:00Z" },
      result: { outcome: "failed", action: "create_deal", transaction_hash: "hash1", error_code: "ERR_CONTRACT_REJECTED", retryable: false },
      occurred_at: TS,
    };
    const result = reduceStellarExecution(input);
    expect(result).toStrictEqual({
      ok: true,
      next_operation: {
        ...BASE_OPERATION,
        operation_status: "failed",
        transaction_hash: "hash1",
        public_error_code: "ERR_CONTRACT_REJECTED",
        submitted_at: "2023-01-01T01:00:00Z",
        confirmed_at: TS,
        updated_at: TS,
      },
      local_commit: { kind: "none" },
      continuation: { kind: "none" },
    } satisfies StellarExecutionReductionResult);
  });

  it("10. submitted + unknown", () => {
    const input: StellarExecutionReductionInput = {
      stage: "confirm",
      operation: { ...BASE_OPERATION, operation_status: "submitted", transaction_hash: "hash1", submitted_at: "2023-01-01T01:00:00Z" },
      result: { outcome: "unknown", action: "create_deal", transaction_hash: "hash1", error_code: "ERR_NETWORK_FAILURE", reconciliation_required: true, resubmission_allowed: false },
      occurred_at: TS,
    };
    const result = reduceStellarExecution(input);
    expect(result).toStrictEqual({
      ok: true,
      next_operation: {
        ...BASE_OPERATION,
        operation_status: "unknown",
        transaction_hash: "hash1",
        public_error_code: "ERR_NETWORK_FAILURE",
        submitted_at: "2023-01-01T01:00:00Z",
        updated_at: TS,
      },
      local_commit: { kind: "none" },
      continuation: { kind: "reconcile_no_resubmit", transaction_hash: "hash1" },
    } satisfies StellarExecutionReductionResult);
  });

  it("11. unknown + unknown", () => {
    const input: StellarExecutionReductionInput = {
      stage: "confirm",
      operation: { ...BASE_OPERATION, operation_status: "unknown", transaction_hash: "hash1", submitted_at: "2023-01-01T01:00:00Z" },
      result: { outcome: "unknown", action: "create_deal", transaction_hash: "hash1", error_code: "ERR_TIMEOUT", reconciliation_required: true, resubmission_allowed: false },
      occurred_at: TS,
    };
    const result = reduceStellarExecution(input);
    expect(result).toStrictEqual({
      ok: true,
      next_operation: {
        ...BASE_OPERATION,
        operation_status: "unknown",
        transaction_hash: "hash1",
        public_error_code: "ERR_TIMEOUT",
        submitted_at: "2023-01-01T01:00:00Z",
        updated_at: TS,
      },
      local_commit: { kind: "none" },
      continuation: { kind: "reconcile_no_resubmit", transaction_hash: "hash1" },
    } satisfies StellarExecutionReductionResult);
  });
});

describe("reduceStellarExecution - confirmed-success plans matrix", () => {
  const cases: Array<{ action: StellarAction, expectedLocalStatus: DealStatus | null }> = [
    { action: "create_deal", expectedLocalStatus: null },
    { action: "buyer_deposit", expectedLocalStatus: "WAITING_DEPOSITS" },
    { action: "buyer_deposit", expectedLocalStatus: "SELLER_FUNDED" },
    { action: "seller_deposit", expectedLocalStatus: "WAITING_DEPOSITS" },
    { action: "seller_deposit", expectedLocalStatus: "BUYER_FUNDED" },
    { action: "submit_proof", expectedLocalStatus: "LOCKED" },
    { action: "mark_delivered", expectedLocalStatus: "PROOF_SUBMITTED" },
    { action: "accept_delivery", expectedLocalStatus: "DELIVERED" },
    { action: "expire", expectedLocalStatus: "WAITING_DEPOSITS" },
    { action: "expire", expectedLocalStatus: "BUYER_FUNDED" },
    { action: "expire", expectedLocalStatus: "SELLER_FUNDED" },
    { action: "refund", expectedLocalStatus: "BUYER_FUNDED" },
    { action: "refund", expectedLocalStatus: "SELLER_FUNDED" },
  ];

  for (const c of cases) {
    it(`supports confirmed success for ${c.action} from ${c.expectedLocalStatus}`, () => {
      const planRes = resolveStellarActionPlan(c.action, c.expectedLocalStatus);
      expect(planRes.ok).toBe(true);
      if (!planRes.ok) return;

      const op: StellarOperation = {
        ...BASE_OPERATION,
        requested_action: c.action,
        expected_local_status: c.expectedLocalStatus,
        target_local_status: planRes.plan.target_local_status,
        stellar_method: planRes.plan.stellar_method,
        operation_status: "submitted",
        transaction_hash: "hash2",
      };

      let result: import("./adapter-contracts").StellarConfirmedResult;
      if (c.action === "create_deal") {
        result = { outcome: "confirmed", action: "create_deal", transaction_hash: "hash2", result_escrow_id: "esc2" };
      } else {
        result = { outcome: "confirmed", action: c.action as Exclude<StellarAction, "create_deal">, transaction_hash: "hash2", result_escrow_id: null };
      }

      const input: StellarExecutionReductionInput = {
        stage: "confirm",
        operation: op,
        result: result,
        occurred_at: TS,
      };

      const res = reduceStellarExecution(input);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.next_operation.operation_status).toBe("confirmed");
        expect(res.next_operation.transaction_hash).toBe("hash2");
        if (c.action === "create_deal") {
          expect(res.local_commit).toStrictEqual({ kind: "sync_create_deal", transaction_hash: "hash2", result_escrow_id: "esc2" });
        } else {
          expect(res.local_commit).toStrictEqual({ kind: "advance_status", target_status: planRes.plan.target_local_status, transaction_hash: "hash2" });
        }
      }
    });
  }
});

describe("reduceStellarExecution - invariant failures", () => {
  it("1. action mismatch on submit", () => {
    const input: StellarExecutionReductionInput = {
      stage: "submit",
      operation: { ...BASE_OPERATION },
      result: { outcome: "submitted", action: "buyer_deposit", transaction_hash: "hash1" },
      occurred_at: TS,
    };
    expect(reduceStellarExecution(input)).toStrictEqual({ ok: false, error_code: "ERR_ACTION_MISMATCH" });
  });

  it("2. action mismatch on confirm", () => {
    const input: StellarExecutionReductionInput = {
      stage: "confirm",
      operation: { ...BASE_OPERATION, operation_status: "submitted", transaction_hash: "hash1" },
      result: { outcome: "confirmed", action: "buyer_deposit", transaction_hash: "hash1", result_escrow_id: null },
      occurred_at: TS,
    };
    expect(reduceStellarExecution(input)).toStrictEqual({ ok: false, error_code: "ERR_ACTION_MISMATCH" });
  });

  it("3. policy resolution failure", () => {
    const input: StellarExecutionReductionInput = {
      stage: "submit",
      operation: { ...BASE_OPERATION, expected_local_status: "COMPLETED" },
      result: { outcome: "submitted", action: "create_deal", transaction_hash: "hash1" },
      occurred_at: TS,
    };
    expect(reduceStellarExecution(input)).toStrictEqual({ ok: false, error_code: "ERR_OPERATION_POLICY_MISMATCH" });
  });

  it("4. stored target-status mismatch", () => {
    const input: StellarExecutionReductionInput = {
      stage: "submit",
      operation: { ...BASE_OPERATION, target_local_status: "COMPLETED" },
      result: { outcome: "submitted", action: "create_deal", transaction_hash: "hash1" },
      occurred_at: TS,
    };
    expect(reduceStellarExecution(input)).toStrictEqual({ ok: false, error_code: "ERR_OPERATION_POLICY_MISMATCH" });
  });

  it("5. stored method mismatch", () => {
    const input: StellarExecutionReductionInput = {
      stage: "submit",
      operation: { ...BASE_OPERATION, stellar_method: "mark_delivered" },
      result: { outcome: "submitted", action: "create_deal", transaction_hash: "hash1" },
      occurred_at: TS,
    };
    expect(reduceStellarExecution(input)).toStrictEqual({ ok: false, error_code: "ERR_OPERATION_POLICY_MISMATCH" });
  });

  it("6. submit result against submitted", () => {
    const input: StellarExecutionReductionInput = {
      stage: "submit",
      operation: { ...BASE_OPERATION, operation_status: "submitted", transaction_hash: "hash0" },
      result: { outcome: "submitted", action: "create_deal", transaction_hash: "hash1" },
      occurred_at: TS,
    };
    expect(reduceStellarExecution(input)).toStrictEqual({ ok: false, error_code: "ERR_INVALID_OPERATION_STATE" });
  });

  it("7. submit result against unknown", () => {
    const input: StellarExecutionReductionInput = {
      stage: "submit",
      operation: { ...BASE_OPERATION, operation_status: "unknown", transaction_hash: "hash0" },
      result: { outcome: "submitted", action: "create_deal", transaction_hash: "hash1" },
      occurred_at: TS,
    };
    expect(reduceStellarExecution(input)).toStrictEqual({ ok: false, error_code: "ERR_INVALID_OPERATION_STATE" });
  });

  it("8. submit result against confirmed", () => {
    const input: StellarExecutionReductionInput = {
      stage: "submit",
      operation: { ...BASE_OPERATION, operation_status: "confirmed", transaction_hash: "hash0" },
      result: { outcome: "submitted", action: "create_deal", transaction_hash: "hash1" },
      occurred_at: TS,
    };
    expect(reduceStellarExecution(input)).toStrictEqual({ ok: false, error_code: "ERR_INVALID_OPERATION_STATE" });
  });

  it("9. submit result against failed", () => {
    const input: StellarExecutionReductionInput = {
      stage: "submit",
      operation: { ...BASE_OPERATION, operation_status: "failed", transaction_hash: "hash0" },
      result: { outcome: "submitted", action: "create_deal", transaction_hash: "hash1" },
      occurred_at: TS,
    };
    expect(reduceStellarExecution(input)).toStrictEqual({ ok: false, error_code: "ERR_INVALID_OPERATION_STATE" });
  });

  it("10. confirmation against pending", () => {
    const input: StellarExecutionReductionInput = {
      stage: "confirm",
      operation: { ...BASE_OPERATION, operation_status: "pending", transaction_hash: null },
      result: { outcome: "confirmed", action: "create_deal", transaction_hash: "hash1", result_escrow_id: "esc" },
      occurred_at: TS,
    };
    expect(reduceStellarExecution(input)).toStrictEqual({ ok: false, error_code: "ERR_INVALID_OPERATION_STATE" });
  });

  it("11. confirmation against confirmed", () => {
    const input: StellarExecutionReductionInput = {
      stage: "confirm",
      operation: { ...BASE_OPERATION, operation_status: "confirmed", transaction_hash: "hash1" },
      result: { outcome: "confirmed", action: "create_deal", transaction_hash: "hash1", result_escrow_id: "esc" },
      occurred_at: TS,
    };
    expect(reduceStellarExecution(input)).toStrictEqual({ ok: false, error_code: "ERR_INVALID_OPERATION_STATE" });
  });

  it("12. confirmation against failed", () => {
    const input: StellarExecutionReductionInput = {
      stage: "confirm",
      operation: { ...BASE_OPERATION, operation_status: "failed", transaction_hash: "hash1" },
      result: { outcome: "confirmed", action: "create_deal", transaction_hash: "hash1", result_escrow_id: "esc" },
      occurred_at: TS,
    };
    expect(reduceStellarExecution(input)).toStrictEqual({ ok: false, error_code: "ERR_INVALID_OPERATION_STATE" });
  });

  it("13. null operation hash during confirm", () => {
    const input: StellarExecutionReductionInput = {
      stage: "confirm",
      operation: { ...BASE_OPERATION, operation_status: "submitted", transaction_hash: null },
      result: { outcome: "confirmed", action: "create_deal", transaction_hash: "hash1", result_escrow_id: "esc" },
      occurred_at: TS,
    };
    expect(reduceStellarExecution(input)).toStrictEqual({ ok: false, error_code: "ERR_TRANSACTION_HASH_MISMATCH" });
  });

  it("14. different result hash during confirm", () => {
    const input: StellarExecutionReductionInput = {
      stage: "confirm",
      operation: { ...BASE_OPERATION, operation_status: "submitted", transaction_hash: "hash0" },
      result: { outcome: "confirmed", action: "create_deal", transaction_hash: "hash1", result_escrow_id: "esc" },
      occurred_at: TS,
    };
    expect(reduceStellarExecution(input)).toStrictEqual({ ok: false, error_code: "ERR_TRANSACTION_HASH_MISMATCH" });
  });
});

describe("reduceStellarExecution - transition-helper consistency", () => {
  it("allows exact canonical transitions", () => {
    const pairs: Array<[StellarOperationStatus, StellarOperationStatus]> = [
      ["pending", "submitted"],
      ["pending", "failed"],
      ["submitted", "confirmed"],
      ["submitted", "failed"],
      ["submitted", "unknown"],
      ["unknown", "confirmed"],
      ["unknown", "failed"],
    ];
    for (const [current, next] of pairs) {
      expect(canTransitionStellarOperation(current, next)).toBe(true);
    }
  });

  it("does not allow generic same-status transitions in helper", () => {
    expect(canTransitionStellarOperation("unknown", "unknown")).toBe(false);
  });
});

describe("reduceStellarExecution - immutability and purity", () => {
  it("does not mutate inputs and returns new object without prohibited keys", () => {
    const sourceOp: StellarOperation = { ...BASE_OPERATION };
    const sourceRes = { outcome: "submitted" as const, action: "create_deal" as const, transaction_hash: "hash1" };

    const sourceOpJson = JSON.stringify(sourceOp);
    const sourceResJson = JSON.stringify(sourceRes);

    const input: StellarExecutionReductionInput = {
      stage: "submit",
      operation: sourceOp,
      result: sourceRes,
      occurred_at: TS,
    };

    const result = reduceStellarExecution(input);
    expect(result.ok).toBe(true);

    expect(JSON.stringify(sourceOp)).toBe(sourceOpJson);
    expect(JSON.stringify(sourceRes)).toBe(sourceResJson);

    if (result.ok) {
      expect(result.next_operation).not.toBe(sourceOp);
      const resJson = JSON.stringify(result);
      const prohibitedKeys = /"(secret|secret_seed|private_key|keypair|rpc|rpc_client|environment|transaction|sdk_transaction|database|repository|callback)":/;
      expect(prohibitedKeys.test(resJson)).toBe(false);
    }
  });
});
