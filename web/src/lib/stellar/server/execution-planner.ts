import type { StellarOperation } from "@/lib/stellar/types";
import type {
  StellarPreparedInvocation,
  StellarAdapterConfirmRequest,
} from "./adapter-contracts";
import type {
  StellarInvocationBuildInput,
  StellarInvocationErrorCode,
  StellarInvocationErrorField,
} from "./invocation-builder";
import type { StellarLocalCommitDecision } from "./execution-reducer";

import { createStellarIdempotencyKey } from "@/lib/stellar/helpers";
import { resolveStellarActionPlan } from "./action-policy";
import { buildStellarInvocation } from "./invocation-builder";

export type StellarExecutionPlanningErrorCode =
  | "ERR_INVALID_IDENTIFIER"
  | "ERR_OPERATION_POLICY_MISMATCH"
  | "ERR_EXISTING_OPERATION_MISMATCH"
  | "ERR_EXISTING_OPERATION_PENDING"
  | "ERR_EXISTING_OPERATION_FAILED"
  | "ERR_EXISTING_OPERATION_CORRUPT";

export interface StellarExecutionPlanningInput {
  operation_id: string;
  deal_id: string;
  build_input: StellarInvocationBuildInput;
  existing_operation: StellarOperation | null;
  created_at: string;
}

export type StellarExecutionPlan =
  | {
      ok: true;
      kind: "persist_pending_before_submit";
      operation_id: string;
      operation: StellarOperation;
      invocation: StellarPreparedInvocation;
    }
  | {
      ok: true;
      kind: "confirm_existing";
      operation: StellarOperation;
      confirm_request: StellarAdapterConfirmRequest;
    }
  | {
      ok: true;
      kind: "apply_existing_confirmed";
      operation: StellarOperation;
      local_commit: StellarLocalCommitDecision;
    };

export type StellarExecutionPlanningFailure =
  | {
      ok: false;
      stage: "input";
      error_code: "ERR_INVALID_IDENTIFIER";
      field: "operation_id" | "deal_id" | "created_at";
    }
  | {
      ok: false;
      stage: "build";
      error_code: StellarInvocationErrorCode;
      field?: StellarInvocationErrorField;
    }
  | {
      ok: false;
      stage: "operation";
      error_code:
        | "ERR_OPERATION_POLICY_MISMATCH"
        | "ERR_EXISTING_OPERATION_MISMATCH"
        | "ERR_EXISTING_OPERATION_PENDING"
        | "ERR_EXISTING_OPERATION_FAILED"
        | "ERR_EXISTING_OPERATION_CORRUPT";
    };

export type StellarExecutionPlanningResult =
  | StellarExecutionPlan
  | StellarExecutionPlanningFailure;

function validateOpaqueIdentifier(
  val: string,
  field: "operation_id" | "deal_id" | "created_at",
): StellarExecutionPlanningFailure | null {
  if (val === "" || val.trim() === "" || val !== val.trim()) {
    return { ok: false, stage: "input", error_code: "ERR_INVALID_IDENTIFIER", field };
  }
  return null;
}

