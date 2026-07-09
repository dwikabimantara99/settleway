import { createStellarIdempotencyKey } from "@/lib/stellar/helpers";
export type OrchestratorStellarAction = Exclude<StellarAction, "expire_proof" | "reject_delivery">;
import type { DbDeal } from "@/lib/db/types";
import type { StellarAction, StellarOperation } from "@/lib/stellar/types";
import { coordinateDealExecution } from "../deal-execution-coordinator";
import type { StellarDealExecutionCoordinatorResult } from "../deal-execution-coordinator";
import type { StellarAdapterConfirmationResult } from "../adapter-contracts";
import type { SmokeRuntime } from "./runtime";
import {
  buildSmokeScenarioEvidence,
  smokeActionEvidence,
} from "./evidence";
import type {
  SmokeActionEvidence,
  SmokeScenarioEvidence,
  SmokeScenarioName,
} from "./evidence";

export type SmokeScenarioResult =
  | {
      readonly ok: true;
      readonly evidence: SmokeScenarioEvidence;
      readonly final_deal: DbDeal;
      readonly operations: readonly StellarOperation[];
    }
  | {
      readonly ok: false;
      readonly error_code: SmokeScenarioErrorCode;
      readonly failed_action: OrchestratorStellarAction | null;
      readonly evidence: SmokeScenarioEvidence | null;
      readonly coordinator_result?: StellarDealExecutionCoordinatorResult;
    };

export type SmokeScenarioErrorCode =
  | "ERR_MISSING_DEAL"
  | "ERR_COORDINATOR_FAILURE"
  | "ERR_OPERATION_NOT_FOUND";

export type SmokeReconciliationResult =
  | {
      readonly ok: true;
      readonly evidence: SmokeScenarioEvidence;
      readonly final_deal: DbDeal;
      readonly operation: StellarOperation | null;
      readonly confirmation: StellarAdapterConfirmationResult | null;
      readonly local_state_applied: boolean;
    }
  | {
      readonly ok: false;
      readonly error_code: SmokeReconciliationErrorCode;
      readonly evidence: SmokeScenarioEvidence | null;
      readonly operation: StellarOperation | null;
      readonly confirmation: StellarAdapterConfirmationResult | null;
      readonly coordinator_result?: StellarDealExecutionCoordinatorResult;
    };

export type SmokeReconciliationErrorCode =
  | "ERR_MISSING_DEAL"
  | "ERR_INVALID_TRANSACTION_HASH"
  | "ERR_COORDINATOR_FAILURE"
  | "ERR_OPERATION_NOT_FOUND";

export type SmokeTransactionHashReconciliationInput = {
  readonly action: OrchestratorStellarAction;
  readonly transaction_hash: string;
};

const TX_HASH_PATTERN = /^[0-9a-fA-F]{64}$/;

function baseDealFromRuntime(runtime: SmokeRuntime): DbDeal {
  const amounts = runtime.config.fixtures.amounts;
  const buyerTotal =
    amounts.principal_idr +
    amounts.buyer_bond_idr +
    amounts.buyer_fee_idr;
  const sellerTotal = amounts.seller_bond_idr + amounts.seller_fee_idr;

  return {
    id: runtime.config.fixtures.deal_id,
    listing_id: null,
    buyer_request_id: null,
    buyer_id: runtime.config.fixtures.buyer_id,
    seller_id: runtime.config.fixtures.seller_id,
    commodity: runtime.config.fixtures.commodity,
    volume_kg: runtime.config.fixtures.volume_kg,
    principal_idr: amounts.principal_idr,
    buyer_bond_idr: amounts.buyer_bond_idr,
    seller_bond_idr: amounts.seller_bond_idr,
    buyer_fee_idr: amounts.buyer_fee_idr,
    seller_fee_idr: amounts.seller_fee_idr,
    buyer_total_idr: buyerTotal,
    seller_total_idr: sellerTotal,
    status: "WAITING_DEPOSITS",
    stellar_mode: "testnet",
    stellar_contract_id: null,
    stellar_escrow_id: null,
    latest_stellar_tx_hash: null,
    stellar_sync_status: "idle",
    proof_hash: null,
    terms: {},
    created_at: "smoke:deal:created",
    updated_at: "smoke:deal:created",
  };
}

function timestampSet(scenario: SmokeScenarioName, index: number): {
  readonly operation_timestamps: {
    readonly created_at: string;
    readonly updated_at: string;
  };
  readonly local_commit_timestamp: string;
} {
  return {
    operation_timestamps: {
      created_at: `smoke:${scenario}:${index}:created`,
      updated_at: `smoke:${scenario}:${index}:updated`,
    },
    local_commit_timestamp: `smoke:${scenario}:${index}:committed`,
  };
}

