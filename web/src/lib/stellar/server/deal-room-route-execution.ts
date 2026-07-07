import type { DbDeal } from "@/lib/db/types";
import { repository } from "@/lib/repositories";
import { coordinateDealExecution } from "./deal-execution-coordinator";
import { createStellarIdempotencyKey } from "../helpers";
import {
  RepositoryDealPersistence,
  RepositoryStellarOperationPersistence,
} from "./repository-execution-persistence";
import type { DealRoomTestnetRuntime } from "./deal-room-testnet-runtime";
import type { StellarOperation } from "../types";

export type DealRoomRouteExecutionAction =
  | "expire"
  | "refund"
  | "submit_proof"
  | "mark_delivered"
  | "accept_delivery";

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
const ROUTE_RECONCILIATION_ATTEMPTS = 5;
const ROUTE_RECONCILIATION_DELAY_MS = 1500;

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
        return { status: 502, code: 'STELLAR_EXECUTION_FAILED', message: `The Stellar Testnet ${actionLabel} could not be completed because the escrow room bootstrap failed.`, diagnostic };
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
      return {
        status: 503,
        code: "STELLAR_PERSISTENCE_UNAVAILABLE",
        message:
          "Testnet execution state could not be persisted for this room action.",
        diagnostic,
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
  const operationKey = createStellarIdempotencyKey(
    input.deal.id,
    input.deal.status,
    input.action,
  );

  let currentDeal = input.deal;
  let currentOperation = await repository.getStellarOperation(operationKey);
  let coordinatorResult: Awaited<
    ReturnType<typeof coordinateDealExecution>
  > | null = null;
  let persistedOperation: StellarOperation | null = null;

  for (
    let attempt = 0;
    attempt < ROUTE_RECONCILIATION_ATTEMPTS;
    attempt += 1
  ) {
    const timestamp = currentTimestamp();
    const coordinatorInput: Parameters<typeof coordinateDealExecution>[0] =
      input.action === "submit_proof"
        ? {
            action: "submit_proof",
            operation_id: operationKey,
            deal: currentDeal,
            metadata: input.runtime.metadata,
            proof_hash: input.proof_hash ?? "",
            existing_operation: currentOperation,
            stellar_contract_id: input.runtime.contract_id,
            operation_timestamps: {
              created_at: timestamp,
              updated_at: timestamp,
            },
            local_commit_timestamp: timestamp,
            operation_persistence: new RepositoryStellarOperationPersistence(
              repository,
            ),
            deal_persistence: new RepositoryDealPersistence(repository),
            execution_adapter: input.runtime.execution_adapter,
          }
        : {
            action: input.action,
            operation_id: operationKey,
            deal: currentDeal,
            metadata: input.runtime.metadata,
            existing_operation: currentOperation,
            stellar_contract_id: input.runtime.contract_id,
            operation_timestamps: {
              created_at: timestamp,
              updated_at: timestamp,
            },
            local_commit_timestamp: timestamp,
            operation_persistence: new RepositoryStellarOperationPersistence(
              repository,
            ),
            deal_persistence: new RepositoryDealPersistence(repository),
            execution_adapter: input.runtime.execution_adapter,
          };

    coordinatorResult = await coordinateDealExecution(coordinatorInput);

    if (!coordinatorResult.ok) {
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
    (await repository.getDeal(input.deal.id)) ?? coordinatorResult!.next_deal;

  return {
    ok: true,
    deal: updatedDeal,
    operation: persistedOperation,
  };
}
