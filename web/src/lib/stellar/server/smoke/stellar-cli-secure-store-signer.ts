import { existsSync, statSync } from "node:fs";
import path from "node:path";
import {
  Account,
  Asset,
  FeeBumpTransaction,
  Keypair,
  Operation,
  StrKey,
  Transaction,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import type { StellarSignerRole } from "../action-policy";
import type {
  StellarSignerPort,
  StellarSignRequest,
  StellarSignResult,
} from "../stellar-signer-port";
import {
  NodeStellarCliProcessRunner,
} from "./stellar-cli-process-port";
import type {
  StellarCliProcessRunner,
} from "./stellar-cli-process-port";

const ROLE_ORDER: readonly StellarSignerRole[] = [
  "admin",
  "buyer_demo",
  "seller_demo",
];
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_OUTPUT_BYTES = 16_384;
const ENVELOPE_PATTERN = /^[A-Za-z0-9+/=]+$/;

export interface StellarCliSecureStoreRoleAliases {
  readonly admin: string;
  readonly buyer_demo: string;
  readonly seller_demo: string;
}

export interface StellarCliSecureStorePublicAddresses {
  readonly admin: string;
  readonly buyer_demo: string;
  readonly seller_demo: string;
}

export interface StellarCliSecureStoreSignerConfig {
  readonly stellar_cli_path: string;
  readonly config_dir: string;
  readonly rpc_url: string;
  readonly network_alias: string;
  readonly role_aliases: StellarCliSecureStoreRoleAliases;
  readonly public_addresses: StellarCliSecureStorePublicAddresses;
  readonly timeout_ms?: number;
  readonly max_stdout_bytes?: number;
  readonly max_stderr_bytes?: number;
  readonly process_runner?: StellarCliProcessRunner;
  readonly config_dir_exists?: (configDir: string) => boolean;
}

export type StellarCliIdentityVerificationResult =
  | {
      readonly ok: true;
      readonly role: StellarSignerRole;
      readonly identity_alias: string;
      readonly public_address: string;
    }
  | {
      readonly ok: false;
      readonly role: StellarSignerRole;
      readonly error_code: "ERR_SIGNER_REJECTED" | "ERR_SIGNER_UNAVAILABLE";
    };

export interface StellarCliSignerPreflightRoleSummary {
  readonly role: StellarSignerRole;
  readonly identity_alias: string;
  readonly public_address: string;
  readonly body_identity_verified: true;
  readonly signature_verified: true;
}

export interface StellarCliSignerPreflightSummary {
  readonly command: "signer_preflight";
  readonly network_alias: string;
  readonly roles: readonly StellarCliSignerPreflightRoleSummary[];
  readonly transport_call_counts: {
    readonly rpc_calls: 0;
    readonly submissions: 0;
    readonly confirmations: 0;
  };
}

export type StellarCliSignerPreflightResult =
  | { readonly ok: true; readonly summary: StellarCliSignerPreflightSummary }
  | {
      readonly ok: false;
      readonly error_code: "ERR_SIGNER_REJECTED" | "ERR_SIGNER_UNAVAILABLE";
    };

function defaultConfigDirExists(configDir: string): boolean {
  try {
    return existsSync(configDir) && statSync(configDir).isDirectory();
  } catch {
    return false;
  }
}

function normalizeOptionalNumber(
  value: number | undefined,
  fallback: number,
): number {
  return Number.isSafeInteger(value) && value !== undefined && value > 0
    ? value
    : fallback;
}

function selectRoleValue<T>(
  role: StellarSignerRole,
  values: Readonly<Record<StellarSignerRole, T>>,
): T {
  switch (role) {
    case "admin":
      return values.admin;
    case "buyer_demo":
      return values.buyer_demo;
    case "seller_demo":
      return values.seller_demo;
  }
}

function isValidPublicAddress(value: string): boolean {
  return StrKey.isValidEd25519PublicKey(value);
}

function isForbiddenAliasValue(value: string): boolean {
  return value.trim() === "" || StrKey.isValidEd25519SecretSeed(value);
}

function isValidHttpsUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && parsed.hostname.trim() !== "";
  } catch {
    return false;
  }
}

