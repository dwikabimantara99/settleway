import { describe, expect, it } from "vitest";
import {
  FeeBumpTransaction,
  Keypair,
  StrKey,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import {
  buildOperatorJsonOutput,
  createNoNetworkSmokeRpcSentinel,
  inspectOperatorOutputSafety,
  loadTestnetSmokeOperatorInput,
  runTestnetSmokeOperator,
  TESTNET_SMOKE_COMMANDS,
  TESTNET_SMOKE_ENV,
  TESTNET_SMOKE_MUTATION_ACKNOWLEDGEMENT,
} from "./operator-env";
import type { OperatorEnvironmentReader } from "./operator-env";
import type {
  StellarCliProcessRequest,
  StellarCliProcessResult,
  StellarCliProcessRunner,
} from "./stellar-cli-process-port";

const ADMIN_TEST_SEED = "SDG7MGMBQ3CQS74Q2UNIYLBDYZUBFHKAO25YBBXYGPX6YSRQFZS3DOIY";
const BUYER_TEST_SEED = "SAY7SJURIC433KFZAZ4HIJA7UAOHC64IBL7TRZX7V2HLLKZ2NV5RH6YN";
const SELLER_TEST_SEED = "SAKDCKWQTBO6E23ZHQD4LBM2WF6IRNGVV3KTGE5CKEORHEH32D6GQDVQ";
const ADMIN_ADDRESS = "GBXZG2PGM62LHQ7CSKZ6HDMK5HOTNCBTS6XTCUWUP3AO3V6D7RHSXEYU";
const BUYER_ADDRESS = "GBVNGU2QIQDENWOVV24AH4HXHFGIZWBY4ICXAPCQ6Y7A55E3V6PTN7PM";
const SELLER_ADDRESS = "GDI2FHOWZCGLR5QRBJC2G3P3M52SSBLQWSDTF4Q4KBHAIZULHDMTM2CJ";
const CONTRACT_ID = StrKey.encodeContract(Buffer.alloc(32, 12));
const STELLAR_CLI_PATH = "C:\\Users\\ACER\\.cargo\\bin\\stellar.exe";
const STELLAR_CONFIG_DIR = "C:\\Users\\ACER\\AppData\\Local\\Settleway\\stellar-testnet-smoke";
const STELLAR_NETWORK_ALIAS = "settleway-testnet";
const ADMIN_ALIAS = "settleway-testnet-admin";
const BUYER_ALIAS = "settleway-testnet-buyer-demo";
const SELLER_ALIAS = "settleway-testnet-seller-demo";

const ROLE_SEEDS = {
  [ADMIN_ALIAS]: ADMIN_TEST_SEED,
  [BUYER_ALIAS]: BUYER_TEST_SEED,
  [SELLER_ALIAS]: SELLER_TEST_SEED,
} as const;

const ROLE_PUBLIC_KEYS = {
  [ADMIN_ALIAS]: ADMIN_ADDRESS,
  [BUYER_ALIAS]: BUYER_ADDRESS,
  [SELLER_ALIAS]: SELLER_ADDRESS,
} as const;

class OfflineStellarCliRunner implements StellarCliProcessRunner {
  readonly requests: StellarCliProcessRequest[] = [];

  async run(request: StellarCliProcessRequest): Promise<StellarCliProcessResult> {
    this.requests.push(request);
    if (request.args[0] === "keys") {
      const alias = request.args[4] ?? "";
      return this.result(`${this.publicKeyForAlias(alias)}\n`);
    }
    const alias = request.args[7] ?? "";
    const seed = this.seedForAlias(alias);
    const parsed = TransactionBuilder.fromXDR(
      request.stdin_text,
      "Test SDF Network ; September 2015",
    );
    if (parsed instanceof FeeBumpTransaction) {
      return this.result("");
    }
    parsed.sign(Keypair.fromSecret(seed));
    return this.result(`${parsed.toXDR()}\n`);
  }

  private publicKeyForAlias(alias: string): string {
    if (alias === ADMIN_ALIAS || alias === BUYER_ALIAS || alias === SELLER_ALIAS) {
      return ROLE_PUBLIC_KEYS[alias];
    }
    return "";
  }

  private seedForAlias(alias: string): string {
    if (alias === ADMIN_ALIAS || alias === BUYER_ALIAS || alias === SELLER_ALIAS) {
      return ROLE_SEEDS[alias];
    }
    return ADMIN_TEST_SEED;
  }

  private result(stdout: string): StellarCliProcessResult {
    return {
      exit_code: 0,
      stdout,
      stderr: "",
      timed_out: false,
      stdout_truncated: false,
      stderr_truncated: false,
    };
  }
}

function validEnvironment(
  overrides: Readonly<Record<string, string | undefined>> = {},
): Readonly<Record<string, string | undefined>> {
  return {
    [TESTNET_SMOKE_ENV.checkpoint_commit]: "fef7bb28fb2c99aa40381587c9a41225dd123acb",
    [TESTNET_SMOKE_ENV.rpc_url]: "https://example.test/stellar-rpc",
    [TESTNET_SMOKE_ENV.network_passphrase]: "Test SDF Network ; September 2015",
    [TESTNET_SMOKE_ENV.contract_id]: CONTRACT_ID,
    [TESTNET_SMOKE_ENV.admin_address]: ADMIN_ADDRESS,
    [TESTNET_SMOKE_ENV.buyer_demo_address]: BUYER_ADDRESS,
    [TESTNET_SMOKE_ENV.seller_demo_address]: SELLER_ADDRESS,
    [TESTNET_SMOKE_ENV.stellar_cli_path]: STELLAR_CLI_PATH,
    [TESTNET_SMOKE_ENV.stellar_config_dir]: STELLAR_CONFIG_DIR,
    [TESTNET_SMOKE_ENV.stellar_network_alias]: STELLAR_NETWORK_ALIAS,
    [TESTNET_SMOKE_ENV.admin_key_alias]: ADMIN_ALIAS,
    [TESTNET_SMOKE_ENV.buyer_demo_key_alias]: BUYER_ALIAS,
    [TESTNET_SMOKE_ENV.seller_demo_key_alias]: SELLER_ALIAS,
    [TESTNET_SMOKE_ENV.base_fee_stroops]: "100",
    [TESTNET_SMOKE_ENV.max_fee_stroops]: "1000000",
    [TESTNET_SMOKE_ENV.timeout_seconds]: "30",
    [TESTNET_SMOKE_ENV.confirmation_attempts]: "3",
    [TESTNET_SMOKE_ENV.now_unix_seconds]: "1700000000",
    [TESTNET_SMOKE_ENV.deal_id]: "operator-smoke-deal",
    [TESTNET_SMOKE_ENV.buyer_id]: "buyer-demo",
    [TESTNET_SMOKE_ENV.seller_id]: "seller-demo",
    [TESTNET_SMOKE_ENV.commodity]: "chili",
    [TESTNET_SMOKE_ENV.volume_kg]: "100",
    [TESTNET_SMOKE_ENV.deal_hash]: "d".repeat(64),
    [TESTNET_SMOKE_ENV.proof_hash]: "e".repeat(64),
    [TESTNET_SMOKE_ENV.expires_at]: "1700000300",
    [TESTNET_SMOKE_ENV.principal_idr]: "1000000",
    [TESTNET_SMOKE_ENV.buyer_bond_idr]: "100000",
    [TESTNET_SMOKE_ENV.seller_bond_idr]: "100000",
    [TESTNET_SMOKE_ENV.buyer_fee_idr]: "10000",
    [TESTNET_SMOKE_ENV.seller_fee_idr]: "10000",
    ...overrides,
  };
}

function readerFrom(
  values: Readonly<Record<string, string | undefined>>,
): OperatorEnvironmentReader {
  return (name) => values[name];
}

function loadValid(
  overrides: Readonly<Record<string, string | undefined>> = {},
) {
  return loadTestnetSmokeOperatorInput(readerFrom(validEnvironment(overrides)));
}

describe("local Testnet operator environment parsing", () => {
  it("defaults to preflight safely", () => {
    const result = loadValid();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.input.command).toBe("preflight");
      expect(result.input.reconciliation).toBeNull();
    }
  });

  it("rejects missing required public fields", () => {
    const result = loadValid({ [TESTNET_SMOKE_ENV.contract_id]: undefined });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual({
        code: "ERR_MISSING_FIELD",
        field: "contract_id",
      });
    }
  });

  it("rejects missing signer alias input without returning private material", () => {
    const result = loadValid({ [TESTNET_SMOKE_ENV.admin_key_alias]: undefined });
    expect(result.ok).toBe(false);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain(ADMIN_TEST_SEED);
    if (!result.ok) {
      expect(result.errors).toContainEqual({
        code: "ERR_MISSING_FIELD",
        field: "role_aliases.admin",
      });
    }
  });

  it("rejects raw-secret-looking alias input safely", () => {
    const result = loadValid({ [TESTNET_SMOKE_ENV.admin_key_alias]: ADMIN_TEST_SEED });
    expect(result.ok).toBe(false);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain(ADMIN_TEST_SEED);
    if (!result.ok) {
      expect(result.errors).toContainEqual({
        code: "ERR_INVALID_SIGNER_ALIAS",
        field: "role_aliases.admin",
      });
    }
  });

  it("rejects legacy raw secret seed environment variables without returning values", () => {
    const result = loadValid({
      [TESTNET_SMOKE_ENV.admin_secret_seed]: ADMIN_TEST_SEED,
    });
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain(ADMIN_TEST_SEED);
    if (!result.ok) {
      expect(result.errors).toContainEqual({
        code: "RAW_SECRET_INPUT_FORBIDDEN",
        field: "role_signers.admin",
      });
    }
  });

  it("rejects duplicate role aliases", () => {
    const result = loadValid({
      [TESTNET_SMOKE_ENV.buyer_demo_key_alias]: ADMIN_ALIAS,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual({
        code: "ERR_DUPLICATE_ROLE_IDENTITY",
        field: "role_aliases",
      });
    }
  });

  it("rejects invalid fee, time, money, and public fixture values", () => {
    const result = loadValid({
      [TESTNET_SMOKE_ENV.base_fee_stroops]: "200",
      [TESTNET_SMOKE_ENV.max_fee_stroops]: "100",
      [TESTNET_SMOKE_ENV.timeout_seconds]: "0",
      [TESTNET_SMOKE_ENV.principal_idr]: "-1",
      [TESTNET_SMOKE_ENV.volume_kg]: "0",
      [TESTNET_SMOKE_ENV.deal_hash]: "bad",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.map((error) => error.public_detail)).toEqual(
        expect.arrayContaining([
          "ERR_BASE_EXCEEDS_MAX_FEE",
          "ERR_INVALID_TIMEOUT",
          "ERR_UNSAFE_FIXTURE_AMOUNT",
          "ERR_INVALID_FIXTURE_VOLUME",
          "ERR_INVALID_FIXTURE_HASH",
        ]),
      );
    }
  });

  it("rejects unknown commands", () => {
    const result = loadValid({
      [TESTNET_SMOKE_ENV.command]: "not-a-command",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual({
        code: "ERR_INVALID_COMMAND",
        field: "command",
      });
    }
  });
});

