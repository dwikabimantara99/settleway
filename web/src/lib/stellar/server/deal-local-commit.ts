import type { DbDeal } from "../../db/types";
import type { StellarOperation } from "../types";
import type { StellarLocalCommitDecision } from "./execution-reducer";
import { resolveStellarActionPlan } from "./action-policy";

export interface StellarDealLocalCommitInput {
  deal: DbDeal;
  operation: StellarOperation;
  local_commit: StellarLocalCommitDecision;
  contract_id: string;
  committed_at: string;
}

export type LocalCommitFailureReason =
  | "ERR_INVALID_IDENTIFIER"
  | "ERR_DEAL_OPERATION_MISMATCH"
  | "ERR_OPERATION_NOT_CONFIRMED"
  | "ERR_OPERATION_POLICY_MISMATCH"
  | "ERR_LOCAL_COMMIT_MISMATCH"
  | "ERR_ILLEGAL_LOCAL_TRANSITION"
  | "ERR_CONTRACT_ID_MISMATCH"
  | "ERR_ESCROW_ID_MISMATCH"
  | "ERR_TRANSACTION_HASH_MISMATCH"
  | "ERR_UNEXPECTED_ESCROW_ID";

export type StellarDealLocalCommitResult =
  | { ok: true; current_deal: DbDeal; next_deal: DbDeal }
  | { ok: false; reason: LocalCommitFailureReason };

export function planDealLocalCommit(input: StellarDealLocalCommitInput): StellarDealLocalCommitResult {
  const { deal, operation, local_commit, contract_id, committed_at } = input;

  // Validate identifiers
  if (!contract_id || contract_id.trim() !== contract_id) {
    return { ok: false, reason: "ERR_INVALID_IDENTIFIER" };
  }
  if (!committed_at || committed_at.trim() !== committed_at) {
    return { ok: false, reason: "ERR_INVALID_IDENTIFIER" };
  }

  // 1. deal_id matches
  if (operation.deal_id !== deal.id) {
    return { ok: false, reason: "ERR_DEAL_OPERATION_MISMATCH" };
  }

  // 2. operation is confirmed
  if (operation.operation_status !== "confirmed") {
    return { ok: false, reason: "ERR_OPERATION_NOT_CONFIRMED" };
  }

  // 3. transaction_hash exists
  if (!operation.transaction_hash) {
    return { ok: false, reason: "ERR_TRANSACTION_HASH_MISMATCH" };
  }

  // Handle "none" early for sync-only
  if (local_commit.kind === "none") {
    const next_deal = JSON.parse(JSON.stringify(deal));
    return { ok: true, current_deal: deal, next_deal };
  }

  // 4. local-commit transaction hash matches operation transaction hash
  if (local_commit.transaction_hash !== operation.transaction_hash) {
    return { ok: false, reason: "ERR_TRANSACTION_HASH_MISMATCH" };
  }

  // 5. operation intent matches canonical action policy
  const policyRes = resolveStellarActionPlan(operation.requested_action, operation.expected_local_status);
  if (!policyRes.ok) {
    return { ok: false, reason: "ERR_OPERATION_POLICY_MISMATCH" };
  }
  const policy = policyRes.plan;
  if (
    operation.expected_local_status !== policy.expected_local_status ||
    operation.target_local_status !== policy.target_local_status ||
    operation.stellar_method !== policy.stellar_method
  ) {
    return { ok: false, reason: "ERR_OPERATION_POLICY_MISMATCH" };
  }

  // 6. local-commit kind matches policy
  if (policy.local_commit_policy === "sync_only" && local_commit.kind !== "sync_create_deal") {
    return { ok: false, reason: "ERR_LOCAL_COMMIT_MISMATCH" };
  }
  if (policy.local_commit_policy === "advance_status" && local_commit.kind !== "advance_status") {
    return { ok: false, reason: "ERR_LOCAL_COMMIT_MISMATCH" };
  }

  const next_deal: DbDeal = JSON.parse(JSON.stringify(deal));

  if (local_commit.kind === "sync_create_deal") {
    // For create_deal
    // 7. target status equals canonical target. Note: create_deal status must already equal target (WAITING_DEPOSITS)
    if (deal.status !== policy.target_local_status) {
      return { ok: false, reason: "ERR_ILLEGAL_LOCAL_TRANSITION" };
    }

    // null contract ID may become trusted, non-null must equal
    if (deal.stellar_contract_id !== null && deal.stellar_contract_id !== contract_id) {
      return { ok: false, reason: "ERR_CONTRACT_ID_MISMATCH" };
    }

    // 8. create-deal escrow ID equals operation result escrow ID
    if (!operation.result_escrow_id || operation.result_escrow_id !== local_commit.result_escrow_id) {
      return { ok: false, reason: "ERR_ESCROW_ID_MISMATCH" };
    }

    next_deal.stellar_contract_id = contract_id;
    next_deal.stellar_escrow_id = operation.result_escrow_id;
    next_deal.latest_stellar_tx_hash = operation.transaction_hash;
    next_deal.stellar_sync_status = "idle";
    next_deal.updated_at = committed_at;

    return { ok: true, current_deal: deal, next_deal };
  }

  if (local_commit.kind === "advance_status") {
    // For transition
    // current deal status equals expected status
    if (deal.status !== operation.expected_local_status) {
      return { ok: false, reason: "ERR_ILLEGAL_LOCAL_TRANSITION" };
    }

    // next deal status equals canonical target
    if (local_commit.target_status !== policy.target_local_status) {
      return { ok: false, reason: "ERR_ILLEGAL_LOCAL_TRANSITION" };
    }

    // contract ID already equals trusted contract ID
    if (deal.stellar_contract_id !== contract_id) {
      return { ok: false, reason: "ERR_CONTRACT_ID_MISMATCH" };
    }

    // existing escrow ID is present and preserved
    if (!deal.stellar_escrow_id) {
      return { ok: false, reason: "ERR_ESCROW_ID_MISMATCH" };
    }

    // 9. transition operations have no result escrow ID
    if (operation.result_escrow_id !== null) {
      return { ok: false, reason: "ERR_UNEXPECTED_ESCROW_ID" };
    }

    next_deal.status = policy.target_local_status;
    next_deal.latest_stellar_tx_hash = operation.transaction_hash;
    next_deal.stellar_sync_status = "idle";
    next_deal.updated_at = committed_at;

    return { ok: true, current_deal: deal, next_deal };
  }

  return { ok: false, reason: "ERR_LOCAL_COMMIT_MISMATCH" };
}
