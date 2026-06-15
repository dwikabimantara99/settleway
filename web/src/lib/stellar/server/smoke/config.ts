import { Networks, StrKey } from "@stellar/stellar-sdk";
import { isValidU64DecimalString } from "@/lib/stellar/helpers";
import type { StellarSignerRole } from "../action-policy";

export const SMOKE_SIGNER_ROLES = [
  "admin",
  "buyer_demo",
  "seller_demo",
] as const satisfies readonly StellarSignerRole[];

export interface SmokeRoleAddresses {
  readonly admin: string;
  readonly buyer_demo: string;
  readonly seller_demo: string;
}

export interface SmokeFeeConfig {
  readonly base_fee_stroops: number;
  readonly max_fee_stroops: number;
}

export interface SmokeTimeboundsConfig {
  readonly timeout_seconds: number;
}

export interface SmokeConfirmationConfig {
  readonly max_attempts: number;
}

export interface SmokeFixtureAmounts {
  readonly principal_idr: number;
  readonly buyer_bond_idr: number;
  readonly seller_bond_idr: number;
  readonly buyer_fee_idr: number;
  readonly seller_fee_idr: number;
}

export interface SmokeFixtureConfig {
  readonly deal_id: string;
  readonly buyer_id: string;
  readonly seller_id: string;
  readonly commodity: string;
  readonly volume_kg: number;
  readonly deal_hash: string;
  readonly proof_hash: string;
  readonly expires_at: string;
  readonly amounts: SmokeFixtureAmounts;
}

export interface SmokeRuntimeConfig {
  readonly checkpoint_commit: string;
  readonly rpc_url: string;
  readonly network_passphrase: string;
  readonly contract_id: string;
  readonly role_addresses: SmokeRoleAddresses;
  readonly fees: SmokeFeeConfig;
  readonly timebounds: SmokeTimeboundsConfig;
  readonly confirmation: SmokeConfirmationConfig;
  readonly fixtures: SmokeFixtureConfig;
}

export type SmokeRuntimeConfigErrorCode =
  | "ERR_INVALID_CHECKPOINT_COMMIT"
  | "ERR_INVALID_RPC_URL"
  | "ERR_INVALID_NETWORK"
  | "ERR_INVALID_CONTRACT_ID"
  | "ERR_INVALID_ROLE_ADDRESS"
  | "ERR_DUPLICATE_ROLE_ADDRESS"
  | "ERR_INVALID_BASE_FEE"
  | "ERR_INVALID_MAX_FEE"
  | "ERR_BASE_EXCEEDS_MAX_FEE"
  | "ERR_INVALID_TIMEOUT"
  | "ERR_INVALID_CONFIRMATION_POLICY"
  | "ERR_INVALID_FIXTURE_IDENTIFIER"
  | "ERR_INVALID_FIXTURE_VOLUME"
  | "ERR_INVALID_FIXTURE_HASH"
  | "ERR_INVALID_FIXTURE_EXPIRES_AT"
  | "ERR_UNSAFE_FIXTURE_AMOUNT";

export interface SmokeRuntimeConfigError {
  readonly code: SmokeRuntimeConfigErrorCode;
  readonly field: string;
}

export type SmokeRuntimeConfigValidationResult =
  | { readonly ok: true; readonly config: SmokeRuntimeConfig }
  | { readonly ok: false; readonly errors: readonly SmokeRuntimeConfigError[] };

const HASH_40 = /^[0-9a-fA-F]{40}$/;
const HASH_64 = /^[0-9a-fA-F]{64}$/;
const MAX_TIMEOUT_SECONDS = 600;

function pushError(
  errors: SmokeRuntimeConfigError[],
  code: SmokeRuntimeConfigErrorCode,
  field: string,
): void {
  errors.push({ code, field });
}

function isNonEmptyTrimmed(value: string): boolean {
  return value.trim() !== "" && value === value.trim();
}

function isSafeInteger(value: number): boolean {
  return Number.isFinite(value) && Number.isInteger(value) && Number.isSafeInteger(value);
}

function isSafeNonNegativeInteger(value: number): boolean {
  return isSafeInteger(value) && value >= 0;
}

function isSafePositiveInteger(value: number): boolean {
  return isSafeInteger(value) && value > 0;
}

function isValidHttpsUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && parsed.hostname.trim() !== "";
  } catch {
    return false;
  }
}

function validateRoleAddresses(
  addresses: SmokeRoleAddresses,
  errors: SmokeRuntimeConfigError[],
): void {
  const seen = new Set<string>();
  for (const role of SMOKE_SIGNER_ROLES) {
    const value = addresses[role];
    if (!StrKey.isValidEd25519PublicKey(value)) {
      pushError(errors, "ERR_INVALID_ROLE_ADDRESS", `role_addresses.${role}`);
      continue;
    }
    if (seen.has(value)) {
      pushError(errors, "ERR_DUPLICATE_ROLE_ADDRESS", `role_addresses.${role}`);
      continue;
    }
    seen.add(value);
  }
}

