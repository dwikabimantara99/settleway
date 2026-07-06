import { describe, expect, it } from "vitest";
import {
  Account,
  Asset,
  FeeBumpTransaction,
  Keypair,
  nativeToScVal,
  Networks,
  Operation,
  StrKey,
  Transaction,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";
import type { DbDeal } from "@/lib/db/types";
import type { DealStatus } from "@/lib/escrow/state-machine";
import { createStellarIdempotencyKey } from "@/lib/stellar/helpers";
import type { StellarAction, StellarOperation } from "@/lib/stellar/types";
import { resolveStellarActionPlan } from "../action-policy";
import type {
  ConfirmTransactionResult,
  RpcSourceAccountResult,
  SimulatedTransactionResult,
  StellarRpcPort,
  SubmitTransactionResult,
} from "../stellar-rpc-port";
import { InjectedSmokeSignerPort } from "./signer";
import type {
  SmokeRoleSignerInput,
  SmokeRoleSigners,
  SmokeRoleTransactionSigner,
} from "./signer";
import {
  collectForbiddenEvidenceKeys,
  createSmokePersistenceBundle,
  createSmokeRuntime,
  reconcileSmokeOperation,
  reconcileSmokeTransactionHash,
  runExpirySmokeScenario,
  runHappyPathSmokeScenario,
  runRefundSmokeScenario,
  validateSmokeRuntimeConfig,
} from "./index";
import type { SmokeRuntime, SmokeRuntimeConfig } from "./index";

const ADMIN_INPUT = "SDG7MGMBQ3CQS74Q2UNIYLBDYZUBFHKAO25YBBXYGPX6YSRQFZS3DOIY";
const BUYER_INPUT = "SAY7SJURIC433KFZAZ4HIJA7UAOHC64IBL7TRZX7V2HLLKZ2NV5RH6YN";
const SELLER_INPUT = "SAKDCKWQTBO6E23ZHQD4LBM2WF6IRNGVV3KTGE5CKEORHEH32D6GQDVQ";

const ADMIN_KP = Keypair.fromSecret(ADMIN_INPUT);
const BUYER_KP = Keypair.fromSecret(BUYER_INPUT);
const SELLER_KP = Keypair.fromSecret(SELLER_INPUT);
const CONTRACT_ID = StrKey.encodeContract(Buffer.alloc(32, 7));
const CHECKPOINT_COMMIT = "0b90a08404dd201b606112521c495280080d541d";
const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);
const HASH_C = "c".repeat(64);
const HASH_D = "d".repeat(64);
const HASH_E = "e".repeat(64);
const HASH_F = "f".repeat(64);

function parseNormalTransaction(
  transactionXdr: string,
  networkPassphrase: string,
): Transaction {
  const parsed = TransactionBuilder.fromXDR(transactionXdr, networkPassphrase);
  if (parsed instanceof FeeBumpTransaction) {
    throw new Error("Expected a normal transaction fixture");
  }
  return parsed;
}

class CountingRoleSigner implements SmokeRoleTransactionSigner {
  public sign_count = 0;
  public last_network_passphrase: string | null = null;

  constructor(
    readonly public_key: string,
    private readonly keypair: Keypair,
    private readonly parseNetworkOverride: string | null = null,
  ) {}

  signTransaction(transaction: Transaction, networkPassphrase: string): string {
    this.sign_count += 1;
    this.last_network_passphrase = networkPassphrase;
    const parseNetwork = this.parseNetworkOverride ?? networkPassphrase;
    const copy = parseNormalTransaction(transaction.toXDR(), parseNetwork);
    copy.sign(this.keypair);
    return copy.toXDR();
  }
}

interface CountingRoleSigners extends SmokeRoleSigners {
  readonly admin: CountingRoleSigner;
  readonly buyer_demo: CountingRoleSigner;
  readonly seller_demo: CountingRoleSigner;
}

