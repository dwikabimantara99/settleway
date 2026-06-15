import {
  FeeBumpTransaction,
  Keypair,
  Transaction,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import type { StellarAction } from "@/lib/stellar/types";
import { StellarSdkRpc } from "../stellar-sdk-rpc";
import type {
  ConfirmTransactionResult,
  RpcSourceAccountResult,
  SimulatedTransactionResult,
  StellarRpcPort,
  SubmitTransactionResult,
} from "../stellar-rpc-port";
import type { StellarTimeSource } from "../stellar-signer-port";
import { validateSmokeRuntimeConfig } from "./config";
import type { SmokeRuntimeConfig } from "./config";
import { collectForbiddenEvidenceKeys } from "./evidence";
import {
  reconcileSmokeTransactionHash,
  runExpirySmokeScenario,
  runHappyPathSmokeScenario,
  runRefundSmokeScenario,
} from "./orchestrator";
import {
  createSmokePersistenceBundle,
} from "./persistence";
import {
  createSmokeRuntime,
} from "./runtime";
import type {
  SmokeReconciliationResult,
  SmokeScenarioResult,
  SmokeTransactionHashReconciliationInput,
} from "./orchestrator";
import type {
  SmokeRoleSignerInput,
  SmokeRoleTransactionSigner,
} from "./signer";

export const TESTNET_SMOKE_MUTATION_ACKNOWLEDGEMENT =
  "I_ACKNOWLEDGE_SYNTHETIC_STELLAR_TESTNET_MUTATION";

export const TESTNET_SMOKE_ENV = {
  command: "SETTLEWAY_SMOKE_COMMAND",
  acknowledgement: "SETTLEWAY_SMOKE_ACKNOWLEDGEMENT",
  checkpoint_commit: "SETTLEWAY_SMOKE_CHECKPOINT_COMMIT",
  rpc_url: "SETTLEWAY_SMOKE_RPC_URL",
  network_passphrase: "SETTLEWAY_SMOKE_NETWORK_PASSPHRASE",
  contract_id: "SETTLEWAY_SMOKE_CONTRACT_ID",
  admin_address: "SETTLEWAY_SMOKE_ADMIN_ADDRESS",
  buyer_demo_address: "SETTLEWAY_SMOKE_BUYER_DEMO_ADDRESS",
  seller_demo_address: "SETTLEWAY_SMOKE_SELLER_DEMO_ADDRESS",
  admin_secret_seed: "SETTLEWAY_SMOKE_ADMIN_SECRET_SEED",
  buyer_demo_secret_seed: "SETTLEWAY_SMOKE_BUYER_DEMO_SECRET_SEED",
  seller_demo_secret_seed: "SETTLEWAY_SMOKE_SELLER_DEMO_SECRET_SEED",
  base_fee_stroops: "SETTLEWAY_SMOKE_BASE_FEE_STROOPS",
  max_fee_stroops: "SETTLEWAY_SMOKE_MAX_FEE_STROOPS",
  timeout_seconds: "SETTLEWAY_SMOKE_TIMEOUT_SECONDS",
  confirmation_attempts: "SETTLEWAY_SMOKE_CONFIRMATION_ATTEMPTS",
  now_unix_seconds: "SETTLEWAY_SMOKE_NOW_UNIX_SECONDS",
  deal_id: "SETTLEWAY_SMOKE_DEAL_ID",
  buyer_id: "SETTLEWAY_SMOKE_BUYER_ID",
  seller_id: "SETTLEWAY_SMOKE_SELLER_ID",
  commodity: "SETTLEWAY_SMOKE_COMMODITY",
  volume_kg: "SETTLEWAY_SMOKE_VOLUME_KG",
  deal_hash: "SETTLEWAY_SMOKE_DEAL_HASH",
  proof_hash: "SETTLEWAY_SMOKE_PROOF_HASH",
  expires_at: "SETTLEWAY_SMOKE_EXPIRES_AT",
  principal_idr: "SETTLEWAY_SMOKE_PRINCIPAL_IDR",
  buyer_bond_idr: "SETTLEWAY_SMOKE_BUYER_BOND_IDR",
  seller_bond_idr: "SETTLEWAY_SMOKE_SELLER_BOND_IDR",
  buyer_fee_idr: "SETTLEWAY_SMOKE_BUYER_FEE_IDR",
  seller_fee_idr: "SETTLEWAY_SMOKE_SELLER_FEE_IDR",
  reconcile_action: "SETTLEWAY_SMOKE_RECONCILE_ACTION",
  reconcile_transaction_hash: "SETTLEWAY_SMOKE_RECONCILE_TRANSACTION_HASH",
} as const;

export const TESTNET_SMOKE_ENVIRONMENT_VARIABLES = Object.values(TESTNET_SMOKE_ENV);

export type OperatorEnvironmentReader = (name: string) => string | undefined;

export type TestnetSmokeCommand =
  | "preflight"
  | "happy_path"
  | "expiry"
  | "refund"
  | "reconcile";

export const TESTNET_SMOKE_COMMANDS: readonly TestnetSmokeCommand[] = [
  "preflight",
  "happy_path",
  "expiry",
  "refund",
  "reconcile",
];

const RECONCILE_ACTIONS: readonly StellarAction[] = [
  "create_deal",
  "buyer_deposit",
  "seller_deposit",
  "submit_proof",
  "mark_delivered",
  "accept_delivery",
  "expire",
  "refund",
];

const HASH_64 = /^[0-9a-fA-F]{64}$/;

export type OperatorInputErrorCode =
  | "ERR_FORBIDDEN_OPERATOR_INTENT"
  | "ERR_INVALID_ACKNOWLEDGEMENT"
  | "ERR_INVALID_COMMAND"
  | "ERR_INVALID_NUMBER"
  | "ERR_INVALID_RECONCILIATION_ACTION"
  | "ERR_INVALID_RECONCILIATION_HASH"
  | "ERR_INVALID_RUNTIME_CONFIG"
  | "ERR_INVALID_SIGNER_SEED"
  | "ERR_MISSING_ACKNOWLEDGEMENT"
  | "ERR_MISSING_FIELD"
  | "ERR_ROLE_IDENTITY_MISMATCH"
  | "ERR_DUPLICATE_ROLE_IDENTITY";

export interface OperatorInputError {
  readonly code: OperatorInputErrorCode;
  readonly field: string;
  readonly public_detail?: string;
}

export type OperatorInputResult =
  | { readonly ok: true; readonly input: TestnetSmokeOperatorInput }
  | { readonly ok: false; readonly errors: readonly OperatorInputError[] };

export interface TestnetSmokeOperatorInput {
  readonly command: TestnetSmokeCommand;
  readonly config: SmokeRuntimeConfig;
  readonly role_signers: SmokeRoleSignerInput;
  readonly signer_call_counts: OperatorSignerCallCounts;
  readonly time_source: StellarTimeSource;
  readonly reconciliation: SmokeTransactionHashReconciliationInput | null;
}

export interface OperatorSignerCallCounts {
  readonly admin: number;
  readonly buyer_demo: number;
  readonly seller_demo: number;
  readonly total: number;
}

interface MutableSignerCallCounts {
  admin: number;
  buyer_demo: number;
  seller_demo: number;
  total: number;
}

export interface OperatorRpcCallCounts {
  readonly network_checks: number;
  readonly source_account_loads: number;
  readonly simulations: number;
  readonly submissions: number;
  readonly confirmations: number;
}

interface MutableRpcCallCounts {
  network_checks: number;
  source_account_loads: number;
  simulations: number;
  submissions: number;
  confirmations: number;
}

export type OperatorRunResult =
  | {
      readonly ok: true;
      readonly command: TestnetSmokeCommand;
      readonly summary: OperatorSafeSummary;
    }
  | {
      readonly ok: false;
      readonly command: TestnetSmokeCommand | null;
      readonly errors: readonly OperatorInputError[];
      readonly summary: OperatorSafeSummary | null;
    };

export interface OperatorSafeSummary {
  readonly checkpoint_commit: string;
  readonly command: TestnetSmokeCommand;
  readonly contract_id: string;
  readonly network_passphrase: string;
  readonly public_role_addresses: {
    readonly admin: string;
    readonly buyer_demo: string;
    readonly seller_demo: string;
  };
  readonly transport_call_counts: OperatorRpcCallCounts;
  readonly signer_call_counts: OperatorSignerCallCounts;
  readonly scenario:
    | { readonly kind: "preflight"; readonly runtime_constructed: boolean }
    | { readonly kind: "happy_path"; readonly result: SafeScenarioResult }
    | { readonly kind: "expiry"; readonly result: SafeScenarioResult }
    | { readonly kind: "refund"; readonly result: SafeScenarioResult }
    | { readonly kind: "reconcile"; readonly result: SafeReconciliationResult };
}

type SafeScenarioResult =
  | Pick<Extract<SmokeScenarioResult, { readonly ok: true }>, "ok" | "evidence">
  | Pick<
      Extract<SmokeScenarioResult, { readonly ok: false }>,
      "ok" | "error_code" | "failed_action" | "evidence"
    >;

type SafeReconciliationResult =
  | Pick<
      Extract<SmokeReconciliationResult, { readonly ok: true }>,
      "ok" | "evidence" | "confirmation" | "local_state_applied"
    >
  | Pick<
      Extract<SmokeReconciliationResult, { readonly ok: false }>,
      "ok" | "error_code" | "evidence" | "confirmation"
    >;

export type OperatorOutputSafetyResult =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly forbidden_keys: readonly string[];
      readonly forbidden_values: readonly string[];
    };

