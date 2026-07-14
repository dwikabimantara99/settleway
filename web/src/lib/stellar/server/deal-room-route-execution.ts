import type { DbDeal } from "@/lib/db/types";
import { repository } from "@/lib/repositories";
import { coordinateDealExecution } from "./deal-execution-coordinator";
import { createStellarIdempotencyKey } from "../helpers";
import {
  RepositoryDealPersistence,
  RepositoryStellarOperationPersistence,
} from "./repository-execution-persistence";
import type { DealRoomTestnetRuntime } from "./deal-room-testnet-runtime";
import type { StellarOperation, StellarAction } from "../types";

export type DealRoomRouteExecutionAction =
  | "expire"
  | "refund"
  | "submit_proof"
  | "mark_delivered"
  | "accept_delivery";

/**
 * Explicit typed map from base route actions to their custody-rail variants.
 * Fails closed: any action not in this map returns null and is rejected before execution.
 */
export const CUSTODY_ACTION_MAP: Partial<Record<DealRoomRouteExecutionAction, StellarAction>> = {
  submit_proof: "submit_proof_custody",
  mark_delivered: "mark_delivered_custody",
  accept_delivery: "accept_delivery_custody",
  expire: "expire_custody",
  refund: "refund_custody",
} as const;

export function resolveCustodyAction(action: DealRoomRouteExecutionAction): StellarAction | null {
  return CUSTODY_ACTION_MAP[action] ?? null;
}

export interface DealRoomRouteExecutionFailure {
  status: number;
  code: string;
  message: string;
  diagnostic?: Record<string, unknown>;
}

export type DealRoomRouteExecutionResult =
  | {
      ok: true;
      deal: DbDeal;
      operation: StellarOperation;
    }
  | {
      ok: false;
      failure: DealRoomRouteExecutionFailure;
    };

// Post-lock actions should use the same bounded reconciliation posture as funding:
// patient enough for normal Testnet lag, still finite for honest failures.
const ROUTE_RECONCILIATION_ATTEMPTS = 12;
const ROUTE_RECONCILIATION_DELAY_MS = 4000;

function currentTimestamp(): string {
  return new Date().toISOString();
}

function isReconciliationPending(operation: StellarOperation | null): boolean {
  return (
    operation !== null &&
    (operation.operation_status === "submitted" ||
      operation.operation_status === "unknown")
  );
}

