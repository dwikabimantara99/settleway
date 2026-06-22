import path from "node:path";
import { Networks, StrKey } from "@stellar/stellar-sdk";
import type { StellarExecutionAdapter } from "./adapter-contracts";
import { buildDealRoomExecutionMetadata } from "./deal-room-funding-runtime";
import type { StellarExecutionPublicMetadata } from "./execution-input-assembler";
import type { StellarMode } from "../types";
import type { StellarRpcPort } from "./stellar-rpc-port";
import { StellarSdkRpc } from "./stellar-sdk-rpc";
import type { StellarSignerPort, StellarTimeSource } from "./stellar-signer-port";
import type { StellarCliSecureStoreSignerConfig } from "./smoke/stellar-cli-secure-store-signer";
import { StellarCliSecureStoreSigner } from "./smoke/stellar-cli-secure-store-signer";
import {
  StellarTestnetAdapter,
  type StellarTestnetAdapterConfig,
  type StellarTestnetRoleMapping,
} from "./stellar-testnet-adapter";

const TESTNET_RUNTIME_ENV = {
  rpc_url: "SETTLEWAY_SMOKE_RPC_URL",
  network_passphrase: "SETTLEWAY_SMOKE_NETWORK_PASSPHRASE",
  contract_id: "SETTLEWAY_SMOKE_CONTRACT_ID",
  stellar_cli_path: "SETTLEWAY_SMOKE_STELLAR_CLI_PATH",
  stellar_config_dir: "SETTLEWAY_SMOKE_STELLAR_CONFIG_DIR",
  stellar_network_alias: "SETTLEWAY_SMOKE_STELLAR_NETWORK_ALIAS",
  admin_key_alias: "SETTLEWAY_SMOKE_ADMIN_KEY_ALIAS",
  buyer_demo_key_alias: "SETTLEWAY_SMOKE_BUYER_DEMO_KEY_ALIAS",
  seller_demo_key_alias: "SETTLEWAY_SMOKE_SELLER_DEMO_KEY_ALIAS",
  base_fee_stroops: "SETTLEWAY_SMOKE_BASE_FEE_STROOPS",
  max_fee_stroops: "SETTLEWAY_SMOKE_MAX_FEE_STROOPS",
  timeout_seconds: "SETTLEWAY_SMOKE_TIMEOUT_SECONDS",
} as const;

export interface DealRoomTestnetRuntime {
  contract_id: string;
  metadata: StellarExecutionPublicMetadata;
  execution_adapter: StellarExecutionAdapter;
  signer_port: StellarSignerPort;
}

export interface DealRoomDefaultStellarState {
  stellar_mode: StellarMode;
  stellar_contract_id: string | null;
}

export type DealRoomTestnetRuntimeErrorCode =
  | "ERR_MISSING_CONFIG"
  | "ERR_INVALID_CONFIG";

export interface DealRoomTestnetRuntimeError {
  code: DealRoomTestnetRuntimeErrorCode;
  field: string;
}

export type DealRoomTestnetRuntimeResult =
  | { ok: true; runtime: DealRoomTestnetRuntime }
  | { ok: false; errors: DealRoomTestnetRuntimeError[] };

export interface DealRoomTestnetRuntimeDependencies {
  reader?: (name: string) => string | undefined;
  config_dir_exists?: (configDir: string) => boolean;
  rpc_port_factory?: (
    rpcUrl: string,
    networkPassphrase: string,
  ) => StellarRpcPort;
  signer_port_factory?: (
    config: StellarCliSecureStoreSignerConfig,
  ) => StellarSignerPort;
  execution_adapter_factory?: (input: {
    config: StellarTestnetAdapterConfig;
    role_mapping: StellarTestnetRoleMapping;
    rpc_port: StellarRpcPort;
    signer_port: StellarSignerPort;
    time_source: StellarTimeSource;
  }) => StellarExecutionAdapter;
  time_source?: StellarTimeSource;
}

