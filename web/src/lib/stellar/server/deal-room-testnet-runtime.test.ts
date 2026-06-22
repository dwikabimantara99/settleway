import { Buffer } from "node:buffer";
import { describe, expect, it } from "vitest";
import { StrKey } from "@stellar/stellar-sdk";
import type { StellarExecutionAdapter } from "./adapter-contracts";
import type { StellarRpcPort } from "./stellar-rpc-port";
import type { StellarSignerPort } from "./stellar-signer-port";
import {
  loadDealRoomTestnetRuntime,
  resolveDealRoomDefaultStellarState,
} from "./deal-room-testnet-runtime";

const CONTRACT_ID = StrKey.encodeContract(Buffer.alloc(32, 9));

function makeEnv(overrides: Record<string, string | undefined> = {}) {
  return {
    SETTLEWAY_SMOKE_RPC_URL: "https://soroban-testnet.stellar.org",
    SETTLEWAY_SMOKE_NETWORK_PASSPHRASE: "Test SDF Network ; September 2015",
    SETTLEWAY_SMOKE_CONTRACT_ID: CONTRACT_ID,
    SETTLEWAY_SMOKE_STELLAR_CLI_PATH: "C:\\stellar\\stellar.exe",
    SETTLEWAY_SMOKE_STELLAR_CONFIG_DIR: "C:\\settleway\\stellar-config",
    SETTLEWAY_SMOKE_STELLAR_NETWORK_ALIAS: "settleway-testnet",
    SETTLEWAY_SMOKE_ADMIN_KEY_ALIAS: "settleway-testnet-admin",
    SETTLEWAY_SMOKE_BUYER_DEMO_KEY_ALIAS: "settleway-testnet-buyer-demo",
    SETTLEWAY_SMOKE_SELLER_DEMO_KEY_ALIAS: "settleway-testnet-seller-demo",
    SETTLEWAY_SMOKE_BASE_FEE_STROOPS: "100",
    SETTLEWAY_SMOKE_MAX_FEE_STROOPS: "1000",
    SETTLEWAY_SMOKE_TIMEOUT_SECONDS: "30",
    ...overrides,
  };
}

describe("deal room testnet runtime loader", () => {
  it("builds a runtime from the frozen public Testnet config surface", () => {
    const reader = (name: string) => makeEnv()[name];
    const rpcPort = {} as StellarRpcPort;
    const signerPort = {} as StellarSignerPort;
    const executionAdapter = {} as StellarExecutionAdapter;

    const result = loadDealRoomTestnetRuntime({
      reader,
      config_dir_exists: () => true,
      rpc_port_factory: () => rpcPort,
      signer_port_factory: () => signerPort,
      execution_adapter_factory: () => executionAdapter,
      time_source: { nowUnixSeconds: () => 1700000000 },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.runtime.contract_id).toBe(CONTRACT_ID);
      expect(result.runtime.metadata).toMatchObject({
        contract_id: CONTRACT_ID,
        admin_address: "GCTGB45KC7CGLSH7AWNCI7TGG4OU23JWIPU4WHD6OI7P2DIBZ55N3FJG",
        buyer_demo_address: "GBKFD4EHOTC64YWBEHSQECOXLRR4WKKUFBAVQ3GF2HQADRBLNVSR5RLX",
        seller_demo_address: "GAZGIBWKDTYSKZSXLIOJB4HE65VOLR22ZHTZ3FI6UX7QOGYFZQ6WVHWU",
      });
      expect(result.runtime.execution_adapter).toBe(executionAdapter);
    }
  });

  it("reports missing config explicitly", () => {
    const reader = (name: string) =>
      makeEnv({ SETTLEWAY_SMOKE_CONTRACT_ID: undefined })[name];

    const result = loadDealRoomTestnetRuntime({
      reader,
      config_dir_exists: () => true,
    });

    expect(result).toEqual({
      ok: false,
      errors: [{ code: "ERR_MISSING_CONFIG", field: "contract_id" }],
    });
  });

  it("rejects invalid public runtime config", () => {
    const reader = (name: string) =>
      makeEnv({
        SETTLEWAY_SMOKE_RPC_URL: "http://localhost",
        SETTLEWAY_SMOKE_BASE_FEE_STROOPS: "2000",
        SETTLEWAY_SMOKE_MAX_FEE_STROOPS: "1000",
        SETTLEWAY_SMOKE_STELLAR_CLI_PATH: "stellar.exe",
      })[name];

    const result = loadDealRoomTestnetRuntime({
      reader,
      config_dir_exists: () => true,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          { code: "ERR_INVALID_CONFIG", field: "rpc_url" },
          { code: "ERR_INVALID_CONFIG", field: "fees.base_fee_stroops" },
          { code: "ERR_INVALID_CONFIG", field: "stellar_cli_path" },
        ]),
      );
    }
  });

  it("resolves default seeded deal state to testnet when runtime config is valid", () => {
    const reader = (name: string) => makeEnv()[name];

    const result = resolveDealRoomDefaultStellarState({
      reader,
    });

    expect(result).toEqual({
      stellar_mode: "testnet",
      stellar_contract_id: CONTRACT_ID,
    });
  });

  it("resolves default seeded deal state to mock_only when runtime config is unavailable", () => {
    const reader = (name: string) =>
      makeEnv({ SETTLEWAY_SMOKE_CONTRACT_ID: undefined })[name];

    const result = resolveDealRoomDefaultStellarState({
      reader,
    });

    expect(result).toEqual({
      stellar_mode: "mock_only",
      stellar_contract_id: null,
    });
  });
});