function parseNormalTransaction(
  transactionXdr: string,
  networkPassphrase: string,
): Transaction | null {
  try {
    const parsed = TransactionBuilder.fromXDR(transactionXdr, networkPassphrase);
    if (parsed instanceof FeeBumpTransaction) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function transactionBodyXdr(transaction: Transaction): string | null {
  try {
    const envelope = transaction.toEnvelope();
    if (envelope.switch().name !== "envelopeTypeTx") {
      return null;
    }
    return envelope.v1().tx().toXDR("base64");
  } catch {
    return null;
  }
}

function sameTransactionBody(
  expected: Transaction,
  actual: Transaction,
): boolean {
  const expectedBody = transactionBodyXdr(expected);
  const actualBody = transactionBodyXdr(actual);
  return expectedBody !== null && expectedBody === actualBody;
}

function verifyTransactionSignature(
  transaction: Transaction,
  expectedAddress: string,
): boolean {
  if (transaction.signatures.length === 0) {
    return false;
  }

  try {
    const keypair = Keypair.fromPublicKey(expectedAddress);
    const expectedHint = Buffer.from(keypair.signatureHint());
    const hash = transaction.hash();
    return transaction.signatures.some((decoratedSignature) => {
      const hintMatches = Buffer.from(decoratedSignature.hint()).equals(expectedHint);
      return hintMatches && keypair.verify(hash, decoratedSignature.signature());
    });
  } catch {
    return false;
  }
}

function extractSingleStdoutPayload(stdout: string): string | null {
  const lines = stdout
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
  if (lines.length !== 1) {
    return null;
  }
  return lines[0] ?? null;
}

function isEnvelopeLike(value: string): boolean {
  return value !== "" && ENVELOPE_PATTERN.test(value);
}

function makeSyntheticTransaction(input: {
  readonly sourceAddress: string;
  readonly networkPassphrase: string;
}): string {
  const builder = new TransactionBuilder(
    new Account(input.sourceAddress, "1"),
    {
      fee: "100",
      networkPassphrase: input.networkPassphrase,
    },
  );
  builder.addOperation(
    Operation.payment({
      destination: input.sourceAddress,
      asset: Asset.native(),
      amount: "1",
    }),
  );
  builder.setTimebounds(0, 1);
  return builder.build().toXDR();
}

export class StellarCliSecureStoreSigner implements StellarSignerPort {
  readonly #config: StellarCliSecureStoreSignerConfig;
  readonly #runner: StellarCliProcessRunner;
  readonly #timeoutMs: number;
  readonly #maxStdoutBytes: number;
  readonly #maxStderrBytes: number;
  readonly #available: boolean;

  constructor(config: StellarCliSecureStoreSignerConfig) {
    this.#config = config;
    this.#runner = config.process_runner ?? new NodeStellarCliProcessRunner();
    this.#timeoutMs = normalizeOptionalNumber(config.timeout_ms, DEFAULT_TIMEOUT_MS);
    this.#maxStdoutBytes = normalizeOptionalNumber(
      config.max_stdout_bytes,
      DEFAULT_MAX_OUTPUT_BYTES,
    );
    this.#maxStderrBytes = normalizeOptionalNumber(
      config.max_stderr_bytes,
      DEFAULT_MAX_OUTPUT_BYTES,
    );
    this.#available = this.#validateStaticConfig();
  }

  #validateStaticConfig(): boolean {
    const configDirExists = this.#config.config_dir_exists ?? defaultConfigDirExists;
    if (!path.isAbsolute(this.#config.stellar_cli_path)) {
      return false;
    }
    if (!path.isAbsolute(this.#config.config_dir)) {
      return false;
    }
    if (!configDirExists(this.#config.config_dir)) {
      return false;
    }
    if (!isValidHttpsUrl(this.#config.rpc_url)) {
      return false;
    }
    if (this.#config.network_alias.trim() === "") {
      return false;
    }

    const aliases = ROLE_ORDER.map((role) => selectRoleValue(role, this.#config.role_aliases));
    if (aliases.some(isForbiddenAliasValue)) {
      return false;
    }
    if (new Set(aliases).size !== aliases.length) {
      return false;
    }

    const addresses = ROLE_ORDER.map((role) => (
      selectRoleValue(role, this.#config.public_addresses)
    ));
    if (!addresses.every(isValidPublicAddress)) {
      return false;
    }
    if (new Set(addresses).size !== addresses.length) {
      return false;
    }
    return true;
  }

  async verifyIdentityAlias(
    role: StellarSignerRole,
  ): Promise<StellarCliIdentityVerificationResult> {
    if (!this.#available) {
      return { ok: false, role, error_code: "ERR_SIGNER_UNAVAILABLE" };
    }

    const identityAlias = selectRoleValue(role, this.#config.role_aliases);
    const expectedAddress = selectRoleValue(role, this.#config.public_addresses);
    const result = await this.#runner.run({
      executable_path: this.#config.stellar_cli_path,
      args: [
        "keys",
        "public-key",
        "--config-dir",
        this.#config.config_dir,
        identityAlias,
      ],
      stdin_text: "",
      timeout_ms: this.#timeoutMs,
      max_stdout_bytes: this.#maxStdoutBytes,
      max_stderr_bytes: this.#maxStderrBytes,
    });

    console.log("CLI run result:", result); const payload = extractSingleStdoutPayload(result.stdout);
    if (
      result.timed_out ||
      result.exit_code !== 0 ||
      result.stdout_truncated ||
      result.stderr_truncated ||
      payload === null ||
      payload !== expectedAddress ||
      !isValidPublicAddress(payload)
    ) {
      return { ok: false, role, error_code: "ERR_SIGNER_UNAVAILABLE" };
    }

    return {
      ok: true,
      role,
      identity_alias: identityAlias,
      public_address: payload,
    };
  }

  async signTransaction(request: StellarSignRequest): Promise<StellarSignResult> {
    if (!this.#available) {
      return { ok: false, error_code: "ERR_SIGNER_UNAVAILABLE" };
    }

    const identityAlias = selectRoleValue(request.signer_role, this.#config.role_aliases);
    const expectedAddress = selectRoleValue(
      request.signer_role,
      this.#config.public_addresses,
    );
    if (
      request.expected_signer_address !== expectedAddress ||
      !isEnvelopeLike(request.prepared_transaction_xdr)
    ) {
      return { ok: false, error_code: "ERR_SIGNER_REJECTED" };
    }

    const prepared = parseNormalTransaction(
      request.prepared_transaction_xdr,
      request.expected_network_passphrase,
    );
    if (prepared === null) {
      return { ok: false, error_code: "ERR_SIGNER_REJECTED" };
    }

    const result = await this.#runner.run({
      executable_path: this.#config.stellar_cli_path,
      args: [
        "tx",
        "sign",
        "--config-dir",
        this.#config.config_dir,
        "--rpc-url",
        this.#config.rpc_url,
        "--network",
        this.#config.network_alias,
        "--network-passphrase",
        request.expected_network_passphrase,
        "--sign-with-key",
        identityAlias,
      ],
      stdin_text: request.prepared_transaction_xdr,
      timeout_ms: this.#timeoutMs,
      max_stdout_bytes: this.#maxStdoutBytes,
      max_stderr_bytes: this.#maxStderrBytes,
    });

    console.log("CLI run result:", result); const payload = extractSingleStdoutPayload(result.stdout);
    if (
      result.timed_out ||
      result.exit_code !== 0 ||
      result.stdout_truncated ||
      result.stderr_truncated ||
      payload === null ||
      !isEnvelopeLike(payload)
    ) {
      return { ok: false, error_code: "ERR_SIGNER_REJECTED" };
    }

    const signed = parseNormalTransaction(
      payload,
      request.expected_network_passphrase,
    );
    if (signed === null) {
      return { ok: false, error_code: "ERR_SIGNER_REJECTED" };
    }
    if (!sameTransactionBody(prepared, signed)) {
      return { ok: false, error_code: "ERR_SIGNER_REJECTED" };
    }
    if (!verifyTransactionSignature(signed, expectedAddress)) {
      return { ok: false, error_code: "ERR_SIGNER_REJECTED" };
    }

    return {
      ok: true,
      signed_transaction_xdr: signed.toXDR(),
    };
  }
}

export async function verifyStellarCliSecureStoreAliases(
  signer: StellarCliSecureStoreSigner,
): Promise<readonly StellarCliIdentityVerificationResult[]> {
  const results: StellarCliIdentityVerificationResult[] = [];
  for (const role of ROLE_ORDER) {
    results.push(await signer.verifyIdentityAlias(role));
  }
  return results;
}

export async function runStellarCliSecureStoreSignerPreflight(input: {
  readonly config: StellarCliSecureStoreSignerConfig;
  readonly network_passphrase: string;
}): Promise<StellarCliSignerPreflightResult> {
  const signer = new StellarCliSecureStoreSigner(input.config);
  const identityResults = await verifyStellarCliSecureStoreAliases(signer);
  if (identityResults.some((result) => !result.ok)) {
    return { ok: false, error_code: "ERR_SIGNER_UNAVAILABLE" };
  }

  const roles: StellarCliSignerPreflightRoleSummary[] = [];
  for (const role of ROLE_ORDER) {
    const identityResult = identityResults.find((result) => result.role === role);
    if (identityResult === undefined || !identityResult.ok) {
      return { ok: false, error_code: "ERR_SIGNER_UNAVAILABLE" };
    }

    const unsignedTransactionXdr = makeSyntheticTransaction({
      sourceAddress: identityResult.public_address,
      networkPassphrase: input.network_passphrase,
    });
    const signResult = await signer.signTransaction({
      prepared_transaction_xdr: unsignedTransactionXdr,
      expected_network_passphrase: input.network_passphrase,
      signer_role: role,
      expected_signer_address: identityResult.public_address,
    });
    if (!signResult.ok) {
      return { ok: false, error_code: signResult.error_code };
    }

    const unsigned = parseNormalTransaction(
      unsignedTransactionXdr,
      input.network_passphrase,
    );
    const signed = parseNormalTransaction(
      signResult.signed_transaction_xdr,
      input.network_passphrase,
    );
    if (
      unsigned === null ||
      signed === null ||
      !sameTransactionBody(unsigned, signed) ||
      !verifyTransactionSignature(signed, identityResult.public_address)
    ) {
      return { ok: false, error_code: "ERR_SIGNER_REJECTED" };
    }

    roles.push({
      role,
      identity_alias: identityResult.identity_alias,
      public_address: identityResult.public_address,
      body_identity_verified: true,
      signature_verified: true,
    });
  }

  return {
    ok: true,
    summary: {
      command: "signer_preflight",
      network_alias: input.config.network_alias,
      roles,
      transport_call_counts: {
        rpc_calls: 0,
        submissions: 0,
        confirmations: 0,
      },
    },
  };
}