function operationKey(deal: DbDeal, action: OrchestratorStellarAction): string {
  let scope: string | null = deal.status;
  if (action === "create_deal") scope = "WAITING_DEPOSITS";
  if (action === "buyer_deposit" || action === "accept_delivery") scope = deal.buyer_id;
  if (action === "seller_deposit") scope = deal.seller_id;

  return createStellarIdempotencyKey(
    deal.id,
    scope,
    action,
  );
}

function readCurrentDeal(runtime: SmokeRuntime): DbDeal | null {
  return runtime.persistence.readDeal();
}

function readOperationAfterAction(
  runtime: SmokeRuntime,
  dealBeforeAction: DbDeal,
  action: OrchestratorStellarAction,
): StellarOperation | null {
  return runtime.persistence.readOperation(operationKey(dealBeforeAction, action));
}

async function coordinateSmokeAction(input: {
  readonly runtime: SmokeRuntime;
  readonly scenario: SmokeScenarioName;
  readonly index: number;
  readonly action: Exclude<OrchestratorStellarAction, "expire_proof" | "reject_delivery">;
  readonly existing_operation: StellarOperation | null;
}): Promise<
  | {
      readonly ok: true;
      readonly next_deal: DbDeal;
      readonly operation: StellarOperation | null;
      readonly action_evidence: SmokeActionEvidence;
    }
  | {
      readonly ok: false;
      readonly error_code: SmokeScenarioErrorCode;
      readonly action: Exclude<OrchestratorStellarAction, "expire_proof" | "reject_delivery">;
      readonly coordinator_result?: StellarDealExecutionCoordinatorResult;
    }
> {
  const currentDeal = readCurrentDeal(input.runtime);
  if (currentDeal === null) {
    return { ok: false, error_code: "ERR_MISSING_DEAL", action: input.action as OrchestratorStellarAction };
  }

  const timestamps = timestampSet(input.scenario, input.index);
  const coordinatorResult = await coordinateDealExecution({
    action: input.action as OrchestratorStellarAction,
    operation_id: `smoke:${input.scenario}:${input.index}:${input.action}`,
    deal: currentDeal,
    metadata: input.runtime.metadata,
    deal_hash: input.runtime.config.fixtures.deal_hash,
    proof_hash: input.runtime.config.fixtures.proof_hash,
    expires_at: input.runtime.config.fixtures.expires_at,
    existing_operation: input.existing_operation,
    stellar_contract_id: input.runtime.config.contract_id,
    operation_timestamps: timestamps.operation_timestamps,
    local_commit_timestamp: timestamps.local_commit_timestamp,
    operation_persistence: input.runtime.persistence.operation_persistence,
    deal_persistence: input.runtime.persistence.deal_persistence,
    execution_adapter: input.runtime.execution_adapter,
  });

  if (!coordinatorResult.ok) {
    return {
      ok: false,
      error_code: "ERR_COORDINATOR_FAILURE",
      action: input.action as OrchestratorStellarAction,
      coordinator_result: coordinatorResult,
    };
  }

  const operation = input.existing_operation === null
    ? readOperationAfterAction(input.runtime, currentDeal, input.action)
    : input.runtime.persistence.readOperation(input.existing_operation.idempotency_key);

  if (operation === null) {
    return { ok: false, error_code: "ERR_OPERATION_NOT_FOUND", action: input.action as OrchestratorStellarAction };
  }

  return {
    ok: true,
    next_deal: coordinatorResult.next_deal,
    operation,
    action_evidence: smokeActionEvidence({
      action: input.action as OrchestratorStellarAction,
      operation,
      deal: coordinatorResult.next_deal,
    }),
  };
}

async function runScenario(input: {
  readonly runtime: SmokeRuntime;
  readonly scenario: SmokeScenarioName;
  readonly actions: readonly OrchestratorStellarAction[];
}): Promise<SmokeScenarioResult> {
  input.runtime.persistence.seedDeal(baseDealFromRuntime(input.runtime));
  const actions: SmokeActionEvidence[] = [];

  for (let index = 0; index < input.actions.length; index += 1) {
    const action = input.actions[index];
    if (action === undefined) {
      return {
        ok: false,
        error_code: "ERR_COORDINATOR_FAILURE",
        failed_action: null,
        evidence: null,
      };
    }

    const result = await coordinateSmokeAction({
      runtime: input.runtime,
      scenario: input.scenario,
      index,
      action,
      existing_operation: null,
    });

    if (!result.ok) {
      const currentDeal = readCurrentDeal(input.runtime);
      const evidence = currentDeal === null
        ? null
        : buildSmokeScenarioEvidence({
            scenario: input.scenario,
            config: input.runtime.config,
            actions,
            final_deal: currentDeal,
          });
      return {
        ok: false,
        error_code: result.error_code,
        failed_action: result.action,
        evidence,
        coordinator_result: result.coordinator_result,
      };
    }

    actions.push(result.action_evidence);
  }

  const finalDeal = readCurrentDeal(input.runtime);
  if (finalDeal === null) {
    return {
      ok: false,
      error_code: "ERR_MISSING_DEAL",
      failed_action: null,
      evidence: null,
    };
  }

  const operations = input.runtime.persistence.listOperationsByDeal(finalDeal.id);
  const evidence = buildSmokeScenarioEvidence({
    scenario: input.scenario,
    config: input.runtime.config,
    actions,
    final_deal: finalDeal,
  });

  return {
    ok: true,
    evidence,
    final_deal: finalDeal,
    operations,
  };
}

