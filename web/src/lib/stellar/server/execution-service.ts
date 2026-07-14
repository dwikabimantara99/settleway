import type { StellarOperation } from "@/lib/stellar/types";
import type { StellarExecutionAdapter } from "./adapter-contracts";
import type { StellarInvocationBuildInput } from "./invocation-builder";
import type {
  StellarLocalCommitDecision,
  StellarExecutionContinuation,
  StellarExecutionReductionErrorCode,
} from "./execution-reducer";
import { reduceStellarExecution } from "./execution-reducer";
import type {
  StellarExecutionPlanningFailure,
} from "./execution-planner";
import { planStellarExecution } from "./execution-planner";

export type StellarPersistenceFailureReason = "conflict" | "unavailable";

export type StellarPersistenceWriteResult =
  | { ok: true }
  | { ok: false; reason: StellarPersistenceFailureReason };

export interface StellarOperationPersistencePort {
  createPending(operation: StellarOperation): Promise<StellarPersistenceWriteResult>;
  replaceIfCurrent(input: {
    current: StellarOperation;
    next: StellarOperation;
  }): Promise<StellarPersistenceWriteResult>;
}

export interface StellarExecutionServiceTimestamps {
  created_at: string;
  submit_result_at: string;
  confirmation_result_at: string;
}

export interface StellarExecutionServiceInput {
  operation_id: string;
  deal_id: string;
  build_input: StellarInvocationBuildInput;
  existing_operation: StellarOperation | null;
  timestamps: StellarExecutionServiceTimestamps;
  persistence: StellarOperationPersistencePort;
  adapter: StellarExecutionAdapter;
}

export interface StellarExecutionServiceSuccess {
  ok: true;
  operation: StellarOperation;
  local_commit: StellarLocalCommitDecision;
  continuation: StellarExecutionContinuation;
}

export type StellarExecutionPersistencePhase =
  | "create_pending"
  | "store_submit_result"
  | "store_confirmation_result";

export type StellarExecutionServiceFailure =
  | {
      ok: false;
      stage: "input";
      error_code: "ERR_INVALID_IDENTIFIER";
      field: "submit_result_at" | "confirmation_result_at";
    }
  | {
      ok: false;
      stage: "planning";
      failure: StellarExecutionPlanningFailure;
    }
  | {
      ok: false;
      stage: "reduction";
      error_code: StellarExecutionReductionErrorCode;
    }
  | {
      ok: false;
      stage: "persistence";
      phase: StellarExecutionPersistencePhase;
      error_code: "ERR_PERSISTENCE_CONFLICT" | "ERR_PERSISTENCE_UNAVAILABLE";
      candidate_operation: StellarOperation;
      continuation: StellarExecutionContinuation;
    };

export type StellarExecutionServiceResult =
  | StellarExecutionServiceSuccess
  | StellarExecutionServiceFailure;

function validateTimestamp(val: string): boolean {
  return val !== "" && val.trim() !== "" && val === val.trim();
}