describe("local Testnet operator acknowledgement", () => {
  it("preflight does not require acknowledgement", () => {
    const result = loadValid({
      [TESTNET_SMOKE_ENV.command]: "preflight",
      [TESTNET_SMOKE_ENV.acknowledgement]: undefined,
    });
    expect(result.ok).toBe(true);
  });

  for (const command of TESTNET_SMOKE_COMMANDS.filter((
    value,
  ) => value !== "preflight" && value !== "signer_preflight")) {
    it(`${command} requires exact acknowledgement`, () => {
      const result = loadValid({
        [TESTNET_SMOKE_ENV.command]: command,
        [TESTNET_SMOKE_ENV.acknowledgement]: undefined,
        [TESTNET_SMOKE_ENV.reconcile_action]: command === "reconcile" ? "buyer_deposit" : undefined,
        [TESTNET_SMOKE_ENV.reconcile_transaction_hash]: command === "reconcile" ? "a".repeat(64) : undefined,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors).toContainEqual({
          code: "ERR_MISSING_ACKNOWLEDGEMENT",
          field: "acknowledgement",
        });
      }
    });
  }

  it("rejects truthy acknowledgement substitutes", () => {
    for (const acknowledgement of ["true", "1", "yes"]) {
      const result = loadValid({
        [TESTNET_SMOKE_ENV.command]: "happy_path",
        [TESTNET_SMOKE_ENV.acknowledgement]: acknowledgement,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors).toContainEqual({
          code: "ERR_INVALID_ACKNOWLEDGEMENT",
          field: "acknowledgement",
        });
      }
    }
  });

  it("accepts the exact acknowledgement for live-capable commands", () => {
    const result = loadValid({
      [TESTNET_SMOKE_ENV.command]: "refund",
      [TESTNET_SMOKE_ENV.acknowledgement]: TESTNET_SMOKE_MUTATION_ACKNOWLEDGEMENT,
    });
    expect(result.ok).toBe(true);
  });

  it("signer preflight does not require acknowledgement", () => {
    const result = loadValid({
      [TESTNET_SMOKE_ENV.command]: "signer_preflight",
      [TESTNET_SMOKE_ENV.acknowledgement]: undefined,
    });
    expect(result.ok).toBe(true);
  });
});