export async function runHappyPathSmokeScenario(
  runtime: SmokeRuntime,
): Promise<SmokeScenarioResult> {
  return runScenario({
    runtime,
    scenario: "happy_path",
    actions: [
      "create_deal",
      "buyer_deposit",
      "seller_deposit",
      "submit_proof",
      "mark_delivered",
      "accept_delivery",
    ],
  });
}

export async function runExpirySmokeScenario(
  runtime: SmokeRuntime,
): Promise<SmokeScenarioResult> {
  return runScenario({
    runtime,
    scenario: "expiry",
    actions: ["create_deal", "expire"],
  });
}

export async function runRefundSmokeScenario(
  runtime: SmokeRuntime,
): Promise<SmokeScenarioResult> {
  return runScenario({
    runtime,
    scenario: "refund",
    actions: ["create_deal", "buyer_deposit", "refund"],
  });
}

export async function reconcileSmokeOperation(input: {
  readonly runtime: SmokeRuntime;
  readonly operation: StellarOperation;
  readonly deal?: DbDeal;
}): Promise<SmokeReconciliationResult> {
  if (input.deal !== undefined) {
    input.runtime.persistence.seedDeal(input.deal);
  }

  const result = await coordinateSmokeAction({
    runtime: input.runtime,
    scenario: "reconciliation",
    index: 0,
    action: input.operation.requested_action as unknown as OrchestratorStellarAction,
    existing_operation: input.operation,
  });

  const currentDeal = readCurrentDeal(input.runtime);
  if (!result.ok) {
    const evidence = currentDeal === null
      ? null
      : buildSmokeScenarioEvidence({
          scenario: "reconciliation",
          config: input.runtime.config,
          actions: [],
          final_deal: currentDeal,
        });
    return {
      ok: false,
      error_code: result.error_code,
      evidence,
      operation: input.runtime.persistence.readOperation(input.operation.idempotency_key),
      confirmation: null,
      coordinator_result: result.coordinator_result,
    };
  }

  const evidence = buildSmokeScenarioEvidence({
    scenario: "reconciliation",
    config: input.runtime.config,
    actions: [result.action_evidence],
    final_deal: result.next_deal,
  });

  return {
    ok: true,
    evidence,
    final_deal: result.next_deal,
    operation: result.operation,
    confirmation: null,
    local_state_applied:
      result.operation?.operation_status === "confirmed" &&
      result.next_deal.stellar_sync_status === "idle",
  };
}

export async function reconcileSmokeTransactionHash(
  input: SmokeTransactionHashReconciliationInput & {
    readonly runtime: SmokeRuntime;
  },
): Promise<SmokeReconciliationResult> {
  if (!TX_HASH_PATTERN.test(input.transaction_hash)) {
    return {
      ok: false,
      error_code: "ERR_INVALID_TRANSACTION_HASH",
      evidence: null,
      operation: null,
      confirmation: null,
    };
  }

  const confirmation = await input.runtime.execution_adapter.confirm({
    action: input.action as OrchestratorStellarAction,
    transaction_hash: input.transaction_hash,
  });

  const currentDeal = readCurrentDeal(input.runtime);
  if (currentDeal === null) {
    return {
      ok: false,
      error_code: "ERR_MISSING_DEAL",
      evidence: null,
      operation: null,
      confirmation,
    };
  }

  const evidence = buildSmokeScenarioEvidence({
    scenario: "reconciliation",
    config: input.runtime.config,
    actions: [
      smokeActionEvidence({
        action: input.action as OrchestratorStellarAction,
        operation: null,
        deal: currentDeal,
      }),
    ],
    final_deal: currentDeal,
  });

  return {
    ok: true,
    evidence,
    final_deal: currentDeal,
    operation: null,
    confirmation,
    local_state_applied: false,
  };
}
