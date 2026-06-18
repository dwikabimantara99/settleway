import type { DbDeal } from "../../db/types";
import type { StellarOperation } from "../types";
import type { StellarDealPersistencePort } from "./mock-store-deal-persistence";
import type { StellarExecutionAdapter } from "./adapter-contracts";
import { executeStellarOperation } from "./execution-service";
import type { StellarOperationPersistencePort } from "./execution-service";
import { assembleStellarExecutionInput } from "./execution-input-assembler";
import type { StellarExecutionAssemblyInput } from "./execution-input-assembler";
import { projectDealSyncStatus } from "./deal-sync-policy";
import { planDealLocalCommit } from "./deal-local-commit";
import { processReputationOutcome } from "../../reputation/engine";
import type { AuthoritativeReputationDecision } from "../../reputation/engine";
import { repository } from "../../repositories";
import { isPreLockDealStatus } from "../../escrow/state-machine";

export type StellarDealExecutionCoordinatorInput = StellarExecutionAssemblyInput & {
  existing_operation: StellarOperation | null;
  stellar_contract_id: string;
  operation_timestamps: {
    created_at: string;
    updated_at: string;
  };
  local_commit_timestamp: string;
  operation_persistence: StellarOperationPersistencePort;
  deal_persistence: StellarDealPersistencePort;
  execution_adapter: StellarExecutionAdapter;
};

export type StellarDealExecutionCoordinatorResult =
  | { ok: true; current_deal: DbDeal; next_deal: DbDeal }
  | {
      ok: false;
      reason: "ERR_ASSEMBLY_FAILURE";
      error_code?: string;
      builder_error_code?: import('./invocation-builder').StellarInvocationErrorCode;
      builder_field?: import('./invocation-builder').StellarInvocationErrorField;
    }
  | { ok: false; reason: "ERR_EXECUTION_SERVICE_FAILURE"; inner_result: unknown }
  | { ok: false; reason: "ERR_LOCAL_COMMIT_PLANNING_FAILURE"; error_code: string }
  | { ok: false; reason: "ERR_DEAL_PERSISTENCE_CONFLICT"; operation: StellarOperation; candidate_next_deal: DbDeal }
  | { ok: false; reason: "ERR_DEAL_PERSISTENCE_UNAVAILABLE" }
  | { ok: false; reason: "ERR_OUT_OF_SYNC"; operation: StellarOperation; candidate_next_deal: DbDeal }
  | { ok: false; reason: "ERR_EXECUTION_PERSISTENCE_FAILURE"; inner_result: unknown };

