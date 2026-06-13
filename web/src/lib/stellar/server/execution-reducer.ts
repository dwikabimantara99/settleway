import type { DealStatus } from "@/lib/escrow/state-machine";
import type { StellarOperation } from "@/lib/stellar/types";
import { resolveStellarActionPlan } from "./action-policy";
import { canTransitionStellarOperation } from "@/lib/stellar/helpers";
import type {
  StellarAdapterSubmitResult,
  StellarAdapterConfirmationResult,
  StellarPreSubmitStage,
} from "./adapter-contracts";
import type { StellarPublicErrorCode } from "@/lib/stellar/types";

export type StellarExecutionReductionErrorCode =
  | "ERR_ACTION_MISMATCH"
  | "ERR_OPERATION_POLICY_MISMATCH"
  | "ERR_INVALID_OPERATION_STATE"
  | "ERR_TRANSACTION_HASH_MISMATCH";

export type StellarLocalCommitDecision =
  | {
      kind: "none";
    }
  | {
      kind: "sync_create_deal";
      transaction_hash: string;
      result_escrow_id: string;
    }
  | {
      kind: "advance_status";
      target_status: DealStatus;
      transaction_hash: string;
    };

export type StellarExecutionContinuation =
  | {
      kind: "none";
    }
  | {
      kind: "await_confirmation";
      transaction_hash: string;
    }
  | {
      kind: "reconcile_no_resubmit";
      transaction_hash: string;
    }
  | {
      kind: "manual_retry_review";
      stage: StellarPreSubmitStage;
      error_code: StellarPublicErrorCode;
    };

export type StellarExecutionReductionInput =
  | {
      stage: "submit";
      operation: StellarOperation;
      result: StellarAdapterSubmitResult;
      occurred_at: string;
    }
  | {
      stage: "confirm";
      operation: StellarOperation;
      result: StellarAdapterConfirmationResult;
      occurred_at: string;
    };

export type StellarExecutionReductionResult =
  | {
      ok: true;
      next_operation: StellarOperation;
      local_commit: StellarLocalCommitDecision;
      continuation: StellarExecutionContinuation;
    }
  | {
      ok: false;
      error_code: StellarExecutionReductionErrorCode;
    };