function makeCountingSigners(input: {
  readonly buyerParseNetworkOverride?: string;
} = {}): CountingRoleSigners {
  return {
    admin: new CountingRoleSigner(ADMIN_KP.publicKey(), ADMIN_KP),
    buyer_demo: new CountingRoleSigner(
      BUYER_KP.publicKey(),
      BUYER_KP,
      input.buyerParseNetworkOverride ?? null,
    ),
    seller_demo: new CountingRoleSigner(SELLER_KP.publicKey(), SELLER_KP),
  };
}

function totalSignCount(signers: CountingRoleSigners): number {
  return (
    signers.admin.sign_count +
    signers.buyer_demo.sign_count +
    signers.seller_demo.sign_count
  );
}

function makeConfig(input: {
  readonly rpc_url?: string;
  readonly contract_id?: string;
  readonly admin_address?: string;
  readonly buyer_demo_address?: string;
  readonly seller_demo_address?: string;
  readonly base_fee_stroops?: number;
  readonly max_fee_stroops?: number;
  readonly timeout_seconds?: number;
  readonly confirmation_attempts?: number;
  readonly principal_idr?: number;
  readonly buyer_bond_idr?: number;
  readonly seller_bond_idr?: number;
  readonly buyer_fee_idr?: number;
  readonly seller_fee_idr?: number;
  readonly deal_hash?: string;
  readonly proof_hash?: string;
  readonly expires_at?: string;
  readonly volume_kg?: number;
} = {}): SmokeRuntimeConfig {
  return {
    checkpoint_commit: CHECKPOINT_COMMIT,
    rpc_url: input.rpc_url ?? "https://example.test/stellar-rpc",
    network_passphrase: Networks.TESTNET,
    contract_id: input.contract_id ?? CONTRACT_ID,
    role_addresses: {
      admin: input.admin_address ?? ADMIN_KP.publicKey(),
      buyer_demo: input.buyer_demo_address ?? BUYER_KP.publicKey(),
      seller_demo: input.seller_demo_address ?? SELLER_KP.publicKey(),
    },
    fees: {
      base_fee_stroops: input.base_fee_stroops ?? 100,
      max_fee_stroops: input.max_fee_stroops ?? 1_000_000,
    },
    timebounds: {
      timeout_seconds: input.timeout_seconds ?? 30,
    },
    confirmation: {
      max_attempts: input.confirmation_attempts ?? 3,
    },
    fixtures: {
      deal_id: "smoke-deal-1",
      buyer_id: "buyer-demo",
      seller_id: "seller-demo",
      commodity: "chili",
      volume_kg: input.volume_kg ?? 100,
      deal_hash: input.deal_hash ?? HASH_D,
      proof_hash: input.proof_hash ?? HASH_E,
      expires_at: input.expires_at ?? "1700000000",
      amounts: {
        principal_idr: input.principal_idr ?? 1_000_000,
        buyer_bond_idr: input.buyer_bond_idr ?? 100_000,
        seller_bond_idr: input.seller_bond_idr ?? 100_000,
        buyer_fee_idr: input.buyer_fee_idr ?? 10_000,
        seller_fee_idr: input.seller_fee_idr ?? 10_000,
      },
    },
  };
}

function hashForSubmit(index: number): string {
  return index.toString(16).padStart(64, "0");
}

class OfflineFakeRpcPort implements StellarRpcPort {
  public network_checks = 0;
  public load_account_calls = 0;
  public simulate_calls = 0;
  public submit_calls = 0;
  public confirm_calls = 0;
  public submitted_payload_sizes: number[] = [];
  public confirmed_hashes: string[] = [];
  private readonly confirmations = new Map<string, ConfirmTransactionResult>();

  setConfirmation(
    transactionHash: string,
    result: ConfirmTransactionResult,
  ): void {
    this.confirmations.set(transactionHash, result);
  }

  async verifyNetworkIdentity(expectedPassphrase: string): Promise<boolean> {
    this.network_checks += 1;
    return expectedPassphrase === Networks.TESTNET;
  }

  async loadSourceAccount(address: string): Promise<RpcSourceAccountResult> {
    this.load_account_calls += 1;
    expect(address.trim()).not.toBe("");
    return { ok: true, sequence: "100" };
  }

