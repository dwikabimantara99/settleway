import type { DealStatus } from "@/lib/escrow/state-machine";
import { canTransitionStellarOperation } from "@/lib/stellar/helpers";
import type { DbDeal } from "@/lib/db/types";
import type { StellarAction, StellarOperation } from "@/lib/stellar/types";
import { resolveStellarActionPlan } from "../action-policy";
import type {
  StellarOperationPersistencePort,
  StellarPersistenceWriteResult,
} from "../execution-service";
import type {
  StellarDealPersistencePort,
  StellarDealPersistenceWriteResult,
} from "../mock-store-deal-persistence";

export interface SmokePersistenceBundle {
  readonly operation_persistence: StellarOperationPersistencePort;
  readonly deal_persistence: StellarDealPersistencePort;
  seedDeal(deal: DbDeal): void;
  seedOperation(operation: StellarOperation): void;
  readDeal(): DbDeal | null;
  readOperation(idempotencyKey: string): StellarOperation | null;
  listOperationsByDeal(dealId: string): readonly StellarOperation[];
  failNextOperationWrite(reason: "conflict" | "unavailable"): void;
  failNextDealWrite(reason: "conflict" | "unavailable"): void;
}

const DEAL_TRANSITION_ACTIONS: readonly StellarAction[] = [
  "buyer_deposit",
  "seller_deposit",
  "submit_proof",
  "mark_delivered",
  "accept_delivery",
  "expire",
  "refund",
];

function cloneDeal(deal: DbDeal): DbDeal {
  return structuredClone(deal);
}

function cloneOperation(operation: StellarOperation): StellarOperation {
  return structuredClone(operation);
}

function sameJsonValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function sameOperation(left: StellarOperation, right: StellarOperation): boolean {
  return (
    left.idempotency_key === right.idempotency_key &&
    left.deal_id === right.deal_id &&
    left.requested_action === right.requested_action &&
    left.expected_local_status === right.expected_local_status &&
    left.target_local_status === right.target_local_status &&
    left.stellar_method === right.stellar_method &&
    left.operation_status === right.operation_status &&
    left.transaction_hash === right.transaction_hash &&
    left.result_escrow_id === right.result_escrow_id &&
    left.public_error_code === right.public_error_code &&
    left.submitted_at === right.submitted_at &&
    left.confirmed_at === right.confirmed_at &&
    left.created_at === right.created_at &&
    left.updated_at === right.updated_at
  );
}

function operationIntentMatches(
  current: StellarOperation,
  next: StellarOperation,
): boolean {
  return (
    current.idempotency_key === next.idempotency_key &&
    current.deal_id === next.deal_id &&
    current.requested_action === next.requested_action &&
    current.expected_local_status === next.expected_local_status &&
    current.target_local_status === next.target_local_status &&
    current.stellar_method === next.stellar_method
  );
}

function canReplaceOperation(
  current: StellarOperation,
  next: StellarOperation,
): boolean {
  if (!operationIntentMatches(current, next)) {
    return false;
  }
  if (
    current.operation_status === "unknown" &&
    next.operation_status === "unknown"
  ) {
    return true;
  }
  return canTransitionStellarOperation(
    current.operation_status,
    next.operation_status,
  );
}

function sameDeal(left: DbDeal, right: DbDeal): boolean {
  return (
    left.id === right.id &&
    left.listing_id === right.listing_id &&
    left.buyer_request_id === right.buyer_request_id &&
    left.buyer_id === right.buyer_id &&
    left.seller_id === right.seller_id &&
    left.commodity === right.commodity &&
    left.volume_kg === right.volume_kg &&
    left.principal_idr === right.principal_idr &&
    left.buyer_bond_idr === right.buyer_bond_idr &&
    left.seller_bond_idr === right.seller_bond_idr &&
    left.buyer_fee_idr === right.buyer_fee_idr &&
    left.seller_fee_idr === right.seller_fee_idr &&
    left.buyer_total_idr === right.buyer_total_idr &&
    left.seller_total_idr === right.seller_total_idr &&
    left.status === right.status &&
    left.stellar_mode === right.stellar_mode &&
    left.stellar_contract_id === right.stellar_contract_id &&
    left.stellar_escrow_id === right.stellar_escrow_id &&
    left.latest_stellar_tx_hash === right.latest_stellar_tx_hash &&
    left.stellar_sync_status === right.stellar_sync_status &&
    left.proof_hash === right.proof_hash &&
    sameJsonValue(left.terms, right.terms) &&
    left.created_at === right.created_at &&
    left.updated_at === right.updated_at
  );
}

function preservesDealIdentity(current: DbDeal, next: DbDeal): boolean {
  return (
    current.id === next.id &&
    current.listing_id === next.listing_id &&
    current.buyer_request_id === next.buyer_request_id &&
    current.buyer_id === next.buyer_id &&
    current.seller_id === next.seller_id &&
    current.commodity === next.commodity &&
    current.volume_kg === next.volume_kg &&
    current.principal_idr === next.principal_idr &&
    current.buyer_bond_idr === next.buyer_bond_idr &&
    current.seller_bond_idr === next.seller_bond_idr &&
    current.buyer_fee_idr === next.buyer_fee_idr &&
    current.seller_fee_idr === next.seller_fee_idr &&
    current.buyer_total_idr === next.buyer_total_idr &&
    current.seller_total_idr === next.seller_total_idr &&
    current.stellar_mode === next.stellar_mode &&
    current.proof_hash === next.proof_hash &&
    sameJsonValue(current.terms, next.terms) &&
    current.created_at === next.created_at
  );
}