export function reduceStellarExecution(
  input: StellarExecutionReductionInput,
): StellarExecutionReductionResult {
  const { stage, operation, result, occurred_at } = input;

  // 1. Action compatibility
  if (result.action !== operation.requested_action) {
    return { ok: false, error_code: "ERR_ACTION_MISMATCH" };
  }

  // 2. Canonical policy integrity
  const planResult = resolveStellarActionPlan(
    operation.requested_action,
    operation.expected_local_status,
  );

  if (!planResult.ok) {
    return { ok: false, error_code: "ERR_OPERATION_POLICY_MISMATCH" };
  }

  if (operation.target_local_status !== planResult.plan.target_local_status) {
    return { ok: false, error_code: "ERR_OPERATION_POLICY_MISMATCH" };
  }

  if (operation.stellar_method !== planResult.plan.stellar_method) {
    return { ok: false, error_code: "ERR_OPERATION_POLICY_MISMATCH" };
  }

  // 3. Stage-specific operation status
  if (stage === "submit") {
    if (operation.operation_status !== "pending") {
      return { ok: false, error_code: "ERR_INVALID_OPERATION_STATE" };
    }
  } else {
    // stage === "confirm"
    if (operation.operation_status !== "submitted" && operation.operation_status !== "unknown") {
      return { ok: false, error_code: "ERR_INVALID_OPERATION_STATE" };
    }
  }

  // 4. Confirmation transaction-hash consistency
  if (stage === "confirm") {
    if (operation.transaction_hash === null) {
      return { ok: false, error_code: "ERR_TRANSACTION_HASH_MISMATCH" };
    }
    if (result.transaction_hash !== operation.transaction_hash) {
      return { ok: false, error_code: "ERR_TRANSACTION_HASH_MISMATCH" };
    }
  }

  let nextStatus: import("@/lib/stellar/types").StellarOperationStatus = operation.operation_status;
  if (stage === "submit") {
    if (result.outcome === "submitted") {
      nextStatus = "submitted";
    } else if (result.outcome === "failed") {
      nextStatus = "failed";
    }
  } else {
    if (result.outcome === "confirmed") {
      nextStatus = "confirmed";
    } else if (result.outcome === "failed") {
      nextStatus = "failed";
    } else if (result.outcome === "unknown") {
      nextStatus = "unknown";
    }
  }

  const isUnknownToUnknown =
    stage === "confirm" &&
    operation.operation_status === "unknown" &&
    result.outcome === "unknown";

  if (!isUnknownToUnknown) {
    if (!canTransitionStellarOperation(operation.operation_status, nextStatus)) {
      return { ok: false, error_code: "ERR_INVALID_OPERATION_STATE" };
    }
  }

  const nextOperation: StellarOperation = {
    ...operation,
    operation_status: nextStatus,
    updated_at: occurred_at,
  };

  let localCommit: StellarLocalCommitDecision;
  let continuation: StellarExecutionContinuation;

  if (stage === "submit") {
    if (result.outcome === "submitted") {
      nextOperation.transaction_hash = result.transaction_hash;
      nextOperation.result_escrow_id = null;
      nextOperation.public_error_code = null;
      nextOperation.submitted_at = occurred_at;
      nextOperation.confirmed_at = null;

      localCommit = { kind: "none" };
      continuation = { kind: "await_confirmation", transaction_hash: result.transaction_hash };
    } else {
      nextOperation.transaction_hash = null;
      nextOperation.result_escrow_id = null;
      nextOperation.public_error_code = result.error_code;
      nextOperation.submitted_at = null;
      nextOperation.confirmed_at = null;

      if (result.retryable) {
        localCommit = { kind: "none" };
        continuation = { kind: "manual_retry_review", stage: result.stage, error_code: result.error_code };
      } else {
        localCommit = { kind: "none" };
        continuation = { kind: "none" };
      }
    }
  } else {
    // stage === "confirm"
    if (result.outcome === "confirmed") {
      nextOperation.transaction_hash = operation.transaction_hash;
      nextOperation.public_error_code = null;
      nextOperation.confirmed_at = occurred_at;

      if (result.action === "create_deal") {
        nextOperation.result_escrow_id = result.result_escrow_id;
        localCommit = {
          kind: "sync_create_deal",
          transaction_hash: operation.transaction_hash as string,
          result_escrow_id: result.result_escrow_id,
        };
        continuation = { kind: "none" };
      } else {
        nextOperation.result_escrow_id = null;
        localCommit = {
          kind: "advance_status",
          target_status: planResult.plan.target_local_status,
          transaction_hash: operation.transaction_hash as string,
        };
        continuation = { kind: "none" };
      }
    } else if (result.outcome === "failed") {
      nextOperation.transaction_hash = operation.transaction_hash;
      nextOperation.result_escrow_id = null;
      nextOperation.public_error_code = result.error_code;
      nextOperation.confirmed_at = occurred_at;

      localCommit = { kind: "none" };
      continuation = { kind: "none" };
    } else {
      // result.outcome === "unknown"
      nextOperation.transaction_hash = operation.transaction_hash;
      nextOperation.result_escrow_id = null;
      nextOperation.public_error_code = result.error_code;
      nextOperation.confirmed_at = null;

      localCommit = { kind: "none" };
      continuation = {
        kind: "reconcile_no_resubmit",
        transaction_hash: operation.transaction_hash as string,
      };
    }
  }

  return {
    ok: true,
    next_operation: nextOperation,
    local_commit: localCommit,
    continuation,
  };
}
