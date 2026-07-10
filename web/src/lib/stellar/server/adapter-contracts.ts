import type { StellarAction, StellarContractMethod } from "@/lib/stellar/types";
import type { EscrowAction } from "@/lib/escrow/state-machine";
import type { StellarSignerRole } from "./action-policy";

export type StellarPublicErrorCode =
  | "ERR_AUTH_FAILED"
  | "ERR_INVALID_STATE"
  | "ERR_NOT_EXPIRED"
  | "ERR_NO_FUNDS_TO_REFUND"
  | "ERR_CONTRACT_REJECTED"
  | "ERR_NETWORK_FAILURE"
  | "ERR_TIMEOUT"
  | "ERR_UNKNOWN";

export type StellarUnknownOutcomeCode =
  | "ERR_NETWORK_FAILURE"
  | "ERR_TIMEOUT"
  | "ERR_UNKNOWN";

export type StellarConfirmedFailureCode =
  | "ERR_AUTH_FAILED"
  | "ERR_INVALID_STATE"
  | "ERR_NOT_EXPIRED"
  | "ERR_NO_FUNDS_TO_REFUND"
  | "ERR_CONTRACT_REJECTED";

export type StellarContractArgument =
  | {
      kind: "address";
      value: string;
    }
  | {
      kind: "u64";
      value: string;
    }
  | {
      kind: "i128";
      value: string;
    }
  | {
      kind: "bytes32";
      value: string;
    }
  | {
      kind: "string";
      value: string;
    }
  | {
      kind: "bool";
      value: boolean;
    };

export interface StellarPreparedInvocation {
  action: StellarAction;
  method: StellarContractMethod;
  signer_role: StellarSignerRole;
  contract_id: string;
  arguments: readonly StellarContractArgument[];
}

export interface StellarAdapterSubmitRequest {
  operation_id: string;
  idempotency_key: string;
  invocation: StellarPreparedInvocation;
}

export type StellarPreSubmitStage =
  | "prepare"
  | "simulate"
  | "sign"
  | "submit";

export interface StellarSubmittedResult {
  outcome: "submitted";
  action: StellarAction;
  transaction_hash: string;
}

export interface StellarPreSubmitFailure {
  outcome: "failed";
  action: StellarAction;
  stage: StellarPreSubmitStage;
  transaction_hash: null;
  error_code: StellarPublicErrorCode;
  retryable: boolean;
}

export type StellarAdapterSubmitResult =
  | StellarSubmittedResult
  | StellarPreSubmitFailure;

export interface StellarAdapterConfirmRequest {
  action: StellarAction;
  transaction_hash: string;
}

export interface StellarConfirmedCreateDealResult {
  outcome: "confirmed";
  action: "create_deal" | "create_deal_custody";
  transaction_hash: string;
  result_escrow_id: string;
}

export interface StellarConfirmedEscrowActionResult {
  outcome: "confirmed";
  action: EscrowAction;
  transaction_hash: string;
  result_escrow_id: null;
}

export type StellarConfirmedResult =
  | StellarConfirmedCreateDealResult
  | StellarConfirmedEscrowActionResult;

export interface StellarConfirmedFailure {
  outcome: "failed";
  action: StellarAction;
  transaction_hash: string;
  error_code: StellarConfirmedFailureCode;
  retryable: false;
}

export interface StellarUnknownResult {
  outcome: "unknown";
  action: StellarAction;
  transaction_hash: string;
  error_code: StellarUnknownOutcomeCode;
  reconciliation_required: true;
  resubmission_allowed: false;
}

export type StellarAdapterConfirmationResult =
  | StellarConfirmedResult
  | StellarConfirmedFailure
  | StellarUnknownResult;

export interface StellarExecutionAdapter {
  submit(
    request: StellarAdapterSubmitRequest,
  ): Promise<StellarAdapterSubmitResult>;

  confirm(
    request: StellarAdapterConfirmRequest,
  ): Promise<StellarAdapterConfirmationResult>;
}

export function isConfirmedStellarResult(
  result: StellarAdapterConfirmationResult,
): result is StellarConfirmedResult {
  return result.outcome === "confirmed";
}

export function isUnknownStellarResult(
  result: StellarAdapterConfirmationResult,
): result is StellarUnknownResult {
  return result.outcome === "unknown";
}

export function requiresStellarReconciliation(
  result: StellarAdapterConfirmationResult,
): boolean {
  return result.outcome === "unknown";
}