export function planStellarExecution(
  input: StellarExecutionPlanningInput,
): StellarExecutionPlanningResult {
  // Gate 9: Validate opaque identifiers
  const opIdErr = validateOpaqueIdentifier(input.operation_id, "operation_id");
  if (opIdErr !== null) return opIdErr;
  const dealIdErr = validateOpaqueIdentifier(input.deal_id, "deal_id");
  if (dealIdErr !== null) return dealIdErr;
  const caErr = validateOpaqueIdentifier(input.created_at, "created_at");
  if (caErr !== null) return caErr;

  // Gate 10: Resolve canonical policy and idempotency
  const planResult = resolveStellarActionPlan(
    input.build_input.action,
    input.build_input.expected_local_status,
  );

  if (planResult.ok === false) {
    return {
      ok: false,
      stage: "operation",
      error_code: "ERR_OPERATION_POLICY_MISMATCH",
    };
  }
  const canonicalPlan = planResult.plan;

  const scope = ("idempotency_scope" in input.build_input && (input.build_input as { idempotency_scope?: string | null }).idempotency_scope !== undefined)
    ? ((input.build_input as { idempotency_scope?: string | null }).idempotency_scope ?? null)
    : input.build_input.expected_local_status;

  const derivedIdempotencyKey = createStellarIdempotencyKey(
    input.deal_id,
    scope,
    input.build_input.action,
  );

  // Gate 11: Verify existing-operation intent first
  if (input.existing_operation !== null) {
    const existing = input.existing_operation;

    if (
      existing.idempotency_key !== derivedIdempotencyKey ||
      existing.deal_id !== input.deal_id ||
      existing.requested_action !== input.build_input.action ||
      existing.expected_local_status !== input.build_input.expected_local_status ||
      existing.target_local_status !== canonicalPlan.target_local_status ||
      existing.stellar_method !== canonicalPlan.stellar_method
    ) {
      return {
        ok: false,
        stage: "operation",
        error_code: "ERR_EXISTING_OPERATION_MISMATCH",
      };
    }

    // Gate 12: Plan existing-operation behavior
    if (existing.operation_status === "pending") {
      return {
        ok: false,
        stage: "operation",
        error_code: "ERR_EXISTING_OPERATION_PENDING",
      };
    }

    if (existing.operation_status === "failed") {
      return {
        ok: false,
        stage: "operation",
        error_code: "ERR_EXISTING_OPERATION_FAILED",
      };
    }

    if (existing.operation_status === "submitted" || existing.operation_status === "unknown") {
      if (
        existing.transaction_hash === null ||
        existing.result_escrow_id !== null ||
        existing.confirmed_at !== null
      ) {
        return {
          ok: false,
          stage: "operation",
          error_code: "ERR_EXISTING_OPERATION_CORRUPT",
        };
      }

      return {
        ok: true,
        kind: "confirm_existing",
        operation: { ...existing },
        confirm_request: {
          action: existing.requested_action,
          transaction_hash: existing.transaction_hash,
        },
      };
    }

    if (existing.operation_status === "confirmed") {
      if (
        existing.transaction_hash === null ||
        existing.confirmed_at === null ||
        existing.public_error_code !== null
      ) {
        return {
          ok: false,
          stage: "operation",
          error_code: "ERR_EXISTING_OPERATION_CORRUPT",
        };
      }

      let reconstructedCommit: StellarLocalCommitDecision;

      if (existing.requested_action === "create_deal") {
        if (existing.result_escrow_id === null) {
          return {
            ok: false,
            stage: "operation",
            error_code: "ERR_EXISTING_OPERATION_CORRUPT",
          };
        }
        reconstructedCommit = {
          kind: "sync_create_deal",
          transaction_hash: existing.transaction_hash,
          result_escrow_id: existing.result_escrow_id,
        };
      } else {
        if (existing.result_escrow_id !== null) {
          return {
            ok: false,
            stage: "operation",
            error_code: "ERR_EXISTING_OPERATION_CORRUPT",
          };
        }
        reconstructedCommit = {
          kind: "advance_status",
          target_status: canonicalPlan.target_local_status,
          transaction_hash: existing.transaction_hash,
        };
      }

      return {
        ok: true,
        kind: "apply_existing_confirmed",
        operation: { ...existing },
        local_commit: reconstructedCommit,
      };
    }
  }

  // Gate 13: Plan a new operation without submitting
  const buildResult = buildStellarInvocation(input.build_input);
  if (buildResult.ok === false) {
    return {
      ok: false,
      stage: "build",
      error_code: buildResult.error_code,
      ...(buildResult.field !== undefined ? { field: buildResult.field } : {}),
    };
  }

  const pendingOperation: StellarOperation = {
    idempotency_key: derivedIdempotencyKey,
    deal_id: input.deal_id,
    requested_action: input.build_input.action,
    expected_local_status: input.build_input.expected_local_status,
    target_local_status: canonicalPlan.target_local_status,
    stellar_method: canonicalPlan.stellar_method,
    operation_status: "pending",
    transaction_hash: null,
    result_escrow_id: null,
    public_error_code: null,
    created_at: input.created_at,
    submitted_at: null,
    confirmed_at: null,
    updated_at: input.created_at,
  };

  return {
    ok: true,
    kind: "persist_pending_before_submit",
    operation_id: input.operation_id,
    operation: pendingOperation,
    invocation: buildResult.invocation,
  };
}
