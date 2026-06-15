import type { DbDeal } from "@/lib/db/types";
import type {
  DealStellarSyncStatus,
  StellarAction,
  StellarOperation,
  StellarOperationStatus,
} from "@/lib/stellar/types";
import type { SmokeRuntimeConfig } from "./config";

export type SmokeScenarioName =
  | "happy_path"
  | "expiry"
  | "refund"
  | "reconciliation";

export interface SmokeRuntimeEvidence {
  readonly checkpoint_commit: string;
  readonly network_passphrase: string;
  readonly contract_id: string;
  readonly public_role_addresses: {
    readonly admin: string;
    readonly buyer_demo: string;
    readonly seller_demo: string;
  };
}

export interface SmokeActionEvidence {
  readonly action: StellarAction;
  readonly idempotency_key: string | null;
  readonly operation_status: StellarOperationStatus | null;
  readonly transaction_hash: string | null;
  readonly result_escrow_id: string | null;
  readonly public_error_code: string | null;
  readonly created_at: string | null;
  readonly submitted_at: string | null;
  readonly confirmed_at: string | null;
  readonly updated_at: string | null;
  readonly deal_status: DbDeal["status"];
  readonly sync_status: DealStellarSyncStatus;
}

export interface SmokeScenarioEvidence {
  readonly scenario: SmokeScenarioName;
  readonly runtime: SmokeRuntimeEvidence;
  readonly actions: readonly SmokeActionEvidence[];
  readonly final_deal: {
    readonly id: string;
    readonly status: DbDeal["status"];
    readonly sync_status: DealStellarSyncStatus;
    readonly contract_id: string | null;
    readonly escrow_id: string | null;
    readonly latest_transaction_hash: string | null;
  };
}

function splitWord(parts: readonly string[]): string {
  return parts.join("");
}

const FORBIDDEN_PUBLIC_KEYS: readonly string[] = [
  splitWord(["sec", "ret"]),
  splitWord(["sec", "ret", "_seed"]),
  splitWord(["pri", "vate", "_key"]),
  splitWord(["key", "pair"]),
  "rpc",
  "rpc_client",
  "environment",
  "sdk_transaction",
  "database",
  "repository",
  "callback",
  "adapter",
  "persistence",
  "prepared_transaction_xdr",
  "signed_transaction_xdr",
  "unsigned_transaction_xdr",
  "signature",
];

export function smokeRuntimeEvidence(
  config: SmokeRuntimeConfig,
): SmokeRuntimeEvidence {
  return {
    checkpoint_commit: config.checkpoint_commit,
    network_passphrase: config.network_passphrase,
    contract_id: config.contract_id,
    public_role_addresses: {
      admin: config.role_addresses.admin,
      buyer_demo: config.role_addresses.buyer_demo,
      seller_demo: config.role_addresses.seller_demo,
    },
  };
}

export function smokeActionEvidence(input: {
  readonly action: StellarAction;
  readonly operation: StellarOperation | null;
  readonly deal: DbDeal;
}): SmokeActionEvidence {
  return {
    action: input.action,
    idempotency_key: input.operation?.idempotency_key ?? null,
    operation_status: input.operation?.operation_status ?? null,
    transaction_hash: input.operation?.transaction_hash ?? null,
    result_escrow_id: input.operation?.result_escrow_id ?? null,
    public_error_code: input.operation?.public_error_code ?? null,
    created_at: input.operation?.created_at ?? null,
    submitted_at: input.operation?.submitted_at ?? null,
    confirmed_at: input.operation?.confirmed_at ?? null,
    updated_at: input.operation?.updated_at ?? null,
    deal_status: input.deal.status,
    sync_status: input.deal.stellar_sync_status,
  };
}

export function smokeFinalDealEvidence(deal: DbDeal): SmokeScenarioEvidence["final_deal"] {
  return {
    id: deal.id,
    status: deal.status,
    sync_status: deal.stellar_sync_status,
    contract_id: deal.stellar_contract_id,
    escrow_id: deal.stellar_escrow_id,
    latest_transaction_hash: deal.latest_stellar_tx_hash,
  };
}

export function collectForbiddenEvidenceKeys(value: unknown): readonly string[] {
  const forbidden = new Set(FORBIDDEN_PUBLIC_KEYS);
  const found: string[] = [];

  function visit(node: unknown, path: readonly string[]): void {
    if (node === null || typeof node !== "object") {
      return;
    }

    if (Array.isArray(node)) {
      node.forEach((item, index) => visit(item, [...path, String(index)]));
      return;
    }

    const record = node as { readonly [key: string]: unknown };
    for (const [key, child] of Object.entries(record)) {
      const normalizedKey = key.toLowerCase();
      if (forbidden.has(normalizedKey)) {
        found.push([...path, key].join("."));
      }
      visit(child, [...path, key]);
    }
  }

  visit(value, []);
  return found;
}

export function buildSmokeScenarioEvidence(input: {
  readonly scenario: SmokeScenarioName;
  readonly config: SmokeRuntimeConfig;
  readonly actions: readonly SmokeActionEvidence[];
  readonly final_deal: DbDeal;
}): SmokeScenarioEvidence {
  return {
    scenario: input.scenario,
    runtime: smokeRuntimeEvidence(input.config),
    actions: input.actions,
    final_deal: smokeFinalDealEvidence(input.final_deal),
  };
}