function containsForbiddenIntentText(value: string): boolean {
  const normalized = value.toLowerCase();
  return normalized.includes("mainnet") || normalized.includes("production");
}

function pushError(
  errors: OperatorInputError[],
  code: OperatorInputErrorCode,
  field: string,
  publicDetail?: string,
): void {
  errors.push(
    publicDetail === undefined
      ? { code, field }
      : { code, field, public_detail: publicDetail },
  );
}

function readOptionalTrimmed(
  reader: OperatorEnvironmentReader,
  name: string,
): string | null {
  const value = reader(name);
  if (value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function readRequiredString(input: {
  readonly reader: OperatorEnvironmentReader;
  readonly envName: string;
  readonly field: string;
  readonly values: Map<string, string>;
  readonly errors: OperatorInputError[];
}): void {
  const value = readOptionalTrimmed(input.reader, input.envName);
  if (value === null) {
    pushError(input.errors, "ERR_MISSING_FIELD", input.field);
    return;
  }
  input.values.set(input.field, value);
}

function readRequiredNumber(input: {
  readonly reader: OperatorEnvironmentReader;
  readonly envName: string;
  readonly field: string;
  readonly values: Map<string, number>;
  readonly errors: OperatorInputError[];
}): void {
  const value = readOptionalTrimmed(input.reader, input.envName);
  if (value === null) {
    pushError(input.errors, "ERR_MISSING_FIELD", input.field);
    return;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    pushError(input.errors, "ERR_INVALID_NUMBER", input.field);
    return;
  }
  input.values.set(input.field, numeric);
}

function requiredString(values: ReadonlyMap<string, string>, field: string): string {
  const value = values.get(field);
  if (value === undefined) {
    throw new Error(`Missing validated operator field: ${field}`);
  }
  return value;
}

function requiredNumber(values: ReadonlyMap<string, number>, field: string): number {
  const value = values.get(field);
  if (value === undefined) {
    throw new Error(`Missing validated operator field: ${field}`);
  }
  return value;
}

function parseCommand(
  reader: OperatorEnvironmentReader,
  errors: OperatorInputError[],
): TestnetSmokeCommand {
  const value = readOptionalTrimmed(reader, TESTNET_SMOKE_ENV.command);
  if (value === null) {
    return "preflight";
  }
  if (containsForbiddenIntentText(value)) {
    pushError(errors, "ERR_FORBIDDEN_OPERATOR_INTENT", "command");
    return "preflight";
  }
  if (TESTNET_SMOKE_COMMANDS.includes(value as TestnetSmokeCommand)) {
    return value as TestnetSmokeCommand;
  }
  pushError(errors, "ERR_INVALID_COMMAND", "command");
  return "preflight";
}

function parseAcknowledgement(input: {
  readonly reader: OperatorEnvironmentReader;
  readonly command: TestnetSmokeCommand;
  readonly errors: OperatorInputError[];
}): void {
  if (input.command === "preflight") {
    return;
  }
  const value = readOptionalTrimmed(
    input.reader,
    TESTNET_SMOKE_ENV.acknowledgement,
  );
  if (value === null) {
    pushError(input.errors, "ERR_MISSING_ACKNOWLEDGEMENT", "acknowledgement");
    return;
  }
  if (containsForbiddenIntentText(value)) {
    pushError(input.errors, "ERR_FORBIDDEN_OPERATOR_INTENT", "acknowledgement");
    return;
  }
  if (value !== TESTNET_SMOKE_MUTATION_ACKNOWLEDGEMENT) {
    pushError(input.errors, "ERR_INVALID_ACKNOWLEDGEMENT", "acknowledgement");
  }
}

function parseReconciliation(input: {
  readonly reader: OperatorEnvironmentReader;
  readonly command: TestnetSmokeCommand;
  readonly errors: OperatorInputError[];
}): SmokeTransactionHashReconciliationInput | null {
  if (input.command !== "reconcile") {
    return null;
  }

  const actionValue = readOptionalTrimmed(
    input.reader,
    TESTNET_SMOKE_ENV.reconcile_action,
  );
  if (actionValue === null) {
    pushError(input.errors, "ERR_MISSING_FIELD", "reconciliation.action");
    return null;
  }
  if (!RECONCILE_ACTIONS.includes(actionValue as StellarAction)) {
    pushError(input.errors, "ERR_INVALID_RECONCILIATION_ACTION", "reconciliation.action");
    return null;
  }

  const transactionHash = readOptionalTrimmed(
    input.reader,
    TESTNET_SMOKE_ENV.reconcile_transaction_hash,
  );
  if (transactionHash === null) {
    pushError(input.errors, "ERR_MISSING_FIELD", "reconciliation.transaction_hash");
    return null;
  }
  if (!HASH_64.test(transactionHash)) {
    pushError(input.errors, "ERR_INVALID_RECONCILIATION_HASH", "reconciliation.transaction_hash");
    return null;
  }

  return {
    action: actionValue as StellarAction,
    transaction_hash: transactionHash,
  };
}

function parseSigner(input: {
  readonly reader: OperatorEnvironmentReader;
  readonly envName: string;
  readonly field: "role_signers.admin" | "role_signers.buyer_demo" | "role_signers.seller_demo";
  readonly expectedAddress: string | null;
  readonly stats: MutableSignerCallCounts;
  readonly errors: OperatorInputError[];
}): SmokeRoleTransactionSigner | null {
  const seed = readOptionalTrimmed(input.reader, input.envName);
  if (seed === null) {
    pushError(input.errors, "ERR_MISSING_FIELD", input.field);
    return null;
  }

  let keypair: Keypair;
  try {
    keypair = Keypair.fromSecret(seed);
  } catch {
    pushError(input.errors, "ERR_INVALID_SIGNER_SEED", input.field);
    return null;
  }

  const publicKey = keypair.publicKey();
  if (input.expectedAddress !== null && publicKey !== input.expectedAddress) {
    pushError(input.errors, "ERR_ROLE_IDENTITY_MISMATCH", input.field);
    return null;
  }

  return new OperatorRoleSigner(publicKey, keypair, input.field, input.stats);
}

class OperatorRoleSigner implements SmokeRoleTransactionSigner {
  readonly public_key: string;
  readonly #keypair: Keypair;
  readonly #field: "role_signers.admin" | "role_signers.buyer_demo" | "role_signers.seller_demo";
  readonly #stats: MutableSignerCallCounts;

  constructor(
    publicKey: string,
    keypair: Keypair,
    field: "role_signers.admin" | "role_signers.buyer_demo" | "role_signers.seller_demo",
    stats: MutableSignerCallCounts,
  ) {
    this.public_key = publicKey;
    this.#keypair = keypair;
    this.#field = field;
    this.#stats = stats;
  }

  signTransaction(transaction: Transaction, networkPassphrase: string): string {
    this.#stats.total += 1;
    if (this.#field === "role_signers.admin") {
      this.#stats.admin += 1;
    }
    if (this.#field === "role_signers.buyer_demo") {
      this.#stats.buyer_demo += 1;
    }
    if (this.#field === "role_signers.seller_demo") {
      this.#stats.seller_demo += 1;
    }

    const parsed = TransactionBuilder.fromXDR(
      transaction.toXDR(),
      networkPassphrase,
    );
    if (parsed instanceof FeeBumpTransaction) {
      throw new Error("Unsupported fee-bump transaction");
    }
    parsed.sign(this.#keypair);
    return parsed.toXDR();
  }
}

function snapshotSignerCounts(
  counts: OperatorSignerCallCounts,
): OperatorSignerCallCounts {
  return {
    admin: counts.admin,
    buyer_demo: counts.buyer_demo,
    seller_demo: counts.seller_demo,
    total: counts.total,
  };
}

function snapshotRpcCounts(counts: MutableRpcCallCounts): OperatorRpcCallCounts {
  return {
    network_checks: counts.network_checks,
    source_account_loads: counts.source_account_loads,
    simulations: counts.simulations,
    submissions: counts.submissions,
    confirmations: counts.confirmations,
  };
}

export function loadTestnetSmokeOperatorInput(
  reader: OperatorEnvironmentReader,
): OperatorInputResult {
  const errors: OperatorInputError[] = [];
  const stringValues = new Map<string, string>();
  const numberValues = new Map<string, number>();
  const command = parseCommand(reader, errors);

  parseAcknowledgement({ reader, command, errors });

  const stringSpecs: ReadonlyArray<{
    readonly envName: string;
    readonly field: string;
  }> = [
    { envName: TESTNET_SMOKE_ENV.checkpoint_commit, field: "checkpoint_commit" },
    { envName: TESTNET_SMOKE_ENV.rpc_url, field: "rpc_url" },
    { envName: TESTNET_SMOKE_ENV.network_passphrase, field: "network_passphrase" },
    { envName: TESTNET_SMOKE_ENV.contract_id, field: "contract_id" },
    { envName: TESTNET_SMOKE_ENV.admin_address, field: "role_addresses.admin" },
    { envName: TESTNET_SMOKE_ENV.buyer_demo_address, field: "role_addresses.buyer_demo" },
    { envName: TESTNET_SMOKE_ENV.seller_demo_address, field: "role_addresses.seller_demo" },
    { envName: TESTNET_SMOKE_ENV.deal_id, field: "fixtures.deal_id" },
    { envName: TESTNET_SMOKE_ENV.buyer_id, field: "fixtures.buyer_id" },
    { envName: TESTNET_SMOKE_ENV.seller_id, field: "fixtures.seller_id" },
    { envName: TESTNET_SMOKE_ENV.commodity, field: "fixtures.commodity" },
    { envName: TESTNET_SMOKE_ENV.deal_hash, field: "fixtures.deal_hash" },
    { envName: TESTNET_SMOKE_ENV.proof_hash, field: "fixtures.proof_hash" },
    { envName: TESTNET_SMOKE_ENV.expires_at, field: "fixtures.expires_at" },
  ];

  for (const spec of stringSpecs) {
    readRequiredString({
      reader,
      envName: spec.envName,
      field: spec.field,
      values: stringValues,
      errors,
    });
  }

  const numberSpecs: ReadonlyArray<{
    readonly envName: string;
    readonly field: string;
  }> = [
    { envName: TESTNET_SMOKE_ENV.base_fee_stroops, field: "fees.base_fee_stroops" },
    { envName: TESTNET_SMOKE_ENV.max_fee_stroops, field: "fees.max_fee_stroops" },
    { envName: TESTNET_SMOKE_ENV.timeout_seconds, field: "timebounds.timeout_seconds" },
    { envName: TESTNET_SMOKE_ENV.confirmation_attempts, field: "confirmation.max_attempts" },
    { envName: TESTNET_SMOKE_ENV.now_unix_seconds, field: "time_source.now_unix_seconds" },
    { envName: TESTNET_SMOKE_ENV.volume_kg, field: "fixtures.volume_kg" },
    { envName: TESTNET_SMOKE_ENV.principal_idr, field: "fixtures.amounts.principal_idr" },
    { envName: TESTNET_SMOKE_ENV.buyer_bond_idr, field: "fixtures.amounts.buyer_bond_idr" },
    { envName: TESTNET_SMOKE_ENV.seller_bond_idr, field: "fixtures.amounts.seller_bond_idr" },
    { envName: TESTNET_SMOKE_ENV.buyer_fee_idr, field: "fixtures.amounts.buyer_fee_idr" },
    { envName: TESTNET_SMOKE_ENV.seller_fee_idr, field: "fixtures.amounts.seller_fee_idr" },
  ];

  for (const spec of numberSpecs) {
    readRequiredNumber({
      reader,
      envName: spec.envName,
      field: spec.field,
      values: numberValues,
      errors,
    });
  }

  const reconciliation = parseReconciliation({ reader, command, errors });

  const adminAddress = stringValues.get("role_addresses.admin") ?? null;
  const buyerAddress = stringValues.get("role_addresses.buyer_demo") ?? null;
  const sellerAddress = stringValues.get("role_addresses.seller_demo") ?? null;
  const signerCounts: MutableSignerCallCounts = {
    admin: 0,
    buyer_demo: 0,
    seller_demo: 0,
    total: 0,
  };
  const adminSigner = parseSigner({
    reader,
    envName: TESTNET_SMOKE_ENV.admin_secret_seed,
    field: "role_signers.admin",
    expectedAddress: adminAddress,
    stats: signerCounts,
    errors,
  });
  const buyerSigner = parseSigner({
    reader,
    envName: TESTNET_SMOKE_ENV.buyer_demo_secret_seed,
    field: "role_signers.buyer_demo",
    expectedAddress: buyerAddress,
    stats: signerCounts,
    errors,
  });
  const sellerSigner = parseSigner({
    reader,
    envName: TESTNET_SMOKE_ENV.seller_demo_secret_seed,
    field: "role_signers.seller_demo",
    expectedAddress: sellerAddress,
    stats: signerCounts,
    errors,
  });

  const derivedKeys = [
    adminSigner?.public_key ?? null,
    buyerSigner?.public_key ?? null,
    sellerSigner?.public_key ?? null,
  ].filter((value): value is string => value !== null);
  if (new Set(derivedKeys).size !== derivedKeys.length) {
    pushError(errors, "ERR_DUPLICATE_ROLE_IDENTITY", "role_signers");
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  if (adminSigner === null || buyerSigner === null || sellerSigner === null) {
    return {
      ok: false,
      errors: [{ code: "ERR_MISSING_FIELD", field: "role_signers" }],
    };
  }

  const config: SmokeRuntimeConfig = {
    checkpoint_commit: requiredString(stringValues, "checkpoint_commit"),
    rpc_url: requiredString(stringValues, "rpc_url"),
    network_passphrase: requiredString(stringValues, "network_passphrase"),
    contract_id: requiredString(stringValues, "contract_id"),
    role_addresses: {
      admin: requiredString(stringValues, "role_addresses.admin"),
      buyer_demo: requiredString(stringValues, "role_addresses.buyer_demo"),
      seller_demo: requiredString(stringValues, "role_addresses.seller_demo"),
    },
    fees: {
      base_fee_stroops: requiredNumber(numberValues, "fees.base_fee_stroops"),
      max_fee_stroops: requiredNumber(numberValues, "fees.max_fee_stroops"),
    },
    timebounds: {
      timeout_seconds: requiredNumber(numberValues, "timebounds.timeout_seconds"),
    },
    confirmation: {
      max_attempts: requiredNumber(numberValues, "confirmation.max_attempts"),
    },
    fixtures: {
      deal_id: requiredString(stringValues, "fixtures.deal_id"),
      buyer_id: requiredString(stringValues, "fixtures.buyer_id"),
      seller_id: requiredString(stringValues, "fixtures.seller_id"),
      commodity: requiredString(stringValues, "fixtures.commodity"),
      volume_kg: requiredNumber(numberValues, "fixtures.volume_kg"),
      deal_hash: requiredString(stringValues, "fixtures.deal_hash"),
      proof_hash: requiredString(stringValues, "fixtures.proof_hash"),
      expires_at: requiredString(stringValues, "fixtures.expires_at"),
      amounts: {
        principal_idr: requiredNumber(numberValues, "fixtures.amounts.principal_idr"),
        buyer_bond_idr: requiredNumber(numberValues, "fixtures.amounts.buyer_bond_idr"),
        seller_bond_idr: requiredNumber(numberValues, "fixtures.amounts.seller_bond_idr"),
        buyer_fee_idr: requiredNumber(numberValues, "fixtures.amounts.buyer_fee_idr"),
        seller_fee_idr: requiredNumber(numberValues, "fixtures.amounts.seller_fee_idr"),
      },
    },
  };

  const validation = validateSmokeRuntimeConfig(config);
  if (!validation.ok) {
    return {
      ok: false,
      errors: validation.errors.map((error) => ({
        code: "ERR_INVALID_RUNTIME_CONFIG",
        field: error.field,
        public_detail: error.code,
      })),
    };
  }

  const nowUnixSeconds = requiredNumber(numberValues, "time_source.now_unix_seconds");
  const timeSource: StellarTimeSource = {
    nowUnixSeconds: () => nowUnixSeconds,
  };

  return {
    ok: true,
    input: {
      command,
      config,
      role_signers: {
        admin: adminSigner,
        buyer_demo: buyerSigner,
        seller_demo: sellerSigner,
      },
      signer_call_counts: signerCounts,
      time_source: timeSource,
      reconciliation,
    },
  };
}

class NoNetworkRpcPort implements StellarRpcPort {
  async verifyNetworkIdentity(): Promise<boolean> {
    return false;
  }

  async loadSourceAccount(): Promise<RpcSourceAccountResult> {
    return { ok: false };
  }

  async simulateAndPrepareTransaction(): Promise<SimulatedTransactionResult> {
    return { ok: false, error_code: "ERR_NETWORK_FAILURE" };
  }

  async submitTransaction(): Promise<SubmitTransactionResult> {
    return { ok: false, status: "error", error_code: "ERR_NETWORK_FAILURE" };
  }

  async confirmTransaction(): Promise<ConfirmTransactionResult> {
    return { outcome: "error", error_code: "ERR_NETWORK_FAILURE" };
  }
}

class CountingRpcPort implements StellarRpcPort {
  constructor(
    private readonly inner: StellarRpcPort,
    private readonly counts: MutableRpcCallCounts,
  ) {}

  async verifyNetworkIdentity(expectedPassphrase: string): Promise<boolean> {
    this.counts.network_checks += 1;
    return this.inner.verifyNetworkIdentity(expectedPassphrase);
  }

  async loadSourceAccount(address: string): Promise<RpcSourceAccountResult> {
    this.counts.source_account_loads += 1;
    return this.inner.loadSourceAccount(address);
  }

  async simulateAndPrepareTransaction(
    transaction: Transaction,
  ): Promise<SimulatedTransactionResult> {
    this.counts.simulations += 1;
    return this.inner.simulateAndPrepareTransaction(transaction);
  }

  async submitTransaction(transactionEnvelope: string): Promise<SubmitTransactionResult> {
    this.counts.submissions += 1;
    return this.inner.submitTransaction(transactionEnvelope);
  }

  async confirmTransaction(transactionHash: string): Promise<ConfirmTransactionResult> {
    this.counts.confirmations += 1;
    return this.inner.confirmTransaction(transactionHash);
  }
}

export function createNoNetworkSmokeRpcSentinel(): StellarRpcPort {
  return new NoNetworkRpcPort();
}

export async function runTestnetSmokeOperator(
  input: TestnetSmokeOperatorInput,
  dependencies: {
    readonly rpc_port?: StellarRpcPort;
  } = {},
): Promise<OperatorRunResult> {
  const rpcCounts: MutableRpcCallCounts = {
    network_checks: 0,
    source_account_loads: 0,
    simulations: 0,
    submissions: 0,
    confirmations: 0,
  };
  const baseRpc = dependencies.rpc_port ??
    (input.command === "preflight"
      ? createNoNetworkSmokeRpcSentinel()
      : new StellarSdkRpc(input.config.rpc_url, input.config.network_passphrase));
  const rpcPort = new CountingRpcPort(baseRpc, rpcCounts);
  const runtimeResult = createSmokeRuntime(input.config, {
    role_signers: input.role_signers,
    time_source: input.time_source,
    persistence: createSmokePersistenceBundle(),
    rpc_port: rpcPort,
  });

  if (!runtimeResult.ok) {
    return {
      ok: false,
      command: input.command,
      errors: runtimeResult.errors.map((error) => ({
        code: "ERR_INVALID_RUNTIME_CONFIG",
        field: error.field,
        public_detail: error.code,
      })),
      summary: null,
    };
  }

  if (input.command === "preflight") {
    return {
      ok: true,
      command: "preflight",
      summary: buildBaseSummary(input, rpcCounts, {
        kind: "preflight",
        runtime_constructed: true,
      }),
    };
  }

  if (input.command === "happy_path") {
    const result = await runHappyPathSmokeScenario(runtimeResult.runtime);
    const summary = buildBaseSummary(input, rpcCounts, {
      kind: "happy_path",
      result: safeScenarioResult(result),
    });
    if (!result.ok) {
      return {
        ok: false,
        command: "happy_path",
        errors: [{ code: "ERR_INVALID_RUNTIME_CONFIG", field: "scenario", public_detail: result.error_code }],
        summary,
      };
    }
    return {
      ok: true,
      command: "happy_path",
      summary,
    };
  }

  if (input.command === "expiry") {
    const result = await runExpirySmokeScenario(runtimeResult.runtime);
    const summary = buildBaseSummary(input, rpcCounts, {
      kind: "expiry",
      result: safeScenarioResult(result),
    });
    if (!result.ok) {
      return {
        ok: false,
        command: "expiry",
        errors: [{ code: "ERR_INVALID_RUNTIME_CONFIG", field: "scenario", public_detail: result.error_code }],
        summary,
      };
    }
    return {
      ok: true,
      command: "expiry",
      summary,
    };
  }

  if (input.command === "refund") {
    const result = await runRefundSmokeScenario(runtimeResult.runtime);
    const summary = buildBaseSummary(input, rpcCounts, {
      kind: "refund",
      result: safeScenarioResult(result),
    });
    if (!result.ok) {
      return {
        ok: false,
        command: "refund",
        errors: [{ code: "ERR_INVALID_RUNTIME_CONFIG", field: "scenario", public_detail: result.error_code }],
        summary,
      };
    }
    return {
      ok: true,
      command: "refund",
      summary,
    };
  }

  if (input.reconciliation === null) {
    return {
      ok: false,
      command: "reconcile",
      errors: [{ code: "ERR_MISSING_FIELD", field: "reconciliation" }],
      summary: null,
    };
  }

  const result = await reconcileSmokeTransactionHash({
    runtime: runtimeResult.runtime,
    action: input.reconciliation.action,
    transaction_hash: input.reconciliation.transaction_hash,
  });
  const summary = buildBaseSummary(input, rpcCounts, {
    kind: "reconcile",
    result: safeReconciliationResult(result),
  });
  if (!result.ok) {
    return {
      ok: false,
      command: "reconcile",
      errors: [{ code: "ERR_INVALID_RUNTIME_CONFIG", field: "reconciliation", public_detail: result.error_code }],
      summary,
    };
  }
  return {
    ok: true,
    command: "reconcile",
    summary,
  };
}

function safeScenarioResult(result: SmokeScenarioResult): SafeScenarioResult {
  if (result.ok) {
    return {
      ok: true,
      evidence: result.evidence,
    };
  }
  return {
    ok: false,
    error_code: result.error_code,
    failed_action: result.failed_action,
    evidence: result.evidence,
  };
}

function safeReconciliationResult(
  result: SmokeReconciliationResult,
): SafeReconciliationResult {
  if (result.ok) {
    return {
      ok: true,
      evidence: result.evidence,
      confirmation: result.confirmation,
      local_state_applied: result.local_state_applied,
    };
  }
  return {
    ok: false,
    error_code: result.error_code,
    evidence: result.evidence,
    confirmation: result.confirmation,
  };
}

function buildBaseSummary(
  input: TestnetSmokeOperatorInput,
  rpcCounts: MutableRpcCallCounts,
  scenario: OperatorSafeSummary["scenario"],
): OperatorSafeSummary {
  return {
    checkpoint_commit: input.config.checkpoint_commit,
    command: input.command,
    contract_id: input.config.contract_id,
    network_passphrase: input.config.network_passphrase,
    public_role_addresses: {
      admin: input.config.role_addresses.admin,
      buyer_demo: input.config.role_addresses.buyer_demo,
      seller_demo: input.config.role_addresses.seller_demo,
    },
    transport_call_counts: snapshotRpcCounts(rpcCounts),
    signer_call_counts: snapshotSignerCounts(input.signer_call_counts),
    scenario,
  };
}

function visitValues(
  value: unknown,
  path: readonly string[],
  matches: string[],
): void {
  if (typeof value === "string") {
    const normalized = value.toLowerCase();
    const hasForbiddenWord =
      normalized.includes("signed_transaction_xdr") ||
      normalized.includes("unsigned_transaction_xdr") ||
      normalized.includes("prepared_transaction_xdr") ||
      normalized.includes("private") ||
      normalized.includes("secret") ||
      normalized.includes("signature") ||
      normalized.includes("keypair") ||
      normalized.includes("environment");
    const looksLikeTransactionEnvelope = /^AAAA[A-Za-z0-9+/=]{40,}$/.test(value);
    if (hasForbiddenWord || looksLikeTransactionEnvelope) {
      matches.push(path.join("."));
    }
    return;
  }

  if (value === null || typeof value !== "object") {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => visitValues(item, [...path, String(index)], matches));
    return;
  }

  const record = value as { readonly [key: string]: unknown };
  for (const [key, child] of Object.entries(record)) {
    visitValues(child, [...path, key], matches);
  }
}

export function inspectOperatorOutputSafety(
  value: unknown,
): OperatorOutputSafetyResult {
  const forbiddenKeys = collectForbiddenEvidenceKeys(value);
  const forbiddenValues: string[] = [];
  visitValues(value, [], forbiddenValues);
  if (forbiddenKeys.length > 0 || forbiddenValues.length > 0) {
    return {
      ok: false,
      forbidden_keys: forbiddenKeys,
      forbidden_values: forbiddenValues,
    };
  }
  return { ok: true };
}

export function buildOperatorJsonOutput(result: OperatorRunResult): {
  readonly ok: true;
  readonly json: string;
} | {
  readonly ok: false;
  readonly json: string;
  readonly safety: OperatorOutputSafetyResult;
} {
  const output = result.ok
    ? {
        ok: true,
        command: result.command,
        summary: result.summary,
      }
    : {
        ok: false,
        command: result.command,
        errors: result.errors,
        summary: result.summary,
      };
  const safety = inspectOperatorOutputSafety(output);
  if (!safety.ok) {
    return {
      ok: false,
      json: JSON.stringify({
        ok: false,
        error_code: "ERR_UNSAFE_OPERATOR_OUTPUT",
      }),
      safety,
    };
  }
  return {
    ok: true,
    json: JSON.stringify(output),
  };
}
