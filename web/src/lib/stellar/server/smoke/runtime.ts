import { StellarSdkRpc } from "../stellar-sdk-rpc";
import { StellarTestnetAdapter } from "../stellar-testnet-adapter";
import type { StellarTestnetRoleMapping } from "../stellar-testnet-adapter";
import type { StellarRpcPort } from "../stellar-rpc-port";
import type { StellarSignerPort, StellarTimeSource } from "../stellar-signer-port";
import type { StellarExecutionPublicMetadata } from "../execution-input-assembler";
import type { StellarExecutionAdapter } from "../adapter-contracts";
import { validateSmokeRuntimeConfig } from "./config";
import type {
  SmokeRuntimeConfig,
  SmokeRuntimeConfigError,
} from "./config";
import { SMOKE_SIGNER_ROLES } from "./config";
import { InjectedSmokeSignerPort } from "./signer";
import type { SmokeRoleSignerInput, SmokeRoleSigners } from "./signer";
import type { SmokePersistenceBundle } from "./persistence";

export type SmokeRuntimeCompositionError =
  | SmokeRuntimeConfigError
  | {
      readonly code: "ERR_INVALID_ROLE_SIGNER";
      readonly field: string;
    };

export interface SmokeRuntimeDependencies {
  readonly role_signers: SmokeRoleSignerInput;
  readonly time_source: StellarTimeSource;
  readonly persistence: SmokePersistenceBundle;
  readonly rpc_port?: StellarRpcPort;
}

export interface SmokeRuntime {
  readonly config: SmokeRuntimeConfig;
  readonly metadata: StellarExecutionPublicMetadata;
  readonly role_mapping: StellarTestnetRoleMapping;
  readonly rpc_port: StellarRpcPort;
  readonly signer_port: StellarSignerPort;
  readonly time_source: StellarTimeSource;
  readonly execution_adapter: StellarExecutionAdapter;
  readonly persistence: SmokePersistenceBundle;
}

export type SmokeRuntimeCompositionResult =
  | { readonly ok: true; readonly runtime: SmokeRuntime }
  | { readonly ok: false; readonly errors: readonly SmokeRuntimeCompositionError[] };

function validateRoleSigners(
  config: SmokeRuntimeConfig,
  signers: SmokeRoleSignerInput,
): SmokeRuntimeCompositionError[] {
  const errors: SmokeRuntimeCompositionError[] = [];
  for (const role of SMOKE_SIGNER_ROLES) {
    const signer = signers[role];
    if (signer === undefined || signer.public_key !== config.role_addresses[role]) {
      errors.push({
        code: "ERR_INVALID_ROLE_SIGNER",
        field: `role_signers.${role}`,
      });
    }
  }
  return errors;
}

function completeRoleSigners(
  signers: SmokeRoleSignerInput,
): SmokeRoleSigners | null {
  const admin = signers.admin;
  const buyerDemo = signers.buyer_demo;
  const sellerDemo = signers.seller_demo;

  if (
    admin === undefined ||
    buyerDemo === undefined ||
    sellerDemo === undefined
  ) {
    return null;
  }

  return {
    admin,
    buyer_demo: buyerDemo,
    seller_demo: sellerDemo,
  };
}

export function createSmokeRuntime(
  config: SmokeRuntimeConfig,
  dependencies: SmokeRuntimeDependencies,
): SmokeRuntimeCompositionResult {
  const validation = validateSmokeRuntimeConfig(config);
  if (!validation.ok) {
    return { ok: false, errors: validation.errors };
  }

  const signerErrors = validateRoleSigners(config, dependencies.role_signers);
  if (signerErrors.length > 0) {
    return { ok: false, errors: signerErrors };
  }

  const roleSigners = completeRoleSigners(dependencies.role_signers);
  if (roleSigners === null) {
    return {
      ok: false,
      errors: [
        {
          code: "ERR_INVALID_ROLE_SIGNER",
          field: "role_signers",
        },
      ],
    };
  }

  const roleMapping: StellarTestnetRoleMapping = {
    admin_address: config.role_addresses.admin,
    buyer_demo_address: config.role_addresses.buyer_demo,
    seller_demo_address: config.role_addresses.seller_demo,
  };

  const metadata: StellarExecutionPublicMetadata = {
    contract_id: config.contract_id,
    admin_address: roleMapping.admin_address,
    buyer_demo_address: roleMapping.buyer_demo_address,
    seller_demo_address: roleMapping.seller_demo_address,
  };

  const rpcPort = dependencies.rpc_port ?? new StellarSdkRpc(
    config.rpc_url,
    config.network_passphrase,
  );
  const signerPort = new InjectedSmokeSignerPort(
    config.network_passphrase,
    roleSigners,
  );

  const executionAdapter = new StellarTestnetAdapter(
    {
      network_passphrase: config.network_passphrase,
      contract_id: config.contract_id,
      custody_contract_id: config.contract_id,
      testnet_token_contract_id: config.contract_id,
      base_fee_stroops: config.fees.base_fee_stroops,
      max_fee_stroops: config.fees.max_fee_stroops,
      timeout_seconds: config.timebounds.timeout_seconds,
    },
    roleMapping,
    rpcPort,
    signerPort,
    dependencies.time_source,
  );

  return {
    ok: true,
    runtime: {
      config,
      metadata,
      role_mapping: roleMapping,
      rpc_port: rpcPort,
      signer_port: signerPort,
      time_source: dependencies.time_source,
      execution_adapter: executionAdapter,
      persistence: dependencies.persistence,
    },
  };
}