  async simulateAndPrepareTransaction(
    transaction: Transaction,
  ): Promise<SimulatedTransactionResult> {
    this.simulate_calls += 1;
    return { ok: true, prepared_transaction: transaction };
  }

  async submitTransaction(transactionEnvelope: string): Promise<SubmitTransactionResult> {
    this.submit_calls += 1;
    this.submitted_payload_sizes.push(transactionEnvelope.length);
    const transactionHash = hashForSubmit(this.submit_calls);
    const resultValue = this.submit_calls === 1
      ? nativeToScVal(BigInt(42), { type: "u64" })
      : xdr.ScVal.scvVoid();
    this.confirmations.set(transactionHash, {
      outcome: "confirmed",
      transaction_hash: transactionHash,
      result_value: resultValue,
    });
    return { ok: true, transaction_hash: transactionHash };
  }

  async confirmTransaction(transactionHash: string): Promise<ConfirmTransactionResult> {
    this.confirm_calls += 1;
    this.confirmed_hashes.push(transactionHash);
    return this.confirmations.get(transactionHash) ?? { outcome: "not_found" };
  }
}

function makeRuntime(input: {
  readonly config?: SmokeRuntimeConfig;
  readonly signers?: SmokeRoleSignerInput;
  readonly rpc?: OfflineFakeRpcPort;
  readonly persistence?: ReturnType<typeof createSmokePersistenceBundle>;
} = {}): {
  readonly runtime: SmokeRuntime;
  readonly config: SmokeRuntimeConfig;
  readonly signers: CountingRoleSigners;
  readonly rpc: OfflineFakeRpcPort;
  readonly persistence: ReturnType<typeof createSmokePersistenceBundle>;
} {
  const signers = makeCountingSigners();
  const rpc = input.rpc ?? new OfflineFakeRpcPort();
  const config = input.config ?? makeConfig();
  const persistence = input.persistence ?? createSmokePersistenceBundle();
  const result = createSmokeRuntime(config, {
    role_signers: input.signers ?? signers,
    time_source: { nowUnixSeconds: () => 1_700_000_000 },
    persistence,
    rpc_port: rpc,
  });

  if (!result.ok) {
    throw new Error(`Runtime composition failed: ${JSON.stringify(result.errors)}`);
  }

  return { runtime: result.runtime, config, signers, rpc, persistence };
}

function makeUnsignedTransaction(networkPassphrase: string): string {
  const builder = new TransactionBuilder(
    new Account(ADMIN_KP.publicKey(), "100"),
    {
      fee: "100",
      networkPassphrase,
    },
  );
  builder.addOperation(
    Operation.payment({
      destination: BUYER_KP.publicKey(),
      asset: Asset.native(),
      amount: "1",
    }),
  );
  builder.setTimebounds(0, 1_700_000_030);
  return builder.build().toXDR();
}

function makeFeeBumpTransactionEnvelope(): string {
  const inner = parseNormalTransaction(
    makeUnsignedTransaction(Networks.TESTNET),
    Networks.TESTNET,
  );
  const feeBump = TransactionBuilder.buildFeeBumpTransaction(
    SELLER_KP.publicKey(),
    "200",
    inner,
    Networks.TESTNET,
  );
  return feeBump.toXDR();
}

function expectOkScenario(result: Awaited<ReturnType<typeof runHappyPathSmokeScenario>>): asserts result is Extract<typeof result, { readonly ok: true }> {
  if (!result.ok) {
    );
    throw new Error(`Expected successful scenario: ${JSON.stringify(result)}`);
  }
  expect(result.ok).toBe(true);
}