export async function executeStellarOperation(
  input: StellarExecutionServiceInput,
): Promise<StellarExecutionServiceResult> {
  // Gate 9 — Validation and planning
  if (!validateTimestamp(input.timestamps.submit_result_at)) {
    return { ok: false, stage: "input", error_code: "ERR_INVALID_IDENTIFIER", field: "submit_result_at" };
  }
  if (!validateTimestamp(input.timestamps.confirmation_result_at)) {
    return { ok: false, stage: "input", error_code: "ERR_INVALID_IDENTIFIER", field: "confirmation_result_at" };
  }

  const planningResult = planStellarExecution({
    operation_id: input.operation_id,
    deal_id: input.deal_id,
    build_input: input.build_input,
    existing_operation: input.existing_operation,
    created_at: input.timestamps.created_at,
  });

  if (!planningResult.ok) {
    return {
      ok: false,
      stage: "planning",
      failure: planningResult,
    };
  }

  // Gate 10 — Handle apply_existing_confirmed
  if (planningResult.kind === "apply_existing_confirmed") {
    return {
      ok: true,
      operation: planningResult.operation,
      local_commit: planningResult.local_commit,
      continuation: { kind: "none" },
    };
  }

  // Gate 11 — Handle confirm_existing
  if (planningResult.kind === "confirm_existing") {
    const confirmationResult = await input.adapter.confirm(planningResult.confirm_request);

    const reduction = reduceStellarExecution({
      stage: "confirm",
      operation: planningResult.operation,
      result: confirmationResult,
      occurred_at: input.timestamps.confirmation_result_at,
    });

    if (!reduction.ok) {
      return {
        ok: false,
        stage: "reduction",
        error_code: reduction.error_code,
      };
    }

    const persistRes = await input.persistence.replaceIfCurrent({
      current: planningResult.operation,
      next: reduction.next_operation,
    });

    if (!persistRes.ok) {
      return {
        ok: false,
        stage: "persistence",
        phase: "store_confirmation_result",
        error_code: persistRes.reason === "conflict" ? "ERR_PERSISTENCE_CONFLICT" : "ERR_PERSISTENCE_UNAVAILABLE",
        candidate_operation: reduction.next_operation,
        continuation: {
          kind: "reconcile_no_resubmit",
          transaction_hash: planningResult.confirm_request.transaction_hash,
        },
      };
    }

    return {
      ok: true,
      operation: reduction.next_operation,
      local_commit: reduction.local_commit,
      continuation: reduction.continuation,
    };
  }

  // Gate 12 — Handle persist_pending_before_submit
  if (planningResult.kind === "persist_pending_before_submit") {
    const createPendingRes = await input.persistence.createPending(planningResult.operation);

    if (!createPendingRes.ok) {
      return {
        ok: false,
        stage: "persistence",
        phase: "create_pending",
        error_code: createPendingRes.reason === "conflict" ? "ERR_PERSISTENCE_CONFLICT" : "ERR_PERSISTENCE_UNAVAILABLE",
        candidate_operation: planningResult.operation,
        continuation: { kind: "none" },
      };
    }

    const submitResult = await input.adapter.submit({
      operation_id: planningResult.operation_id,
      idempotency_key: planningResult.operation.idempotency_key,
      invocation: planningResult.invocation,
    });

    const submitReduction = reduceStellarExecution({
      stage: "submit",
      operation: planningResult.operation,
      result: submitResult,
      occurred_at: input.timestamps.submit_result_at,
    });

    if (!submitReduction.ok) {
      return {
        ok: false,
        stage: "reduction",
        error_code: submitReduction.error_code,
      };
    }

    const storeSubmitRes = await input.persistence.replaceIfCurrent({
      current: planningResult.operation,
      next: submitReduction.next_operation,
    });

    if (!storeSubmitRes.ok) {
      const candidate = submitReduction.next_operation;
      let continuation: StellarExecutionContinuation;
      if (candidate.transaction_hash !== null) {
        continuation = { kind: "reconcile_no_resubmit", transaction_hash: candidate.transaction_hash };
      } else {
        continuation = submitReduction.continuation.kind === "manual_retry_review"
          ? submitReduction.continuation
          : { kind: "none" };
      }

      return {
        ok: false,
        stage: "persistence",
        phase: "store_submit_result",
        error_code: storeSubmitRes.reason === "conflict" ? "ERR_PERSISTENCE_CONFLICT" : "ERR_PERSISTENCE_UNAVAILABLE",
        candidate_operation: candidate,
        continuation,
      };
    }

    // Gate 13 — Confirm only after submitted persistence succeeds
    if (submitReduction.next_operation.operation_status !== "submitted") {
      return {
        ok: true,
        operation: submitReduction.next_operation,
        local_commit: submitReduction.local_commit,
        continuation: submitReduction.continuation,
      };
    }

    // Submitted path
    // We expect the reducer to guarantee transaction_hash exists if status is submitted
    const txHash = submitReduction.next_operation.transaction_hash;
    if (txHash === null) {
      // Invariant fallback, should not be reached based on reducer behavior
      throw new Error("Missing transaction hash on submitted operation");
    }

    const confirmResult = await input.adapter.confirm({
      action: submitReduction.next_operation.requested_action,
      transaction_hash: txHash,
    });

    const confirmReduction = reduceStellarExecution({
      stage: "confirm",
      operation: submitReduction.next_operation,
      result: confirmResult,
      occurred_at: input.timestamps.confirmation_result_at,
    });

    if (!confirmReduction.ok) {
      return {
        ok: false,
        stage: "reduction",
        error_code: confirmReduction.error_code,
      };
    }

    const storeConfirmRes = await input.persistence.replaceIfCurrent({
      current: submitReduction.next_operation,
      next: confirmReduction.next_operation,
    });
    console.log('storeConfirmRes:', JSON.stringify(storeConfirmRes, null, 2));

    if (!storeConfirmRes.ok) {
      return {
        ok: false,
        stage: "persistence",
        phase: "store_confirmation_result",
        error_code: storeConfirmRes.reason === "conflict" ? "ERR_PERSISTENCE_CONFLICT" : "ERR_PERSISTENCE_UNAVAILABLE",
        candidate_operation: confirmReduction.next_operation,
        continuation: { kind: "reconcile_no_resubmit", transaction_hash: txHash },
      };
    }

    return {
      ok: true,
      operation: confirmReduction.next_operation,
      local_commit: confirmReduction.local_commit,
      continuation: confirmReduction.continuation,
    };
  }

  // Reachable only if new planning result types are added but not handled
  throw new Error("Unhandled planning result kind");
}