function readRequiredTrimmed(
  reader: (name: string) => string | undefined,
  envName: string,
  field: string,
  errors: DealRoomTestnetRuntimeError[],
): string | null {
  const value = reader(envName);
  if (value === undefined || value.trim() === "") {
    errors.push({ code: "ERR_MISSING_CONFIG", field });
    return null;
  }
  if (value.trim() !== value) {
    errors.push({ code: "ERR_INVALID_CONFIG", field });
    return null;
  }
  return value;
}

function readPositiveInteger(
  reader: (name: string) => string | undefined,
  envName: string,
  field: string,
  errors: DealRoomTestnetRuntimeError[],
): number | null {
  const raw = readRequiredTrimmed(reader, envName, field, errors);
  if (raw === null) {
    return null;
  }

  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) {
    errors.push({ code: "ERR_INVALID_CONFIG", field });
    return null;
  }

  return value;
}

function isValidHttpsUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && parsed.hostname.trim() !== "";
  } catch {
    return false;
  }
}

function nowUnixSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export function loadDealRoomTestnetRuntime(
  dependencies: DealRoomTestnetRuntimeDependencies = {},
): DealRoomTestnetRuntimeResult {
  const reader = dependencies.reader ?? ((name: string) => process.env[name]);
  const errors: DealRoomTestnetRuntimeError[] = [];

  const rpcUrl = readRequiredTrimmed(
    reader,
    TESTNET_RUNTIME_ENV.rpc_url,
    "rpc_url",
    errors,
  );
  const networkPassphrase = readRequiredTrimmed(
    reader,
    TESTNET_RUNTIME_ENV.network_passphrase,
    "network_passphrase",
    errors,
  );
  const contractId = readRequiredTrimmed(
    reader,
    TESTNET_RUNTIME_ENV.contract_id,
    "contract_id",
    errors,
  );
  const stellarCliPath = readRequiredTrimmed(
    reader,
    TESTNET_RUNTIME_ENV.stellar_cli_path,
    "stellar_cli_path",
    errors,
  );
  const configDir = readRequiredTrimmed(
    reader,
    TESTNET_RUNTIME_ENV.stellar_config_dir,
    "stellar_config_dir",
    errors,
  );
  const networkAlias = readRequiredTrimmed(
    reader,
    TESTNET_RUNTIME_ENV.stellar_network_alias,
    "stellar_network_alias",
    errors,
  );
  const adminAlias = readRequiredTrimmed(
    reader,
    TESTNET_RUNTIME_ENV.admin_key_alias,
    "role_aliases.admin",
    errors,
  );
  const buyerAlias = readRequiredTrimmed(
    reader,
    TESTNET_RUNTIME_ENV.buyer_demo_key_alias,
    "role_aliases.buyer_demo",
    errors,
  );
  const sellerAlias = readRequiredTrimmed(
    reader,
    TESTNET_RUNTIME_ENV.seller_demo_key_alias,
    "role_aliases.seller_demo",
    errors,
  );
  const baseFeeStroops = readPositiveInteger(
    reader,
    TESTNET_RUNTIME_ENV.base_fee_stroops,
    "fees.base_fee_stroops",
    errors,
  );
  const maxFeeStroops = readPositiveInteger(
    reader,
    TESTNET_RUNTIME_ENV.max_fee_stroops,
    "fees.max_fee_stroops",
    errors,
  );
  const timeoutSeconds = readPositiveInteger(
    reader,
    TESTNET_RUNTIME_ENV.timeout_seconds,
    "timebounds.timeout_seconds",
    errors,
  );

  if (
    rpcUrl !== null &&
    !isValidHttpsUrl(rpcUrl)
  ) {
    errors.push({ code: "ERR_INVALID_CONFIG", field: "rpc_url" });
  }

  if (
    networkPassphrase !== null &&
    networkPassphrase !== Networks.TESTNET
  ) {
    errors.push({ code: "ERR_INVALID_CONFIG", field: "network_passphrase" });
  }

  if (
    contractId !== null &&
    !StrKey.isValidContract(contractId)
  ) {
    errors.push({ code: "ERR_INVALID_CONFIG", field: "contract_id" });
  }

  if (stellarCliPath !== null && !path.isAbsolute(stellarCliPath)) {
    errors.push({ code: "ERR_INVALID_CONFIG", field: "stellar_cli_path" });
  }

  if (configDir !== null && !path.isAbsolute(configDir)) {
    errors.push({ code: "ERR_INVALID_CONFIG", field: "stellar_config_dir" });
  }

  if (
    baseFeeStroops !== null &&
    maxFeeStroops !== null &&
    baseFeeStroops > maxFeeStroops
  ) {
    errors.push({ code: "ERR_INVALID_CONFIG", field: "fees.base_fee_stroops" });
  }

  if (
    adminAlias !== null &&
    buyerAlias !== null &&
    sellerAlias !== null &&
    new Set([adminAlias, buyerAlias, sellerAlias]).size !== 3
  ) {
    errors.push({ code: "ERR_INVALID_CONFIG", field: "role_aliases" });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const metadata = buildDealRoomExecutionMetadata(contractId!);
  const roleMapping: StellarTestnetRoleMapping = {
    admin_address: metadata.admin_address,
    buyer_demo_address: metadata.buyer_demo_address,
    seller_demo_address: metadata.seller_demo_address,
  };

  const signerConfig: StellarCliSecureStoreSignerConfig = {
    stellar_cli_path: stellarCliPath!,
    config_dir: configDir!,
    rpc_url: rpcUrl!,
    network_alias: networkAlias!,
    role_aliases: {
      admin: adminAlias!,
      buyer_demo: buyerAlias!,
      seller_demo: sellerAlias!,
    },
    public_addresses: {
      admin: roleMapping.admin_address,
      buyer_demo: roleMapping.buyer_demo_address,
      seller_demo: roleMapping.seller_demo_address,
    },
    ...(dependencies.config_dir_exists
      ? { config_dir_exists: dependencies.config_dir_exists }
      : {}),
  };

  const rpcPort =
    dependencies.rpc_port_factory?.(rpcUrl!, networkPassphrase!) ??
    new StellarSdkRpc(rpcUrl!, networkPassphrase!);
  const signerPort =
    dependencies.signer_port_factory?.(signerConfig) ??
    new StellarCliSecureStoreSigner(signerConfig);
  const timeSource =
    dependencies.time_source ?? { nowUnixSeconds };
  const adapterConfig: StellarTestnetAdapterConfig = {
    network_passphrase: networkPassphrase!,
    contract_id: contractId!,
    base_fee_stroops: baseFeeStroops!,
    max_fee_stroops: maxFeeStroops!,
    timeout_seconds: timeoutSeconds!,
  };
  const executionAdapter =
    dependencies.execution_adapter_factory?.({
      config: adapterConfig,
      role_mapping: roleMapping,
      rpc_port: rpcPort,
      signer_port: signerPort,
      time_source: timeSource,
    }) ??
    new StellarTestnetAdapter(
      adapterConfig,
      roleMapping,
      rpcPort,
      signerPort,
      timeSource,
    );

  return {
    ok: true,
    runtime: {
      contract_id: contractId!,
      metadata,
      execution_adapter: executionAdapter,
      signer_port: signerPort,
    },
  };
}

export function resolveDealRoomDefaultStellarState(
  dependencies: DealRoomTestnetRuntimeDependencies = {},
): DealRoomDefaultStellarState {
  const result = loadDealRoomTestnetRuntime({
    ...dependencies,
    rpc_port_factory:
      dependencies.rpc_port_factory ??
      (() => ({}) as StellarRpcPort),
    signer_port_factory:
      dependencies.signer_port_factory ??
      (() => ({}) as StellarSignerPort),
    execution_adapter_factory:
      dependencies.execution_adapter_factory ??
      (() => ({}) as StellarExecutionAdapter),
    time_source:
      dependencies.time_source ?? { nowUnixSeconds },
  });

  if (!result.ok) {
    return {
      stellar_mode: "mock_only",
      stellar_contract_id: null,
    };
  }

  return {
    stellar_mode: "testnet",
    stellar_contract_id: result.runtime.contract_id,
  };
}