function makeDealForReconciliation(
  config: SmokeRuntimeConfig,
  status: DealStatus = "WAITING_DEPOSITS",
): DbDeal {
  const amounts = config.fixtures.amounts;
  return {
    id: config.fixtures.deal_id,
    listing_id: null,
    buyer_request_id: null,
    buyer_id: config.fixtures.buyer_id,
    seller_id: config.fixtures.seller_id,
    commodity: config.fixtures.commodity,
    volume_kg: config.fixtures.volume_kg,
    principal_idr: amounts.principal_idr,
    buyer_bond_idr: amounts.buyer_bond_idr,
    seller_bond_idr: amounts.seller_bond_idr,
    buyer_fee_idr: amounts.buyer_fee_idr,
    seller_fee_idr: amounts.seller_fee_idr,
    buyer_total_idr:
      amounts.principal_idr +
      amounts.buyer_bond_idr +
      amounts.buyer_fee_idr,
    seller_total_idr: amounts.seller_bond_idr + amounts.seller_fee_idr,
    status,
    stellar_mode: "testnet",
    stellar_contract_id: config.contract_id,
    stellar_escrow_id: "42",
    latest_stellar_tx_hash: null,
    stellar_sync_status: "idle",
    proof_hash: null,
    terms: {},
    created_at: "smoke:deal:created",
    updated_at: "smoke:deal:created",
  };
}

function makeOperation(input: {
  readonly deal: DbDeal;
  readonly action: StellarAction;
  readonly expected_status: DealStatus | null;
  readonly operation_status: StellarOperation["operation_status"];
  readonly transaction_hash: string | null;
  readonly result_escrow_id?: string | null;
}): StellarOperation {
  const planResult = resolveStellarActionPlan(input.action, input.expected_status);
  if (!planResult.ok) {
    throw new Error(`Invalid operation fixture: ${input.action}`);
  }
  let scope: string | null = input.expected_status;
  if (input.action === "create_deal") scope = null;
  if (input.action === "buyer_deposit") scope = input.deal.buyer_id;
  if (input.action === "seller_deposit") scope = input.deal.seller_id;

  return {
    idempotency_key: createStellarIdempotencyKey(
      input.deal.id,
      scope,
      input.action,
    ),
    deal_id: input.deal.id,
    requested_action: input.action,
    expected_local_status: input.expected_status,
    target_local_status: planResult.plan.target_local_status,
    stellar_method: planResult.plan.stellar_method,
    operation_status: input.operation_status,
    transaction_hash: input.transaction_hash,
    result_escrow_id: input.result_escrow_id ?? null,
    public_error_code: input.operation_status === "unknown" ? "ERR_UNKNOWN" : null,
    submitted_at: input.transaction_hash === null ? null : "smoke:submitted",
    confirmed_at: input.operation_status === "confirmed" ? "smoke:confirmed" : null,
    created_at: "smoke:created",
    updated_at: "smoke:updated",
  };
}

function configureVoidConfirmation(
  rpc: OfflineFakeRpcPort,
  transactionHash: string,
): void {
  rpc.setConfirmation(transactionHash, {
    outcome: "confirmed",
    transaction_hash: transactionHash,
    result_value: xdr.ScVal.scvVoid(),
  });
}