function statusCanAdvance(current: DealStatus, next: DealStatus): boolean {
  if (current === next) {
    return true;
  }
  for (const action of DEAL_TRANSITION_ACTIONS) {
    const planResult = resolveStellarActionPlan(action, current);
    if (planResult.ok && planResult.plan.target_local_status === next) {
      return true;
    }
  }
  return false;
}

class SmokeOperationPersistence implements StellarOperationPersistencePort {
  private readonly operations = new Map<string, StellarOperation>();
  private nextFailure: "conflict" | "unavailable" | null = null;

  constructor(initialOperations: readonly StellarOperation[]) {
    for (const operation of initialOperations) {
      this.operations.set(operation.idempotency_key, cloneOperation(operation));
    }
  }

  failNextWrite(reason: "conflict" | "unavailable"): void {
    this.nextFailure = reason;
  }

  seed(operation: StellarOperation): void {
    this.operations.set(operation.idempotency_key, cloneOperation(operation));
  }

  read(idempotencyKey: string): StellarOperation | null {
    const operation = this.operations.get(idempotencyKey);
    return operation === undefined ? null : cloneOperation(operation);
  }

  listByDeal(dealId: string): readonly StellarOperation[] {
    return [...this.operations.values()]
      .filter((operation) => operation.deal_id === dealId)
      .map((operation) => cloneOperation(operation));
  }

  async createPending(operation: StellarOperation): Promise<StellarPersistenceWriteResult> {
    if (this.nextFailure !== null) {
      const reason = this.nextFailure;
      this.nextFailure = null;
      return { ok: false, reason };
    }

    if (
      operation.operation_status !== "pending" ||
      this.operations.has(operation.idempotency_key)
    ) {
      return { ok: false, reason: "conflict" };
    }

    this.operations.set(operation.idempotency_key, cloneOperation(operation));
    return { ok: true };
  }

  async replaceIfCurrent(input: {
    current: StellarOperation;
    next: StellarOperation;
  }): Promise<StellarPersistenceWriteResult> {
    if (this.nextFailure !== null) {
      const reason = this.nextFailure;
      this.nextFailure = null;
      return { ok: false, reason };
    }

    const stored = this.operations.get(input.current.idempotency_key);
    if (stored === undefined || !sameOperation(stored, input.current)) {
      return { ok: false, reason: "conflict" };
    }

    if (!canReplaceOperation(input.current, input.next)) {
      return { ok: false, reason: "conflict" };
    }

    this.operations.set(input.next.idempotency_key, cloneOperation(input.next));
    return { ok: true };
  }
}

class SmokeDealPersistence implements StellarDealPersistencePort {
  private deal: DbDeal | null;
  private nextFailure: "conflict" | "unavailable" | null = null;

  constructor(initialDeal: DbDeal | null) {
    this.deal = initialDeal === null ? null : cloneDeal(initialDeal);
  }

  failNextWrite(reason: "conflict" | "unavailable"): void {
    this.nextFailure = reason;
  }

  seed(deal: DbDeal): void {
    this.deal = cloneDeal(deal);
  }

  read(): DbDeal | null {
    return this.deal === null ? null : cloneDeal(this.deal);
  }

  async replaceIfCurrent(input: {
    current: DbDeal;
    next: DbDeal;
  }): Promise<StellarDealPersistenceWriteResult> {
    if (this.nextFailure !== null) {
      const reason = this.nextFailure;
      this.nextFailure = null;
      return { ok: false, reason };
    }

    if (this.deal === null || !sameDeal(this.deal, input.current)) {
      return { ok: false, reason: "conflict" };
    }

    if (
      !preservesDealIdentity(input.current, input.next) ||
      !statusCanAdvance(input.current.status, input.next.status)
    ) {
      return { ok: false, reason: "conflict" };
    }

    this.deal = cloneDeal(input.next);
    return { ok: true };
  }
}

export function createSmokePersistenceBundle(input: {
  readonly initial_deal?: DbDeal;
  readonly initial_operations?: readonly StellarOperation[];
} = {}): SmokePersistenceBundle {
  const operationPersistence = new SmokeOperationPersistence(
    input.initial_operations ?? [],
  );
  const dealPersistence = new SmokeDealPersistence(input.initial_deal ?? null);

  return {
    operation_persistence: operationPersistence,
    deal_persistence: dealPersistence,
    seedDeal: (deal) => dealPersistence.seed(deal),
    seedOperation: (operation) => operationPersistence.seed(operation),
    readDeal: () => dealPersistence.read(),
    readOperation: (idempotencyKey) => operationPersistence.read(idempotencyKey),
    listOperationsByDeal: (dealId) => operationPersistence.listByDeal(dealId),
    failNextOperationWrite: (reason) => operationPersistence.failNextWrite(reason),
    failNextDealWrite: (reason) => dealPersistence.failNextWrite(reason),
  };
}