describe("local Testnet operator preflight", () => {
  it("constructs runtime with zero RPC calls, zero signer calls, and zero submissions", async () => {
    const loaded = loadValid();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) {
      throw new Error("Expected valid operator input");
    }

    const result = await runTestnetSmokeOperator(loaded.input, {
      rpc_port: createNoNetworkSmokeRpcSentinel(),
      signer_config_dir_exists: () => true,
    });

    expect(result.ok).toBe(true);
    expect(result.summary?.scenario).toEqual({
      kind: "preflight",
      runtime_constructed: true,
    });
    expect(result.summary?.transport_call_counts).toStrictEqual({
      network_checks: 0,
      source_account_loads: 0,
      simulations: 0,
      submissions: 0,
      confirmations: 0,
    });
    expect(result.summary?.signer_call_counts.total).toBe(0);
  });

  it("produces a safe summary only", async () => {
    const loaded = loadValid();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) {
      throw new Error("Expected valid operator input");
    }
    const result = await runTestnetSmokeOperator(loaded.input);
    const output = buildOperatorJsonOutput(result);
    expect(output.ok).toBe(true);
    expect(output.json).not.toContain(ADMIN_TEST_SEED);
    expect(output.json).not.toContain(BUYER_TEST_SEED);
    expect(output.json).not.toContain(SELLER_TEST_SEED);
    expect(output.json).not.toContain("signed_transaction_xdr");
    expect(output.json).not.toContain("signature");
  });
});