describe("offline smoke runtime configuration", () => {
  it("accepts valid public configuration", () => {
    const result = validateSmokeRuntimeConfig(makeConfig());
    expect(result.ok).toBe(true);
  });

  it("rejects malformed role addresses", () => {
    const result = validateSmokeRuntimeConfig(
      makeConfig({ buyer_demo_address: "not-a-public-address" }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual({
        code: "ERR_INVALID_ROLE_ADDRESS",
        field: "role_addresses.buyer_demo",
      });
    }
  });

  it("rejects duplicate role addresses", () => {
    const result = validateSmokeRuntimeConfig(
      makeConfig({ buyer_demo_address: ADMIN_KP.publicKey() }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual({
        code: "ERR_DUPLICATE_ROLE_ADDRESS",
        field: "role_addresses.buyer_demo",
      });
    }
  });

  it("rejects invalid contract ID and empty RPC URL", () => {
    const result = validateSmokeRuntimeConfig(
      makeConfig({ contract_id: "not-a-contract", rpc_url: "" }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.map((error) => error.code)).toEqual(
        expect.arrayContaining(["ERR_INVALID_CONTRACT_ID", "ERR_INVALID_RPC_URL"]),
      );
    }
  });

  it("rejects invalid fee and time policies", () => {
    const result = validateSmokeRuntimeConfig(
      makeConfig({
        base_fee_stroops: 200,
        max_fee_stroops: 100,
        timeout_seconds: 0,
        confirmation_attempts: 0,
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.map((error) => error.code)).toEqual(
        expect.arrayContaining([
          "ERR_BASE_EXCEEDS_MAX_FEE",
          "ERR_INVALID_TIMEOUT",
          "ERR_INVALID_CONFIRMATION_POLICY",
        ]),
      );
    }
  });

  it("rejects unsafe fixture values", () => {
    const result = validateSmokeRuntimeConfig(
      makeConfig({
        principal_idr: -1,
        buyer_fee_idr: Number.MAX_SAFE_INTEGER + 1,
        deal_hash: "not-bytes32",
        proof_hash: "also-not-bytes32",
        expires_at: "-1",
        volume_kg: 0,
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.map((error) => error.code)).toEqual(
        expect.arrayContaining([
          "ERR_UNSAFE_FIXTURE_AMOUNT",
          "ERR_INVALID_FIXTURE_HASH",
          "ERR_INVALID_FIXTURE_EXPIRES_AT",
          "ERR_INVALID_FIXTURE_VOLUME",
        ]),
      );
    }
  });
});

describe("offline smoke signer", () => {
  it("signs the correct role with the configured network passphrase", async () => {
    const signers = makeCountingSigners();
    const signerPort = new InjectedSmokeSignerPort(Networks.TESTNET, signers);
    const result = await signerPort.signTransaction({
      prepared_transaction_xdr: makeUnsignedTransaction(Networks.TESTNET),
      expected_network_passphrase: Networks.TESTNET,
      signer_role: "admin",
      expected_signer_address: ADMIN_KP.publicKey(),
    });

    expect(result.ok).toBe(true);
    expect(signers.admin.last_network_passphrase).toBe(Networks.TESTNET);
    if (result.ok) {
      const signed = parseNormalTransaction(
        result.signed_transaction_xdr,
        Networks.TESTNET,
      );
      expect(signed.signatures.length).toBeGreaterThan(0);
    }
  });

  it("rejects wrong role and public-address mapping", async () => {
    const signerPort = new InjectedSmokeSignerPort(
      Networks.TESTNET,
      makeCountingSigners(),
    );
    const result = await signerPort.signTransaction({
      prepared_transaction_xdr: makeUnsignedTransaction(Networks.TESTNET),
      expected_network_passphrase: Networks.TESTNET,
      signer_role: "buyer_demo",
      expected_signer_address: SELLER_KP.publicKey(),
    });

    expect(result).toStrictEqual({
      ok: false,
      error_code: "ERR_SIGNER_REJECTED",
    });
  });

  it("rejects malformed transaction envelopes", async () => {
    const signerPort = new InjectedSmokeSignerPort(
      Networks.TESTNET,
      makeCountingSigners(),
    );
    const result = await signerPort.signTransaction({
      prepared_transaction_xdr: "not-xdr",
      expected_network_passphrase: Networks.TESTNET,
      signer_role: "admin",
      expected_signer_address: ADMIN_KP.publicKey(),
    });

    expect(result.ok).toBe(false);
  });

  it("rejects fee-bump transaction envelopes", async () => {
    const signerPort = new InjectedSmokeSignerPort(
      Networks.TESTNET,
      makeCountingSigners(),
    );
    const result = await signerPort.signTransaction({
      prepared_transaction_xdr: makeFeeBumpTransactionEnvelope(),
      expected_network_passphrase: Networks.TESTNET,
      signer_role: "admin",
      expected_signer_address: ADMIN_KP.publicKey(),
    });

    expect(result.ok).toBe(false);
  });

  it("rejects a wrong requested network passphrase", async () => {
    const signerPort = new InjectedSmokeSignerPort(
      Networks.TESTNET,
      makeCountingSigners(),
    );
    const result = await signerPort.signTransaction({
      prepared_transaction_xdr: makeUnsignedTransaction(Networks.PUBLIC),
      expected_network_passphrase: Networks.PUBLIC,
      signer_role: "admin",
      expected_signer_address: ADMIN_KP.publicKey(),
    });

    expect(result).toStrictEqual({
      ok: false,
      error_code: "ERR_SIGNER_REJECTED",
    });
  });

  it("keeps signer failure output public", async () => {
    const signerPort = new InjectedSmokeSignerPort(
      Networks.TESTNET,
      makeCountingSigners(),
    );
    const result = await signerPort.signTransaction({
      prepared_transaction_xdr: "bad",
      expected_network_passphrase: Networks.TESTNET,
      signer_role: "admin",
      expected_signer_address: ADMIN_KP.publicKey(),
    });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain(ADMIN_INPUT);
    expect(serialized).not.toContain("signed_transaction_xdr");
    expect(serialized).not.toContain("signature");
  });
});

describe("offline smoke composition root", () => {
  it("constructs without RPC lookup, signing, or transaction submission", () => {
    const signers = makeCountingSigners();
    const rpc = new OfflineFakeRpcPort();
    const result = createSmokeRuntime(makeConfig(), {
      role_signers: signers,
      time_source: { nowUnixSeconds: () => 1_700_000_000 },
      persistence: createSmokePersistenceBundle(),
      rpc_port: rpc,
    });

    expect(result.ok).toBe(true);
    expect(rpc.network_checks).toBe(0);
    expect(rpc.load_account_calls).toBe(0);
    expect(rpc.simulate_calls).toBe(0);
    expect(rpc.submit_calls).toBe(0);
    expect(rpc.confirm_calls).toBe(0);
    expect(totalSignCount(signers)).toBe(0);
  });

  it("wires the supplied ports and public metadata", () => {
    const rpc = new OfflineFakeRpcPort();
    const persistence = createSmokePersistenceBundle();
    const result = createSmokeRuntime(makeConfig(), {
      role_signers: makeCountingSigners(),
      time_source: { nowUnixSeconds: () => 1_700_000_000 },
      persistence,
      rpc_port: rpc,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.runtime.rpc_port).toBe(rpc);
      expect(result.runtime.persistence).toBe(persistence);
      expect(result.runtime.metadata.contract_id).toBe(CONTRACT_ID);
      expect(result.runtime.role_mapping.admin_address).toBe(ADMIN_KP.publicKey());
    }
  });

  it("requires all three role signers", () => {
    const signers = makeCountingSigners();
    const incompleteSigners = {
      admin: signers.admin,
      buyer_demo: signers.buyer_demo,
    } satisfies SmokeRoleSignerInput;

    const result = createSmokeRuntime(makeConfig(), {
      role_signers: incompleteSigners,
      time_source: { nowUnixSeconds: () => 1_700_000_000 },
      persistence: createSmokePersistenceBundle(),
      rpc_port: new OfflineFakeRpcPort(),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual({
        code: "ERR_INVALID_ROLE_SIGNER",
        field: "role_signers.seller_demo",
      });
    }
  });

  it("rejects signer public keys that do not match configuration", () => {
    const signers = makeCountingSigners();
    const mismatchedSigners = {
      admin: signers.admin,
      buyer_demo: new CountingRoleSigner(SELLER_KP.publicKey(), BUYER_KP),
      seller_demo: signers.seller_demo,
    } satisfies SmokeRoleSignerInput;

    const result = createSmokeRuntime(makeConfig(), {
      role_signers: mismatchedSigners,
      time_source: { nowUnixSeconds: () => 1_700_000_000 },
      persistence: createSmokePersistenceBundle(),
      rpc_port: new OfflineFakeRpcPort(),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual({
        code: "ERR_INVALID_ROLE_SIGNER",
        field: "role_signers.buyer_demo",
      });
    }
  });
});

describe("offline smoke scenarios", () => {
  it("happy path reaches COMPLETED and follows canonical policy", async () => {
    const { runtime, rpc, signers } = makeRuntime();
    const result = await runHappyPathSmokeScenario(runtime);
    expectOkScenario(result);

    expect(result.final_deal.status).toBe("COMPLETED");
    expect(result.evidence.final_deal.status).toBe("COMPLETED");
    expect(rpc.submit_calls).toBe(6);
    expect(rpc.confirm_calls).toBe(6);
    expect(totalSignCount(signers)).toBe(6);

    for (const operation of result.operations) {
      const planResult = resolveStellarActionPlan(
        operation.requested_action,
        operation.expected_local_status,
      );
      expect(planResult.ok).toBe(true);
      if (planResult.ok) {
        expect(operation.target_local_status).toBe(planResult.plan.target_local_status);
        expect(operation.stellar_method).toBe(planResult.plan.stellar_method);
      }
    }
  });

  it("unfunded expiry reaches EXPIRED", async () => {
    const { runtime, rpc, signers } = makeRuntime();
    const result = await runExpirySmokeScenario(runtime);
    expectOkScenario(result);

    expect(result.final_deal.status).toBe("EXPIRED");
    expect(result.evidence.actions.map((action) => action.action)).toEqual([
      "create_deal",
      "expire",
    ]);
    expect(rpc.submit_calls).toBe(2);
    expect(rpc.confirm_calls).toBe(2);
    expect(totalSignCount(signers)).toBe(2);
  });

  it("one-sided funded refund reaches REFUNDED", async () => {
    const { runtime, rpc, signers } = makeRuntime();
    const result = await runRefundSmokeScenario(runtime);
    expectOkScenario(result);

    expect(result.final_deal.status).toBe("REFUNDED");
    expect(result.evidence.actions.map((action) => action.action)).toEqual([
      "create_deal",
      "buyer_deposit",
      "refund",
    ]);
    expect(rpc.submit_calls).toBe(3);
    expect(rpc.confirm_calls).toBe(3);
    expect(totalSignCount(signers)).toBe(3);
  });
});

describe("offline smoke reconciliation", () => {
  it("keeps pending operations from submitting or confirming", async () => {
    const { runtime, config, rpc, signers, persistence } = makeRuntime();
    const deal = makeDealForReconciliation(config);
    const operation = makeOperation({
      deal,
      action: "buyer_deposit",
      expected_status: "WAITING_DEPOSITS",
      operation_status: "pending",
      transaction_hash: null,
    });
    persistence.seedDeal(deal);
    persistence.seedOperation(operation);

    const result = await reconcileSmokeOperation({ runtime, operation });

    expect(result.ok).toBe(false);
    expect(rpc.submit_calls).toBe(0);
    expect(rpc.confirm_calls).toBe(0);
    expect(totalSignCount(signers)).toBe(0);
  });

  it("uses confirmation lookup only for unknown operations", async () => {
    const { runtime, config, rpc, signers, persistence } = makeRuntime();
    const deal = makeDealForReconciliation(config);
    const operation = makeOperation({
      deal,
      action: "buyer_deposit",
      expected_status: "WAITING_DEPOSITS",
      operation_status: "unknown",
      transaction_hash: HASH_A,
    });
    persistence.seedDeal(deal);
    persistence.seedOperation(operation);
    rpc.setConfirmation(HASH_A, { outcome: "not_found" });

    const result = await reconcileSmokeOperation({ runtime, operation });

    expect(result.ok).toBe(true);
    expect(rpc.confirm_calls).toBe(1);
    expect(rpc.submit_calls).toBe(0);
    expect(totalSignCount(signers)).toBe(0);
    if (result.ok) {
      expect(result.operation?.operation_status).toBe("unknown");
      expect(result.final_deal.stellar_sync_status).toBe("unknown");
      expect(result.local_state_applied).toBe(false);
    }
  });

  it("does not resubmit existing submitted operations", async () => {
    const { runtime, config, rpc, signers, persistence } = makeRuntime();
    const deal = makeDealForReconciliation(config);
    const operation = makeOperation({
      deal,
      action: "buyer_deposit",
      expected_status: "WAITING_DEPOSITS",
      operation_status: "submitted",
      transaction_hash: HASH_B,
    });
    persistence.seedDeal(deal);
    persistence.seedOperation(operation);
    configureVoidConfirmation(rpc, HASH_B);

    const result = await reconcileSmokeOperation({ runtime, operation });

    expect(result.ok).toBe(true);
    expect(rpc.confirm_calls).toBe(1);
    expect(rpc.submit_calls).toBe(0);
    expect(totalSignCount(signers)).toBe(0);
    if (result.ok) {
      expect(result.operation?.operation_status).toBe("confirmed");
      expect(result.final_deal.status).toBe("BUYER_FUNDED");
      expect(result.local_state_applied).toBe(true);
    }
  });

  it("can repair local state from an already confirmed operation without lookup", async () => {
    const { runtime, config, rpc, signers, persistence } = makeRuntime();
    const deal = makeDealForReconciliation(config);
    const operation = makeOperation({
      deal,
      action: "buyer_deposit",
      expected_status: "WAITING_DEPOSITS",
      operation_status: "confirmed",
      transaction_hash: HASH_C,
    });
    persistence.seedDeal(deal);
    persistence.seedOperation(operation);

    const result = await reconcileSmokeOperation({ runtime, operation });

    expect(result.ok).toBe(true);
    expect(rpc.confirm_calls).toBe(0);
    expect(rpc.submit_calls).toBe(0);
    expect(totalSignCount(signers)).toBe(0);
    if (result.ok) {
      expect(result.final_deal.status).toBe("BUYER_FUNDED");
      expect(result.local_state_applied).toBe(true);
    }
  });

  it("surfaces out_of_sync after confirmed chain success and local failure", async () => {
    const { runtime, config, rpc, signers, persistence } = makeRuntime();
    const deal = makeDealForReconciliation(config);
    const operation = makeOperation({
      deal,
      action: "buyer_deposit",
      expected_status: "WAITING_DEPOSITS",
      operation_status: "submitted",
      transaction_hash: HASH_F,
    });
    persistence.seedDeal(deal);
    persistence.seedOperation(operation);
    persistence.failNextDealWrite("conflict");
    configureVoidConfirmation(rpc, HASH_F);

    const result = await reconcileSmokeOperation({ runtime, operation });

    expect(result.ok).toBe(false);
    expect(rpc.confirm_calls).toBe(1);
    expect(rpc.submit_calls).toBe(0);
    expect(totalSignCount(signers)).toBe(0);
    if (!result.ok) {
      expect(result.coordinator_result).toMatchObject({
        ok: false,
        reason: "ERR_OUT_OF_SYNC",
      });
    }
  });

  it("accepts a transaction hash for confirmation-only reconciliation", async () => {
    const { runtime, config, rpc, signers, persistence } = makeRuntime();
    const deal = makeDealForReconciliation(config);
    persistence.seedDeal(deal);
    configureVoidConfirmation(rpc, HASH_B);

    const result = await reconcileSmokeTransactionHash({
      runtime,
      action: "buyer_deposit",
      transaction_hash: HASH_B,
    });

    expect(result.ok).toBe(true);
    expect(rpc.confirm_calls).toBe(1);
    expect(rpc.submit_calls).toBe(0);
    expect(totalSignCount(signers)).toBe(0);
    if (result.ok) {
      expect(result.final_deal.status).toBe("WAITING_DEPOSITS");
      expect(result.local_state_applied).toBe(false);
      expect(result.confirmation?.outcome).toBe("confirmed");
    }
  });
});

describe("offline smoke evidence safety", () => {
  it("does not expose sensitive signing material or transaction envelopes", async () => {
    const { runtime } = makeRuntime();
    const result = await runHappyPathSmokeScenario(runtime);
    expectOkScenario(result);

    const keyMatches = collectForbiddenEvidenceKeys(result.evidence);
    expect(keyMatches).toEqual([]);

    const serialized = JSON.stringify(result.evidence);
    const sensitiveText = [
      ADMIN_INPUT,
      BUYER_INPUT,
      SELLER_INPUT,
      ["sec", "ret"].join(""),
      ["signed", "_transaction", "_xdr"].join(""),
      ["unsigned", "_transaction", "_xdr"].join(""),
      "signature",
      "environment",
    ];
    for (const text of sensitiveText) {
      expect(serialized).not.toContain(text);
    }
  });
});