async function waitForReconciliationWindow(): Promise<void> {
  await new Promise((resolve) =>
    setTimeout(resolve, ROUTE_RECONCILIATION_DELAY_MS),
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sanitizeDepositFailureDiagnostic(inner: any): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  if (!inner) return safe;
  
  if (typeof inner === 'string') {
    // Treat known static string inner results safely
    safe.reason = inner;
    return safe;
  }

  if (typeof inner === 'object') {
    if (typeof inner.stage === 'string') safe.stage = inner.stage;
    if (typeof inner.error_code === 'string') safe.error_code = inner.error_code;
    if (typeof inner.retryable === 'boolean') safe.retryable = inner.retryable;
    if (typeof inner.operation_status === 'string') safe.operation_status = inner.operation_status;
    if (typeof inner.public_error_code === 'string') safe.public_error_code = inner.public_error_code;
    if (typeof inner.reason === 'string') safe.reason = inner.reason;

    // Extract deeper errors safely if planner failure structure exists
    if (inner.failure && typeof inner.failure === 'object') {
      if (typeof inner.failure.stage === 'string') safe.stage = inner.failure.stage;
      if (typeof inner.failure.error_code === 'string') safe.error_code = inner.failure.error_code;
      if (typeof inner.failure.public_error_code === 'string') safe.public_error_code = inner.failure.public_error_code;
    }
  }

  return safe;
}

export function mapCoordinatorFailure(
  result: Extract<
    Awaited<ReturnType<typeof coordinateDealExecution>>,
    { ok: false }
  >,
  actionLabel: string,
): DealRoomRouteExecutionFailure {
  let diagnostic: Record<string, unknown> | undefined = undefined;
  
  if (result.reason === 'ERR_EXECUTION_SERVICE_FAILURE' && 'inner_result' in result && result.inner_result) {
    if (process.env.SETTLEWAY_DEBUG_DEPOSIT_FAILURES === '1') {
      diagnostic = sanitizeDepositFailureDiagnostic(result.inner_result);
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inner = result.inner_result as any;
    if (typeof inner === 'object' && inner !== null && !inner.ok) {
      if (inner.error_code === 'ERR_SIGNER_REJECTED') {
        return { status: 502, code: 'ERR_SIGNER_REJECTED', message: 'Profile Wallet was found, but this demo wallet cannot sign funding transactions. No deposit was made.', diagnostic };
      }
      if (inner.error_code === 'ERR_SIGNER_UNAVAILABLE') {
        return { status: 503, code: 'STELLAR_RUNTIME_UNAVAILABLE', message: 'Profile Wallet was found, but Stellar Testnet runtime is not configured locally. No deposit was made.', diagnostic };
      }
      if (inner.error_code === 'ERR_EXECUTION_TIMEOUT') {
        return { status: 504, code: 'ERR_EXECUTION_TIMEOUT', message: 'Funding was submitted but could not be confirmed yet. Do not treat this as funded until a tx hash is confirmed.', diagnostic };
      }
      
      // If we drill into a planner failure, expose known failures specifically
      if (inner.stage === 'planning' && inner.failure?.error_code === 'ERR_EXISTING_OPERATION_FAILED') {
        const pCode = inner.failure.public_error_code;
        if (pCode === 'ERR_CONTRACT_REJECTED') {
           return { status: 400, code: 'STELLAR_EXECUTION_INVALID', message: `The Stellar Testnet ${actionLabel} was previously rejected by the escrow contract.`, diagnostic };
        }
        if (pCode === 'ERR_NETWORK_FAILURE') {
           return { status: 502, code: 'STELLAR_EXECUTION_FAILED', message: `The Stellar Testnet ${actionLabel} previously failed due to a network error.`, diagnostic };
        }
      }
    } else if (typeof inner === 'string') {
      if (inner.includes('Escrow bootstrap completed without a persisted escrow id.')) {
        return { status: 502, code: 'STELLAR_EXECUTION_FAILED', message: `The Stellar Testnet ${actionLabel} could not be completed because the escrow room bootstrap failed. Detail: ${inner}`, diagnostic };
      }
    }
  }

  switch (result.reason) {
    case "ERR_OUT_OF_SYNC":
    case "ERR_DEAL_PERSISTENCE_CONFLICT":
      return {
        status: 409,
        code: "CONFLICT",
        message: "Deal execution is out of sync. Please retry.",
        diagnostic,
      };
    case "ERR_DEAL_PERSISTENCE_UNAVAILABLE":
    case "ERR_EXECUTION_PERSISTENCE_FAILURE":
      console.error("EXECUTION_PERSISTENCE_FAILURE inner_result:", JSON.stringify((result as any).inner_result, null, 2));
      return {
        status: 503,
        code: "STELLAR_PERSISTENCE_UNAVAILABLE",
        message: "Testnet execution state could not be persisted for this room action. " + JSON.stringify((result as any).inner_result || (result as any).reason || result),
        diagnostic: { ...diagnostic, inner_result: (result as any).inner_result },
      };
    case "ERR_ASSEMBLY_FAILURE":
    case "ERR_LOCAL_COMMIT_PLANNING_FAILURE":
      return {
        status: 400,
        code: "STELLAR_EXECUTION_INVALID",
        message: `The Testnet ${actionLabel} input is not valid for this deal state. (Reason: ${result.error_code})`,
        diagnostic,
      };
    default:
      return {
        status: 502,
        code: "STELLAR_EXECUTION_FAILED",
        message: `The Stellar Testnet ${actionLabel} could not be confirmed.`,
        diagnostic,
      };
  }
}

export async function executeConfirmedDealRoomRouteAction(input: {
  action: DealRoomRouteExecutionAction;
  action_label: string;
  deal: DbDeal;
  runtime: DealRoomTestnetRuntime;
  proof_hash?: string;
}): Promise<DealRoomRouteExecutionResult> {
  let scope: string = input.deal.status;
  if (input.action === "submit_proof" || input.action === "mark_delivered") {
    scope = input.deal.seller_id;
  } else if (input.action === "accept_delivery") {
    scope = input.deal.buyer_id;
  }
  const isCustody = input.deal.rail_version === 'managed_custody_testnet' || input.deal.rail_version === 'custody_v2_testnet';
  let resolvedAction: StellarAction;
  if (isCustody) {
    const custodyAction = resolveCustodyAction(input.action);
    if (custodyAction === null) {
      return {
        ok: false,
        failure: {
          status: 400,
          code: "STELLAR_EXECUTION_INVALID",
          message: `Action '${input.action}' has no custody-rail variant and cannot be executed on this deal.`,
        },
      };
    }
    resolvedAction = custodyAction;
  } else {
    resolvedAction = input.action as Exclude<StellarAction, 'expire_proof' | 'reject_delivery'>;
  }

  const operationKey = createStellarIdempotencyKey(
    input.deal.id,
    scope,
    resolvedAction,
  );

  let currentDeal = input.deal;
  let currentOperation = await repository.getStellarOperation(operationKey);
  let coordinatorResult: Awaited<
    ReturnType<typeof coordinateDealExecution>
  > | null = null;
  let persistedOperation: StellarOperation | null = null;

  if (
    currentOperation !== null &&
    currentOperation.operation_status === "confirmed" &&
    currentOperation.target_local_status === input.deal.status
  ) {
    return { ok: true, deal: input.deal, operation: currentOperation };
  }

  for (
    let attempt = 0;
    attempt < ROUTE_RECONCILIATION_ATTEMPTS;
    attempt += 1
  ) {
    const timestamp = currentTimestamp();
    const resolvedContractId = isCustody ? input.runtime.custody_contract_id : input.runtime.contract_id;
    const resolvedMetadata = {
      ...input.runtime.metadata,
      contract_id: resolvedContractId,
    };

    // TypeScript cannot narrow resolvedAction through the ternary — cast each branch explicitly
    const commonFields = {
      operation_id: operationKey,
      deal: currentDeal,
      metadata: resolvedMetadata,
      existing_operation: currentOperation,
      stellar_contract_id: resolvedContractId,
      operation_timestamps: { created_at: timestamp, updated_at: timestamp },
      local_commit_timestamp: timestamp,
      operation_persistence: new RepositoryStellarOperationPersistence(repository),
      deal_persistence: new RepositoryDealPersistence(repository),
      execution_adapter: input.runtime.execution_adapter,
    };

    const coordinatorInput: Parameters<typeof coordinateDealExecution>[0] =
      (resolvedAction === 'submit_proof' || resolvedAction === 'submit_proof_custody')
        ? { ...commonFields, action: resolvedAction, proof_hash: input.proof_hash ?? '' }
        : { ...commonFields, action: resolvedAction as Exclude<typeof resolvedAction, 'submit_proof' | 'submit_proof_custody' | 'create_deal' | 'create_deal_custody' | 'expire_proof' | 'reject_delivery'> };

    coordinatorResult = await coordinateDealExecution(coordinatorInput);
    console.log('coordinatorResult:', JSON.stringify(coordinatorResult, null, 2));

    if (!coordinatorResult.ok) {
      // When the deal CAS fails (out-of-sync or conflict), the Stellar operation may already
      // be confirmed from a previous attempt. Re-read the operation and treat confirmed as success.
      const isIdempotentConflict =
        coordinatorResult.reason === 'ERR_OUT_OF_SYNC' ||
        coordinatorResult.reason === 'ERR_DEAL_PERSISTENCE_CONFLICT' ||
        coordinatorResult.reason === 'ERR_DEAL_PERSISTENCE_UNAVAILABLE' ||
        coordinatorResult.reason === 'ERR_EXECUTION_PERSISTENCE_FAILURE';

      if (isIdempotentConflict) {
        persistedOperation = await repository.getStellarOperation(operationKey);
        if (
          persistedOperation !== null &&
          persistedOperation.operation_status === 'confirmed' &&
          persistedOperation.transaction_hash !== null
        ) {
          // Operation was already confirmed by a concurrent attempt — treat as success
          break;
        }
      }

      return {
        ok: false,
        failure: mapCoordinatorFailure(coordinatorResult, input.action_label),
      };
    }

    persistedOperation = await repository.getStellarOperation(operationKey);
    if (
      persistedOperation !== null &&
      persistedOperation.operation_status === "confirmed" &&
      persistedOperation.transaction_hash !== null
    ) {
      break;
    }

    if (
      !isReconciliationPending(persistedOperation) ||
      attempt === ROUTE_RECONCILIATION_ATTEMPTS - 1
    ) {
      break;
    }

    currentDeal =
      (await repository.getDeal(input.deal.id)) ?? coordinatorResult.next_deal;
    currentOperation = persistedOperation;
    await waitForReconciliationWindow();
  }

  console.log('persistedOperation (after loop):', JSON.stringify(persistedOperation, null, 2));

  if (
    persistedOperation === null ||
    persistedOperation.operation_status !== "confirmed" ||
    persistedOperation.transaction_hash === null
  ) {
    return {
      ok: false,
      failure: {
        status: 502,
        code: "STELLAR_EXECUTION_UNCONFIRMED",
        message: `The Stellar Testnet ${input.action_label} reached submission, but the public confirmation was not finalized yet.`,
      },
    };
  }

  const updatedDeal =
    (await repository.getDeal(input.deal.id)) ??
    (coordinatorResult?.ok ? coordinatorResult.next_deal : input.deal);

  return {
    ok: true,
    deal: updatedDeal,
    operation: persistedOperation,
  };
}