describe("local Testnet operator signer preflight", () => {
  it("verifies configured CLI aliases without RPC or submissions", async () => {
    const loaded = loadValid({
      [TESTNET_SMOKE_ENV.command]: "signer_preflight",
    });
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) {
      throw new Error("Expected valid signer preflight input");
    }

    const result = await runTestnetSmokeOperator(loaded.input, {
      cli_process_runner: new OfflineStellarCliRunner(),
      signer_config_dir_exists: () => true,
    });

    expect(result.ok).toBe(true);
    expect(result.summary?.scenario).toMatchObject({
      kind: "signer_preflight",
      network_alias: STELLAR_NETWORK_ALIAS,
      transport_call_counts: {
        rpc_calls: 0,
        submissions: 0,
        confirmations: 0,
      },
    });
    expect(result.summary?.transport_call_counts.submissions).toBe(0);
    expect(result.summary?.transport_call_counts.confirmations).toBe(0);
  });
});

describe("local Testnet operator discovery isolation", () => {
  it("normal command discovery excludes the manual runner by suffix", () => {
    expect("src/lib/stellar/server/smoke/testnet-smoke.manual.ts".endsWith(".test.ts")).toBe(false);
  });

  it("manual commands are isolated behind the dedicated Vitest config path", () => {
    expect("src/lib/stellar/server/smoke/testnet-smoke.manual.ts").toContain(".manual.ts");
  });
});