export async function coordinateDealExecution(
  input: StellarDealExecutionCoordinatorInput
): Promise<StellarDealExecutionCoordinatorResult> {
  // 1. assemble canonical build input
  const assemblyRes = assembleStellarExecutionInput(input);

  if (!assemblyRes.ok) {
    if (assemblyRes.error_code === "ERR_BUILD_VALIDATION") {
      return {
        ok: false,
        reason: "ERR_ASSEMBLY_FAILURE",
        error_code: assemblyRes.error_code,
        builder_error_code: assemblyRes.builder_error_code,
        ...(assemblyRes.builder_field !== undefined && { builder_field: assemblyRes.builder_field })
      };
    }
    return {
      ok: false,
      reason: "ERR_ASSEMBLY_FAILURE",
      error_code: assemblyRes.error_code
    };
  }

  // 2. call existing execution service
  const execRes = await executeStellarOperation({
    operation_id: input.operation_id,
    deal_id: input.deal.id,
    build_input: assemblyRes.build_input,
    existing_operation: input.existing_operation,
    timestamps: {
      created_at: input.operation_timestamps.created_at,
      submit_result_at: input.operation_timestamps.updated_at,
      confirmation_result_at: input.operation_timestamps.updated_at,
    },
    adapter: input.execution_adapter,
    persistence: input.operation_persistence
  });

  if (!execRes.ok) {
    // Preserve execution-service failures without flattening
    if (execRes.stage === "persistence") {
       return { ok: false, reason: "ERR_EXECUTION_PERSISTENCE_FAILURE", inner_result: execRes };
    }
    return { ok: false, reason: "ERR_EXECUTION_SERVICE_FAILURE", inner_result: execRes };
  }

  const candidate_operation = execRes.operation;
  const local_commit = execRes.local_commit;

  // 4. when execution succeeds, derive canonical deal synchronization behavior
  let next_deal: DbDeal | null = null;


  if (candidate_operation.operation_status === "confirmed") {
    // 5. plan the exact local deal update
    const commitPlan = planDealLocalCommit({
      deal: input.deal,
      operation: candidate_operation,
      local_commit: local_commit,
      contract_id: input.stellar_contract_id,
      committed_at: input.local_commit_timestamp
    });

    if (!commitPlan.ok) {
      return { ok: false, reason: "ERR_LOCAL_COMMIT_PLANNING_FAILURE", error_code: commitPlan.reason };
    }

    next_deal = commitPlan.next_deal;

    // 6. persist through deal CAS
    const persistRes = await input.deal_persistence.replaceIfCurrent({
      current: commitPlan.current_deal,
      next: next_deal
    });

    if (persistRes.ok) {
      // Phase 8 narrow hook: Trigger idempotent reputation processing after safe recovery
      try {
        let outcome: AuthoritativeReputationDecision['reputation_outcome'] | null = null;
        if (next_deal.status === 'COMPLETED') outcome = 'transaction_completed';
        else if (next_deal.status === 'REFUNDED') {
          if (input.action === 'expire') {
            if (commitPlan.current_deal.status === 'BUYER_FUNDED') outcome = 'seller_failed_deposit';
            else if (commitPlan.current_deal.status === 'SELLER_FUNDED') outcome = 'buyer_failed_deposit';
            else if (isPreLockDealStatus(commitPlan.current_deal.status)) outcome = 'refunded_before_locked';
          } else if (input.action === 'refund' && isPreLockDealStatus(commitPlan.current_deal.status)) {
            outcome = 'refunded_before_locked';
          }
        } else if (next_deal.status === 'EXPIRED') {
          if (commitPlan.current_deal.status === 'BUYER_FUNDED') outcome = 'seller_failed_deposit';
          else if (commitPlan.current_deal.status === 'SELLER_FUNDED') outcome = 'buyer_failed_deposit';
        }
        
        if (outcome) {
          const settlementReference =
            next_deal.latest_stellar_tx_hash ??
            (next_deal.proof_hash ? `proof:${next_deal.proof_hash}` : `room-settlement:${next_deal.id}`);
          await processReputationOutcome(repository, {
            deal_id: next_deal.id,
            buyer_id: next_deal.buyer_id,
            seller_id: next_deal.seller_id,
            reputation_outcome: outcome,
            principal_idr: next_deal.principal_idr,
            transaction_hash: next_deal.latest_stellar_tx_hash,
            proof_hash: next_deal.proof_hash,
            settlement_reference: settlementReference,
            settled_at: next_deal.updated_at,
            local_terminal_outcome_persisted: true,
            operation_status: candidate_operation.operation_status,
            sync_status: next_deal.stellar_sync_status
          }, () => globalThis.crypto.randomUUID());
        }
      } catch (err) {
        console.error("Hook error:", err);
        // Ignore reputation hook failures to avoid breaking core execution
      }
    } else {
      return { ok: false, reason: "ERR_OUT_OF_SYNC", operation: candidate_operation, candidate_next_deal: next_deal };
    }
  }

  // Derive final sync status
  // Wait, if there's no local commit, what should we do? We should still update stellar_sync_status if it changes.
  // Actually, if operation is unknown or pre-submit failure, the deal sync status might change.
  // "deal sync status becomes unknown when safe CAS succeeds"
  if (candidate_operation.operation_status !== "confirmed") {
    const projectedSyncStatus = projectDealSyncStatus({
      stellar_mode: input.deal.stellar_mode,
      operation_status: candidate_operation.operation_status,
      deal_persistence_success: null
    });

    if (projectedSyncStatus !== input.deal.stellar_sync_status) {
      const syncUpdate = JSON.parse(JSON.stringify(input.deal));
      syncUpdate.stellar_sync_status = projectedSyncStatus;
      syncUpdate.updated_at = input.local_commit_timestamp;

      const persistRes = await input.deal_persistence.replaceIfCurrent({
        current: input.deal,
        next: syncUpdate
      });

      if (!persistRes.ok) {
        if (persistRes.reason === "conflict") {
           return { ok: false, reason: "ERR_DEAL_PERSISTENCE_CONFLICT", operation: candidate_operation, candidate_next_deal: syncUpdate };
        } else {
           return { ok: false, reason: "ERR_DEAL_PERSISTENCE_UNAVAILABLE" };
        }
      }
      return { ok: true, current_deal: input.deal, next_deal: syncUpdate };
    } else {
      return { ok: true, current_deal: input.deal, next_deal: input.deal }; // no-op sync update
    }
  }

  // If we reach here, we had a confirmed operation and deal persistence succeeded

  return { ok: true, current_deal: input.deal, next_deal: next_deal! };
}