function validateFixtureAmounts(
  amounts: SmokeFixtureAmounts,
  errors: SmokeRuntimeConfigError[],
): void {
  if (!isSafePositiveInteger(amounts.principal_idr)) {
    pushError(errors, "ERR_UNSAFE_FIXTURE_AMOUNT", "fixtures.amounts.principal_idr");
  }

  const nonNegativeFields: Array<keyof Omit<SmokeFixtureAmounts, "principal_idr">> = [
    "buyer_bond_idr",
    "seller_bond_idr",
    "buyer_fee_idr",
    "seller_fee_idr",
  ];

  for (const field of nonNegativeFields) {
    if (!isSafeNonNegativeInteger(amounts[field])) {
      pushError(errors, "ERR_UNSAFE_FIXTURE_AMOUNT", `fixtures.amounts.${field}`);
    }
  }
}

function validateFixtures(
  fixtures: SmokeFixtureConfig,
  errors: SmokeRuntimeConfigError[],
): void {
  const requiredIdentifiers: Array<keyof Pick<
    SmokeFixtureConfig,
    "deal_id" | "buyer_id" | "seller_id" | "commodity"
  >> = ["deal_id", "buyer_id", "seller_id", "commodity"];

  for (const field of requiredIdentifiers) {
    if (!isNonEmptyTrimmed(fixtures[field])) {
      pushError(errors, "ERR_INVALID_FIXTURE_IDENTIFIER", `fixtures.${field}`);
    }
  }

  if (!isSafePositiveInteger(fixtures.volume_kg)) {
    pushError(errors, "ERR_INVALID_FIXTURE_VOLUME", "fixtures.volume_kg");
  }

  if (!HASH_64.test(fixtures.deal_hash)) {
    pushError(errors, "ERR_INVALID_FIXTURE_HASH", "fixtures.deal_hash");
  }

  if (!HASH_64.test(fixtures.proof_hash)) {
    pushError(errors, "ERR_INVALID_FIXTURE_HASH", "fixtures.proof_hash");
  }

  if (!isValidU64DecimalString(fixtures.expires_at)) {
    pushError(errors, "ERR_INVALID_FIXTURE_EXPIRES_AT", "fixtures.expires_at");
  }

  validateFixtureAmounts(fixtures.amounts, errors);
}

export function validateSmokeRuntimeConfig(
  config: SmokeRuntimeConfig,
): SmokeRuntimeConfigValidationResult {
  const errors: SmokeRuntimeConfigError[] = [];

  if (!HASH_40.test(config.checkpoint_commit)) {
    pushError(errors, "ERR_INVALID_CHECKPOINT_COMMIT", "checkpoint_commit");
  }

  if (!isValidHttpsUrl(config.rpc_url)) {
    pushError(errors, "ERR_INVALID_RPC_URL", "rpc_url");
  }

  if (config.network_passphrase !== Networks.TESTNET) {
    pushError(errors, "ERR_INVALID_NETWORK", "network_passphrase");
  }

  if (!StrKey.isValidContract(config.contract_id)) {
    pushError(errors, "ERR_INVALID_CONTRACT_ID", "contract_id");
  }

  validateRoleAddresses(config.role_addresses, errors);

  if (!isSafePositiveInteger(config.fees.base_fee_stroops)) {
    pushError(errors, "ERR_INVALID_BASE_FEE", "fees.base_fee_stroops");
  }

  if (!isSafePositiveInteger(config.fees.max_fee_stroops)) {
    pushError(errors, "ERR_INVALID_MAX_FEE", "fees.max_fee_stroops");
  }

  if (
    isSafePositiveInteger(config.fees.base_fee_stroops) &&
    isSafePositiveInteger(config.fees.max_fee_stroops) &&
    config.fees.base_fee_stroops > config.fees.max_fee_stroops
  ) {
    pushError(errors, "ERR_BASE_EXCEEDS_MAX_FEE", "fees.base_fee_stroops");
  }

  if (
    !isSafePositiveInteger(config.timebounds.timeout_seconds) ||
    config.timebounds.timeout_seconds > MAX_TIMEOUT_SECONDS
  ) {
    pushError(errors, "ERR_INVALID_TIMEOUT", "timebounds.timeout_seconds");
  }

  if (!isSafePositiveInteger(config.confirmation.max_attempts)) {
    pushError(errors, "ERR_INVALID_CONFIRMATION_POLICY", "confirmation.max_attempts");
  }

  validateFixtures(config.fixtures, errors);

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, config };
}