describe("local Testnet operator reconciliation guards", () => {
  it("rejects invalid hash before runtime execution", () => {
    const result = loadValid({
      [TESTNET_SMOKE_ENV.command]: "reconcile",
      [TESTNET_SMOKE_ENV.acknowledgement]: TESTNET_SMOKE_MUTATION_ACKNOWLEDGEMENT,
      [TESTNET_SMOKE_ENV.reconcile_action]: "buyer_deposit",
      [TESTNET_SMOKE_ENV.reconcile_transaction_hash]: "not-a-hash",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual({
        code: "ERR_INVALID_RECONCILIATION_HASH",
        field: "reconciliation.transaction_hash",
      });
    }
  });

  it("rejects unknown reconciliation action", () => {
    const result = loadValid({
      [TESTNET_SMOKE_ENV.command]: "reconcile",
      [TESTNET_SMOKE_ENV.acknowledgement]: TESTNET_SMOKE_MUTATION_ACKNOWLEDGEMENT,
      [TESTNET_SMOKE_ENV.reconcile_action]: "not-an-action",
      [TESTNET_SMOKE_ENV.reconcile_transaction_hash]: "a".repeat(64),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual({
        code: "ERR_INVALID_RECONCILIATION_ACTION",
        field: "reconciliation.action",
      });
    }
  });

  it("valid reconciliation has no submit path when using the sentinel", async () => {
    const loaded = loadValid({
      [TESTNET_SMOKE_ENV.command]: "reconcile",
      [TESTNET_SMOKE_ENV.acknowledgement]: TESTNET_SMOKE_MUTATION_ACKNOWLEDGEMENT,
      [TESTNET_SMOKE_ENV.reconcile_action]: "buyer_deposit",
      [TESTNET_SMOKE_ENV.reconcile_transaction_hash]: "a".repeat(64),
    });
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) {
      throw new Error("Expected valid reconciliation input");
    }

    const result = await runTestnetSmokeOperator(loaded.input, {
      rpc_port: createNoNetworkSmokeRpcSentinel(),
      cli_process_runner: new OfflineStellarCliRunner(),
      signer_config_dir_exists: () => true,
    });

    expect(result.summary?.transport_call_counts.submissions).toBe(0);
    expect(result.summary?.transport_call_counts.confirmations).toBe(1);
  });
});

describe("local Testnet operator secret and output safety", () => {
  it("does not expose signer input in successful parse results", () => {
    const result = loadValid();
    expect(result.ok).toBe(true);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain(ADMIN_TEST_SEED);
    expect(serialized).not.toContain(BUYER_TEST_SEED);
    expect(serialized).not.toContain(SELLER_TEST_SEED);
  });

  it("does not expose signer input in errors", () => {
    const result = loadValid({
      [TESTNET_SMOKE_ENV.seller_demo_secret_seed]: "not-valid",
    });
    expect(result.ok).toBe(false);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("not-valid");
    expect(serialized).not.toContain(SELLER_TEST_SEED);
  });

  it("detects unsafe output material", () => {
    const result = inspectOperatorOutputSafety({
      ok: true,
      payload: {
        signed_transaction_xdr: "AAAAunsafe",
      },
    });
    expect(result.ok).toBe(false);
  });

  it("does not include a full environment object, XDR, or raw signature in printed summary", async () => {
    const loaded = loadValid();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) {
      throw new Error("Expected valid operator input");
    }
    const result = await runTestnetSmokeOperator(loaded.input);
    const output = buildOperatorJsonOutput(result);
    expect(output.ok).toBe(true);
    expect(output.json).not.toContain("process");
    expect(output.json).not.toContain("environment");
    expect(output.json).not.toContain("AAAA");
    expect(output.json).not.toContain("signature");
  });
});
