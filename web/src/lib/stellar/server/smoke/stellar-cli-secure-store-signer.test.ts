import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import {
  Account,
  Asset,
  FeeBumpTransaction,
  Keypair,
  Networks,
  Operation,
  Transaction,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { describe, expect, it } from "vitest";
import type { StellarSignerRole } from "../action-policy";
import type {
  StellarCliChildProcess,
  StellarCliProcessRequest,
  StellarCliProcessResult,
  StellarCliProcessRunner,
  StellarCliSpawnOptions,
} from "./stellar-cli-process-port";
import { NodeStellarCliProcessRunner } from "./stellar-cli-process-port";
import {
  runStellarCliSecureStoreSignerPreflight,
  StellarCliSecureStoreSigner,
} from "./stellar-cli-secure-store-signer";
import type {
  StellarCliSecureStoreSignerConfig,
} from "./stellar-cli-secure-store-signer";

const ADMIN_SECRET = "SDG7MGMBQ3CQS74Q2UNIYLBDYZUBFHKAO25YBBXYGPX6YSRQFZS3DOIY";
const BUYER_SECRET = "SAY7SJURIC433KFZAZ4HIJA7UAOHC64IBL7TRZX7V2HLLKZ2NV5RH6YN";
const SELLER_SECRET = "SAKDCKWQTBO6E23ZHQD4LBM2WF6IRNGVV3KTGE5CKEORHEH32D6GQDVQ";
const ADMIN_KP = Keypair.fromSecret(ADMIN_SECRET);
const BUYER_KP = Keypair.fromSecret(BUYER_SECRET);
const SELLER_KP = Keypair.fromSecret(SELLER_SECRET);

const ROLE_KEYPAIRS: Readonly<Record<StellarSignerRole, Keypair>> = {
  admin: ADMIN_KP,
  buyer_demo: BUYER_KP,
  seller_demo: SELLER_KP,
};

const ROLE_ALIASES: Readonly<Record<StellarSignerRole, string>> = {
  admin: "settleway-testnet-admin",
  buyer_demo: "settleway-testnet-buyer-demo",
  seller_demo: "settleway-testnet-seller-demo",
};

const PUBLIC_ADDRESSES: Readonly<Record<StellarSignerRole, string>> = {
  admin: ADMIN_KP.publicKey(),
  buyer_demo: BUYER_KP.publicKey(),
  seller_demo: SELLER_KP.publicKey(),
};

function roleForAlias(alias: string): StellarSignerRole | null {
  if (alias === ROLE_ALIASES.admin) return "admin";
  if (alias === ROLE_ALIASES.buyer_demo) return "buyer_demo";
  if (alias === ROLE_ALIASES.seller_demo) return "seller_demo";
  return null;
}

function parseNormalTransaction(
  transactionXdr: string,
  networkPassphrase: string,
): Transaction {
  const parsed = TransactionBuilder.fromXDR(transactionXdr, networkPassphrase);
  if (parsed instanceof FeeBumpTransaction) {
    throw new Error("Expected normal transaction");
  }
  return parsed;
}

function makeUnsignedTransaction(input: {
  readonly sourceAddress?: string;
  readonly destination?: string;
  readonly networkPassphrase?: string;
} = {}): string {
  const source = input.sourceAddress ?? PUBLIC_ADDRESSES.admin;
  const destination = input.destination ?? PUBLIC_ADDRESSES.buyer_demo;
  const builder = new TransactionBuilder(new Account(source, "100"), {
    fee: "100",
    networkPassphrase: input.networkPassphrase ?? Networks.TESTNET,
  });
  builder.addOperation(
    Operation.payment({
      destination,
      asset: Asset.native(),
      amount: "1",
    }),
  );
  builder.setTimebounds(0, 1);
  return builder.build().toXDR();
}

function mutateTransactionBody(transactionXdr: string): string {
  const transaction = parseNormalTransaction(transactionXdr, Networks.TESTNET);
  const builder = new TransactionBuilder(
    new Account(transaction.source, transaction.sequence),
    {
      fee: "200",
      networkPassphrase: Networks.TESTNET,
    },
  );
  builder.addOperation(
    Operation.payment({
      destination: PUBLIC_ADDRESSES.buyer_demo,
      asset: Asset.native(),
      amount: "1",
    }),
  );
  builder.setTimebounds(0, 1);
  const mutated = builder.build();
  mutated.sign(ADMIN_KP);
  return mutated.toXDR();
}

function makeFeeBumpXdr(transactionXdr: string): string {
  const inner = parseNormalTransaction(transactionXdr, Networks.TESTNET);
  return TransactionBuilder.buildFeeBumpTransaction(
    PUBLIC_ADDRESSES.seller_demo,
    "200",
    inner,
    Networks.TESTNET,
  ).toXDR();
}

function makeConfig(
  overrides: Partial<StellarCliSecureStoreSignerConfig> = {},
): StellarCliSecureStoreSignerConfig {
  return {
    stellar_cli_path: "C:\\Users\\ACER\\.cargo\\bin\\stellar.exe",
    config_dir: "C:\\Users\\ACER\\AppData\\Local\\Settleway\\stellar-testnet-smoke",
    network_alias: "settleway-testnet",
    role_aliases: {
      admin: ROLE_ALIASES.admin,
      buyer_demo: ROLE_ALIASES.buyer_demo,
      seller_demo: ROLE_ALIASES.seller_demo,
    },
    public_addresses: {
      admin: PUBLIC_ADDRESSES.admin,
      buyer_demo: PUBLIC_ADDRESSES.buyer_demo,
      seller_demo: PUBLIC_ADDRESSES.seller_demo,
    },
    config_dir_exists: () => true,
    ...overrides,
  };
}

class FakeStellarCliRunner implements StellarCliProcessRunner {
  readonly requests: StellarCliProcessRequest[] = [];
  readonly stdoutOverrides: string[] = [];
  exitCode = 0;
  timedOut = false;
  stdoutTruncated = false;
  stderrTruncated = false;

  async run(request: StellarCliProcessRequest): Promise<StellarCliProcessResult> {
    this.requests.push(request);
    const override = this.stdoutOverrides.shift();
    if (override !== undefined) {
      return this.result(override);
    }

    if (request.args[0] === "keys") {
      const alias = request.args[4] ?? "";
      const role = roleForAlias(alias);
      return this.result(role === null ? "" : `${PUBLIC_ADDRESSES[role]}\n`);
    }

    const alias = request.args[7] ?? "";
    const role = roleForAlias(alias);
    if (role === null) {
      return this.result("");
    }
    const transaction = parseNormalTransaction(request.stdin_text, Networks.TESTNET);
    transaction.sign(ROLE_KEYPAIRS[role]);
    return this.result(`${transaction.toXDR()}\n`);
  }

  result(stdout: string): StellarCliProcessResult {
    return {
      exit_code: this.exitCode,
      stdout,
      stderr: "not exposed",
      timed_out: this.timedOut,
      stdout_truncated: this.stdoutTruncated,
      stderr_truncated: this.stderrTruncated,
    };
  }
}

class FakeChildProcess extends EventEmitter implements StellarCliChildProcess {
  readonly stdin = new PassThrough();
  readonly stdout = new PassThrough();
  readonly stderr = new PassThrough();
  killCount = 0;

  kill(): boolean {
    this.killCount += 1;
    this.stdout.end();
    this.stderr.end();
    this.emit("close", null, "SIGTERM");
    return true;
  }

  close(exitCode: number | null): void {
    this.emit("close", exitCode, null);
  }
}

describe("Stellar CLI process runner", () => {
  it("spawns without a shell, writes the transaction through stdin, and bounds output", async () => {
    const previousSmokeEnv = process.env.SETTLEWAY_SMOKE_ADMIN_SECRET_SEED;
    const previousVitestEnv = process.env.VITEST;
    process.env.SETTLEWAY_SMOKE_ADMIN_SECRET_SEED = ADMIN_SECRET;
    process.env.VITEST = "true";
    let maskedDuringSpawn = false;
    const children: FakeChildProcess[] = [];
    const invocations: {
      readonly command: string;
      readonly args: readonly string[];
      readonly options: StellarCliSpawnOptions;
    }[] = [];
    const runner = new NodeStellarCliProcessRunner((command, args, options) => {
      maskedDuringSpawn =
        process.env.SETTLEWAY_SMOKE_ADMIN_SECRET_SEED === undefined &&
        process.env.VITEST === undefined;
      const child = new FakeChildProcess();
      children.push(child);
      invocations.push({ command, args, options });
      child.stdin.on("finish", () => {
        child.stdout.end("signed-xdr");
        child.stderr.end("stderr");
        child.close(0);
      });
      return child;
    });

    const result = await runner.run({
      executable_path: "C:\\stellar.exe",
      args: ["tx", "sign", "--sign-with-key", "alias"],
      stdin_text: "AAAAunsigned",
      timeout_ms: 100,
      max_stdout_bytes: 20,
      max_stderr_bytes: 20,
    });

    expect(result).toMatchObject({
      exit_code: 0,
      stdout: "signed-xdr",
      stderr: "stderr",
      timed_out: false,
    });
    expect(invocations[0]?.options.shell).toBe(false);
    expect(invocations[0]?.options.windowsHide).toBe(true);
    expect(maskedDuringSpawn).toBe(true);
    expect(invocations[0]?.args).not.toContain("AAAAunsigned");
    expect(children[0]?.killCount).toBe(0);
    if (previousSmokeEnv === undefined) {
      delete process.env.SETTLEWAY_SMOKE_ADMIN_SECRET_SEED;
    } else {
      process.env.SETTLEWAY_SMOKE_ADMIN_SECRET_SEED = previousSmokeEnv;
    }
    if (previousVitestEnv === undefined) {
      delete process.env.VITEST;
    } else {
      process.env.VITEST = previousVitestEnv;
    }
  });

  it("times out a stuck child without leaking output", async () => {
    const children: FakeChildProcess[] = [];
    const runner = new NodeStellarCliProcessRunner(() => {
      const child = new FakeChildProcess();
      children.push(child);
      return child;
    });

    const result = await runner.run({
      executable_path: "C:\\stellar.exe",
      args: ["tx", "sign"],
      stdin_text: "AAAAunsigned",
      timeout_ms: 1,
      max_stdout_bytes: 20,
      max_stderr_bytes: 20,
    });

    expect(result.timed_out).toBe(true);
    expect(result.exit_code).toBeNull();
    expect(children[0]?.killCount).toBe(1);
  });
});

describe("Stellar CLI secure-store signer", () => {
  it("signs through stdin using the configured alias and verifies the result", async () => {
    const runner = new FakeStellarCliRunner();
    const signer = new StellarCliSecureStoreSigner(makeConfig({ process_runner: runner }));
    const unsignedXdr = makeUnsignedTransaction();

    const result = await signer.signTransaction({
      prepared_transaction_xdr: unsignedXdr,
      expected_network_passphrase: Networks.TESTNET,
      signer_role: "admin",
      expected_signer_address: PUBLIC_ADDRESSES.admin,
    });

    expect(result.ok).toBe(true);
    expect(runner.requests[0]?.args).toEqual([
      "tx",
      "sign",
      "--config-dir",
      "C:\\Users\\ACER\\AppData\\Local\\Settleway\\stellar-testnet-smoke",
      "--network",
      "settleway-testnet",
      "--sign-with-key",
      ROLE_ALIASES.admin,
    ]);
    expect(runner.requests[0]?.stdin_text).toBe(unsignedXdr);
    expect(runner.requests[0]?.args).not.toContain(unsignedXdr);
  });

  it("verifies identity aliases with public-key lookup", async () => {
    const runner = new FakeStellarCliRunner();
    const signer = new StellarCliSecureStoreSigner(makeConfig({ process_runner: runner }));
    const result = await signer.verifyIdentityAlias("buyer_demo");

    expect(result).toStrictEqual({
      ok: true,
      role: "buyer_demo",
      identity_alias: ROLE_ALIASES.buyer_demo,
      public_address: PUBLIC_ADDRESSES.buyer_demo,
    });
    expect(runner.requests[0]?.args).toEqual([
      "keys",
      "public-key",
      "--config-dir",
      "C:\\Users\\ACER\\AppData\\Local\\Settleway\\stellar-testnet-smoke",
      ROLE_ALIASES.buyer_demo,
    ]);
  });

  it("rejects static signer configuration that is not local and explicit", async () => {
    const runner = new FakeStellarCliRunner();
    const signer = new StellarCliSecureStoreSigner(
      makeConfig({
        stellar_cli_path: "stellar",
        process_runner: runner,
      }),
    );

    const result = await signer.signTransaction({
      prepared_transaction_xdr: makeUnsignedTransaction(),
      expected_network_passphrase: Networks.TESTNET,
      signer_role: "admin",
      expected_signer_address: PUBLIC_ADDRESSES.admin,
    });

    expect(result).toStrictEqual({
      ok: false,
      error_code: "ERR_SIGNER_UNAVAILABLE",
    });
    expect(runner.requests).toHaveLength(0);
  });

  it("rejects duplicate aliases and raw-secret-looking aliases", async () => {
    const duplicateSigner = new StellarCliSecureStoreSigner(
      makeConfig({
        role_aliases: {
          admin: ROLE_ALIASES.admin,
          buyer_demo: ROLE_ALIASES.admin,
          seller_demo: ROLE_ALIASES.seller_demo,
        },
      }),
    );
    const secretAliasSigner = new StellarCliSecureStoreSigner(
      makeConfig({
        role_aliases: {
          admin: ADMIN_SECRET,
          buyer_demo: ROLE_ALIASES.buyer_demo,
          seller_demo: ROLE_ALIASES.seller_demo,
        },
      }),
    );

    const request = {
      prepared_transaction_xdr: makeUnsignedTransaction(),
      expected_network_passphrase: Networks.TESTNET,
      signer_role: "admin" as const,
      expected_signer_address: PUBLIC_ADDRESSES.admin,
    };

    expect(await duplicateSigner.signTransaction(request)).toStrictEqual({
      ok: false,
      error_code: "ERR_SIGNER_UNAVAILABLE",
    });
    expect(await secretAliasSigner.signTransaction(request)).toStrictEqual({
      ok: false,
      error_code: "ERR_SIGNER_UNAVAILABLE",
    });
  });

  it("rejects malformed, fee-bump, wrong role, and failed CLI output safely", async () => {
    const runner = new FakeStellarCliRunner();
    const signer = new StellarCliSecureStoreSigner(makeConfig({ process_runner: runner }));
    const baseRequest = {
      expected_network_passphrase: Networks.TESTNET,
      signer_role: "admin" as const,
      expected_signer_address: PUBLIC_ADDRESSES.admin,
    };

    expect(await signer.signTransaction({
      ...baseRequest,
      prepared_transaction_xdr: "not-xdr",
    })).toStrictEqual({ ok: false, error_code: "ERR_SIGNER_REJECTED" });
    expect(await signer.signTransaction({
      ...baseRequest,
      prepared_transaction_xdr: makeFeeBumpXdr(makeUnsignedTransaction()),
    })).toStrictEqual({ ok: false, error_code: "ERR_SIGNER_REJECTED" });
    expect(await signer.signTransaction({
      ...baseRequest,
      expected_signer_address: PUBLIC_ADDRESSES.buyer_demo,
      prepared_transaction_xdr: makeUnsignedTransaction(),
    })).toStrictEqual({ ok: false, error_code: "ERR_SIGNER_REJECTED" });

    runner.exitCode = 1;
    expect(await signer.signTransaction({
      ...baseRequest,
      prepared_transaction_xdr: makeUnsignedTransaction(),
    })).toStrictEqual({ ok: false, error_code: "ERR_SIGNER_REJECTED" });
  });

  it("rejects empty, multiline, non-XDR, mutated, fee-bump, and wrong-signer stdout", async () => {
    const runner = new FakeStellarCliRunner();
    const signer = new StellarCliSecureStoreSigner(makeConfig({ process_runner: runner }));
    const unsignedXdr = makeUnsignedTransaction();
    const wrongSignerTx = parseNormalTransaction(unsignedXdr, Networks.TESTNET);
    wrongSignerTx.sign(BUYER_KP);
    runner.stdoutOverrides.push(
      "",
      `${unsignedXdr}\n${unsignedXdr}\n`,
      "not-xdr\n",
      `${mutateTransactionBody(unsignedXdr)}\n`,
      `${makeFeeBumpXdr(unsignedXdr)}\n`,
      `${wrongSignerTx.toXDR()}\n`,
    );

    for (let index = 0; index < 6; index += 1) {
      const result = await signer.signTransaction({
        prepared_transaction_xdr: unsignedXdr,
        expected_network_passphrase: Networks.TESTNET,
        signer_role: "admin",
        expected_signer_address: PUBLIC_ADDRESSES.admin,
      });
      expect(result).toStrictEqual({
        ok: false,
        error_code: "ERR_SIGNER_REJECTED",
      });
    }
  });

  it("runs offline signer preflight without RPC, submission, or secret output", async () => {
    const runner = new FakeStellarCliRunner();
    const result = await runStellarCliSecureStoreSignerPreflight({
      config: makeConfig({ process_runner: runner }),
      network_passphrase: Networks.TESTNET,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("Expected signer preflight to pass");
    }
    expect(result.summary.command).toBe("signer_preflight");
    expect(result.summary.transport_call_counts).toStrictEqual({
      rpc_calls: 0,
      submissions: 0,
      confirmations: 0,
    });
    expect(result.summary.roles).toHaveLength(3);
    expect(JSON.stringify(result.summary)).not.toContain(ADMIN_SECRET);
    expect(JSON.stringify(result.summary)).not.toContain("AAAA");
  });
});
