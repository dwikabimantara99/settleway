import { describe, it, expect, vi } from "vitest";
import {
  Account,
  Address,
  Asset,
  Contract,
  FeeBumpTransaction,
  Keypair,
  Memo,
  nativeToScVal,
  Networks,
  Operation,
  StrKey,
  Transaction,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";
import { StellarTestnetAdapter } from "./stellar-testnet-adapter";
import type { StellarTestnetAdapterConfig, StellarTestnetRoleMapping } from "./stellar-testnet-adapter";
import type { StellarSignerPort, StellarTimeSource } from "./stellar-signer-port";
import type {
  StellarAdapterSubmitRequest,
  StellarAdapterSubmitResult,
  StellarPreSubmitFailure,
  StellarPreparedInvocation,
} from "./adapter-contracts";
import type { StellarRpcPort } from "./stellar-rpc-port";
import type { StellarSignRequest } from "./stellar-signer-port";

// Deterministic fixed test keys derived from public fixture material.
const ADMIN_KP = Keypair.fromSecret("SDG7MGMBQ3CQS74Q2UNIYLBDYZUBFHKAO25YBBXYGPX6YSRQFZS3DOIY");
const BUYER_KP = Keypair.fromSecret("SAY7SJURIC433KFZAZ4HIJA7UAOHC64IBL7TRZX7V2HLLKZ2NV5RH6YN");
const SELLER_KP = Keypair.fromSecret("SAKDCKWQTBO6E23ZHQD4LBM2WF6IRNGVV3KTGE5CKEORHEH32D6GQDVQ");

const ADMIN_ADDR = ADMIN_KP.publicKey();
const BUYER_ADDR = BUYER_KP.publicKey();
const SELLER_ADDR = SELLER_KP.publicKey();

const TEST_CONTRACT = StrKey.encodeContract(Buffer.alloc(32, 1));

function makeConfig(overrides: Partial<StellarTestnetAdapterConfig> = {}): StellarTestnetAdapterConfig {
  return {
    network_passphrase: Networks.TESTNET,
    contract_id: TEST_CONTRACT,
    custody_contract_id: TEST_CONTRACT,
    testnet_token_contract_id: TEST_CONTRACT,
    base_fee_stroops: 100,
    max_fee_stroops: 10000000,
    timeout_seconds: 30,
    ...overrides,
  };
}

function makeRoleMapping(): StellarTestnetRoleMapping {
  return {
    admin_address: ADMIN_ADDR,
    buyer_demo_address: BUYER_ADDR,
    seller_demo_address: SELLER_ADDR,
  };
}

function makeInvocation(overrides: Partial<StellarPreparedInvocation> = {}): StellarPreparedInvocation {
  return {
    action: "buyer_deposit",
    method: "deposit_buyer",
    signer_role: "buyer_demo",
    contract_id: TEST_CONTRACT,
    arguments: [
      { kind: "u64", value: "1" },
      { kind: "address", value: BUYER_ADDR },
    ],
    ...overrides,
  };
}

function makeSubmitRequest(overrides: Partial<StellarAdapterSubmitRequest> = {}): StellarAdapterSubmitRequest {
  return {
    operation_id: "op-1",
    idempotency_key: "key-1",
    invocation: makeInvocation(),
    ...overrides,
  };
}

const ALT_CONTRACT = StrKey.encodeContract(Buffer.alloc(32, 2));

type TransactionBodyMutation =
  | "source_account"
  | "sequence"
  | "fee"
  | "time_bounds"
  | "memo"
  | "operation_count"
  | "operation_type"
  | "operation_source"
  | "contract_id"
  | "method"
  | "argument_value"
  | "argument_order"
  | "soroban_data";

function parseNormalTestTransaction(
  transactionXdr: string,
  networkPassphrase: string,
): Transaction {
  const parsed = TransactionBuilder.fromXDR(transactionXdr, networkPassphrase);
  if (parsed instanceof FeeBumpTransaction) {
    throw new Error("Expected normal transaction fixture");
  }
  return parsed;
}

function accountSequenceForBuiltTransaction(txSequence: string): string {
  const sequence = BigInt(txSequence);
  if (sequence <= BigInt(0)) {
    throw new Error("Invalid transaction fixture sequence");
  }
  return (sequence - BigInt(1)).toString();
}

function defaultInvokeArgs(): readonly xdr.ScVal[] {
  return [
    nativeToScVal(BigInt(1), { type: "u64" }),
    new Address(BUYER_ADDR).toScVal(),
  ];
}

function makeInvokeOperation(input: {
  readonly contract_id?: string;
  readonly method?: string;
  readonly args?: readonly xdr.ScVal[];
  readonly operation_source?: Keypair;
} = {}): xdr.Operation {
  const operation = new Contract(input.contract_id ?? TEST_CONTRACT).call(
    input.method ?? "deposit_buyer",
    ...(input.args ?? defaultInvokeArgs()),
  );

  if (input.operation_source === undefined) {
    return operation;
  }

  return new xdr.Operation({
    sourceAccount: xdr.MuxedAccount.keyTypeEd25519(
      input.operation_source.xdrAccountId().ed25519(),
    ),
    body: operation.body(),
  });
}

function readFixtureTimeBounds(tx: Transaction): { readonly minTime: number; readonly maxTime: number } {
  if (tx.timeBounds === null) {
    throw new Error("Expected time bounds in transaction fixture");
  }
  return {
    minTime: Number(tx.timeBounds.minTime),
    maxTime: Number(tx.timeBounds.maxTime),
  };
}

function buildTransactionWithOperations(input: {
  readonly template: Transaction;
  readonly source_address?: string;
  readonly transaction_sequence?: string;
  readonly fee?: string;
  readonly max_time_delta?: number;
  readonly memo?: Memo;
  readonly operations: readonly xdr.Operation[];
}): Transaction {
  const timeBounds = readFixtureTimeBounds(input.template);
  const builder = new TransactionBuilder(
    new Account(
      input.source_address ?? input.template.source,
      accountSequenceForBuiltTransaction(input.transaction_sequence ?? input.template.sequence),
    ),
    {
      fee: input.fee ?? input.template.fee,
      networkPassphrase: Networks.TESTNET,
    },
  );

  if (input.memo !== undefined) {
    builder.addMemo(input.memo);
  }

  for (const operation of input.operations) {
    builder.addOperation(operation);
  }

  builder.setTimebounds(
    timeBounds.minTime,
    timeBounds.maxTime + (input.max_time_delta ?? 0),
  );

  return builder.build();
}

function makeSorobanTransactionExt(resourceFee: bigint): xdr.TransactionExt {
  const footprint = new xdr.LedgerFootprint({
    readOnly: [],
    readWrite: [],
  });
  const resources = new xdr.SorobanResources({
    footprint,
    instructions: 1,
    diskReadBytes: 0,
    writeBytes: 0,
  });
  const sorobanData = new xdr.SorobanTransactionData({
    ext: new xdr.SorobanTransactionDataExt(0),
    resources,
    resourceFee,
  });
  return new xdr.TransactionExt(1, sorobanData);
}

function rebuildTransactionBody(input: {
  readonly template: Transaction;
  readonly operations?: readonly xdr.Operation[];
  readonly ext?: xdr.TransactionExt;
}): Transaction {
  const envelope = input.template.toEnvelope();
  if (envelope.switch().name !== "envelopeTypeTx") {
    throw new Error("Expected normal transaction envelope");
  }

  const body = envelope.v1().tx();
  const transaction = new xdr.Transaction({
    sourceAccount: body.sourceAccount(),
    fee: body.fee(),
    seqNum: body.seqNum(),
    cond: body.cond(),
    memo: body.memo(),
    operations: input.operations ?? body.operations(),
    ext: input.ext ?? body.ext(),
  });
  const updatedEnvelope = xdr.TransactionEnvelope.envelopeTypeTx(
    new xdr.TransactionV1Envelope({
      tx: transaction,
      signatures: [],
    }),
  );
  return parseNormalTestTransaction(
    updatedEnvelope.toXDR("base64"),
    Networks.TESTNET,
  );
}

function withNullOperationSourceEnvelope(tx: Transaction): Transaction {
  const originalToEnvelope = tx.toEnvelope.bind(tx);
  Object.defineProperty(tx, "toEnvelope", {
    value: () => {
      const envelope = originalToEnvelope();
      if (envelope.switch().name !== "envelopeTypeTx") {
        throw new Error("Expected normal transaction envelope");
      }

      const body = envelope.v1().tx();
      const operations = body.operations();
      const firstOperation = operations[0];
      if (firstOperation === undefined) {
        throw new Error("Expected operation fixture");
      }

      const updatedFirstOperation = new xdr.Operation({
        sourceAccount: null,
        body: firstOperation.body(),
      });
      const updatedTransaction = new xdr.Transaction({
        sourceAccount: body.sourceAccount(),
        fee: body.fee(),
        seqNum: body.seqNum(),
        cond: body.cond(),
        memo: body.memo(),
        operations: [updatedFirstOperation, ...operations.slice(1)],
        ext: body.ext(),
      });

      return xdr.TransactionEnvelope.envelopeTypeTx(
        new xdr.TransactionV1Envelope({
          tx: updatedTransaction,
          signatures: envelope.v1().signatures(),
        }),
      );
    },
  });
  return tx;
}

function makeSourceAccountAuthEntry(operation: xdr.Operation): xdr.SorobanAuthorizationEntry {
  const hostFunctionOp = operation.body().invokeHostFunctionOp();
  const invokeContract = hostFunctionOp.hostFunction().invokeContract();
  return new xdr.SorobanAuthorizationEntry({
    credentials: xdr.SorobanCredentials.sorobanCredentialsSourceAccount(),
    rootInvocation: new xdr.SorobanAuthorizedInvocation({
      function: xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeContractFn(
        invokeContract,
      ),
      subInvocations: [],
    }),
  });
}

function addSourceAccountAuthEntry(tx: Transaction): Transaction {
  const envelope = tx.toEnvelope();
  if (envelope.switch().name !== "envelopeTypeTx") {
    throw new Error("Expected normal transaction envelope");
  }

  const operation = envelope.v1().tx().operations()[0];
  if (operation === undefined) {
    throw new Error("Expected operation fixture");
  }

  const hostFunctionOp = operation.body().invokeHostFunctionOp();
  const updatedHostFunctionOp = new xdr.InvokeHostFunctionOp({
    hostFunction: hostFunctionOp.hostFunction(),
    auth: [makeSourceAccountAuthEntry(operation)],
  });
  const updatedOperation = new xdr.Operation({
    sourceAccount: operation.sourceAccount(),
    body: xdr.OperationBody.invokeHostFunction(updatedHostFunctionOp),
  });

  return rebuildTransactionBody({
    template: tx,
    operations: [updatedOperation],
  });
}

function mutateTransactionBody(
  tx: Transaction,
  mutation: TransactionBodyMutation,
): Transaction {
  const defaultOperation = makeInvokeOperation();
  switch (mutation) {
    case "source_account":
      return buildTransactionWithOperations({
        template: tx,
        source_address: ADMIN_ADDR,
        operations: [defaultOperation],
      });
    case "sequence":
      return buildTransactionWithOperations({
        template: tx,
        transaction_sequence: (BigInt(tx.sequence) + BigInt(1)).toString(),
        operations: [defaultOperation],
      });
    case "fee":
      return buildTransactionWithOperations({
        template: tx,
        fee: String(Number(tx.fee) + 1),
        operations: [defaultOperation],
      });
    case "time_bounds":
      return buildTransactionWithOperations({
        template: tx,
        max_time_delta: 1,
        operations: [defaultOperation],
      });
    case "memo":
      return buildTransactionWithOperations({
        template: tx,
        memo: Memo.text("changed"),
        operations: [defaultOperation],
      });
    case "operation_count":
      return buildTransactionWithOperations({
        template: tx,
        operations: [defaultOperation, defaultOperation],
      });
    case "operation_type":
      return buildTransactionWithOperations({
        template: tx,
        operations: [
          Operation.payment({
            destination: SELLER_ADDR,
            asset: Asset.native(),
            amount: "1",
          }),
        ],
      });
    case "operation_source":
      return buildTransactionWithOperations({
        template: tx,
        operations: [makeInvokeOperation({ operation_source: ADMIN_KP })],
      });
    case "contract_id":
      return buildTransactionWithOperations({
        template: tx,
        operations: [makeInvokeOperation({ contract_id: ALT_CONTRACT })],
      });
    case "method":
      return buildTransactionWithOperations({
        template: tx,
        operations: [makeInvokeOperation({ method: "deposit_seller" })],
      });
    case "argument_value":
      return buildTransactionWithOperations({
        template: tx,
        operations: [
          makeInvokeOperation({
            args: [
              nativeToScVal(BigInt(2), { type: "u64" }),
              new Address(BUYER_ADDR).toScVal(),
            ],
          }),
        ],
      });
    case "argument_order":
      return buildTransactionWithOperations({
        template: tx,
        operations: [
          makeInvokeOperation({
            args: [
              new Address(BUYER_ADDR).toScVal(),
              nativeToScVal(BigInt(1), { type: "u64" }),
            ],
          }),
        ],
      });
    case "soroban_data":
      return rebuildTransactionBody({
        template: tx,
        ext: makeSorobanTransactionExt(BigInt(1)),
      });
  }
}

function prepareWithAllowedRpcChanges(tx: Transaction): Transaction {
  const withAuth = addSourceAccountAuthEntry(tx);
  return rebuildTransactionBody({
    template: buildTransactionWithOperations({
      template: withAuth,
      fee: String(Number(withAuth.fee) + 100),
      operations: [
        withAuth.toEnvelope().v1().tx().operations()[0] ?? makeInvokeOperation(),
      ],
    }),
    ext: makeSorobanTransactionExt(BigInt(100)),
  });
}

function makeSignerPort(signerKp: Keypair): StellarSignerPort {
  return {
    signTransaction: vi.fn().mockImplementation(async (req: StellarSignRequest) => {
      const tx = parseNormalTestTransaction(
        req.prepared_transaction_xdr,
        req.expected_network_passphrase,
      );
      tx.sign(signerKp);
      return { ok: true, signed_transaction_xdr: tx.toXDR() };
    }),
  };
}

function makeMutatingSignerPort(
  mutation: TransactionBodyMutation,
  signerKp: Keypair = BUYER_KP,
): StellarSignerPort {
  return {
    signTransaction: vi.fn().mockImplementation(async (req: StellarSignRequest) => {
      const preparedTx = parseNormalTestTransaction(
        req.prepared_transaction_xdr,
        req.expected_network_passphrase,
      );
      const mutatedTx = mutateTransactionBody(preparedTx, mutation);
      mutatedTx.sign(signerKp);
      return { ok: true, signed_transaction_xdr: mutatedTx.toXDR() };
    }),
  };
}

function makeFeeBumpSignerPort(): StellarSignerPort {
  return {
    signTransaction: vi.fn().mockImplementation(async (req: StellarSignRequest) => {
      const preparedTx = parseNormalTestTransaction(
        req.prepared_transaction_xdr,
        req.expected_network_passphrase,
      );
      const feeBump = TransactionBuilder.buildFeeBumpTransaction(
        ADMIN_ADDR,
        "200",
        preparedTx,
        req.expected_network_passphrase,
      );
      feeBump.sign(ADMIN_KP);
      return { ok: true, signed_transaction_xdr: feeBump.toXDR() };
    }),
  };
}

function makeDecoratedSignatureSignerPort(input: {
  readonly signature: Buffer;
  readonly hint: Buffer;
}): StellarSignerPort {
  return {
    signTransaction: vi.fn().mockImplementation(async (req: StellarSignRequest) => {
      const tx = parseNormalTestTransaction(
        req.prepared_transaction_xdr,
        req.expected_network_passphrase,
      );
      tx.signatures.splice(
        0,
        tx.signatures.length,
        new xdr.DecoratedSignature({
          hint: input.hint,
          signature: input.signature,
        }),
      );
      return { ok: true, signed_transaction_xdr: tx.toXDR() };
    }),
  };
}

function makeWrongNetworkSignerPort(): StellarSignerPort {
  return {
    signTransaction: vi.fn().mockImplementation(async (req: StellarSignRequest) => {
      const tx = parseNormalTestTransaction(
        req.prepared_transaction_xdr,
        Networks.PUBLIC,
      );
      tx.sign(BUYER_KP);
      return { ok: true, signed_transaction_xdr: tx.toXDR() };
    }),
  };
}

function makeExtraSignatureSignerPort(input: {
  readonly includeExpectedSigner: boolean;
}): StellarSignerPort {
  return {
    signTransaction: vi.fn().mockImplementation(async (req: StellarSignRequest) => {
      const tx = parseNormalTestTransaction(
        req.prepared_transaction_xdr,
        req.expected_network_passphrase,
      );
      tx.sign(ADMIN_KP);
      if (input.includeExpectedSigner) {
        tx.sign(BUYER_KP);
      }
      return { ok: true, signed_transaction_xdr: tx.toXDR() };
    }),
  };
}

function expectSignAuthFailure(
  result: StellarAdapterSubmitResult,
): asserts result is StellarPreSubmitFailure {
  expect(result.outcome).toBe("failed");
  if (result.outcome === "failed") {
    expect(result.stage).toBe("sign");
    expect(result.error_code).toBe("ERR_AUTH_FAILED");
    expect(result.retryable).toBe(false);
    expect(JSON.stringify(result)).not.toContain("signed_transaction_xdr");
    expect(JSON.stringify(result)).not.toContain("signature");
  }
}

function expectSimulateInvalidStateFailure(
  result: StellarAdapterSubmitResult,
): asserts result is StellarPreSubmitFailure {
  expect(result.outcome).toBe("failed");
  if (result.outcome === "failed") {
    expect(result.stage).toBe("simulate");
    expect(result.error_code).toBe("ERR_INVALID_STATE");
    expect(result.retryable).toBe(false);
  }
}

async function submitWithPorts(
  rpcPort: StellarRpcPort,
  signerPort: StellarSignerPort,
): Promise<StellarAdapterSubmitResult> {
  const adapter = new StellarTestnetAdapter(
    makeConfig(),
    makeRoleMapping(),
    rpcPort,
    signerPort,
    makeTimeSource(),
  );
  return adapter.submit(makeSubmitRequest());
}

function makeRpcPort() {
  return {
    verifyNetworkIdentity: vi.fn().mockResolvedValue(true),
    loadSourceAccount: vi.fn().mockResolvedValue({ ok: true, sequence: "100" }),
    simulateAndPrepareTransaction: vi.fn().mockImplementation(async (tx: Transaction) => {
      return { ok: true, prepared_transaction: tx };
    }),
    submitTransaction: vi.fn().mockResolvedValue({
      ok: true,
      transaction_hash: "a".repeat(64),
    }),
    confirmTransaction: vi.fn(),
  };
}

function makeTimeSource(now: number = 1700000000): StellarTimeSource {
  return { nowUnixSeconds: vi.fn().mockReturnValue(now) };
}

describe("StellarTestnetAdapter", () => {
  describe("submit", () => {
    it("rejects wrong network passphrase in config", async () => {
      const adapter = new StellarTestnetAdapter(
        makeConfig({ network_passphrase: "wrong" }),
        makeRoleMapping(),
        makeRpcPort(),
        makeSignerPort(BUYER_KP),
        makeTimeSource(),
      );
      const res = await adapter.submit(makeSubmitRequest());
      expect(res.outcome).toBe("failed");
      if (res.outcome === "failed") {
        expect(res.stage).toBe("prepare");
        expect(res.error_code).toBe("ERR_INVALID_STATE");
      }
    });

    it("rejects invalid base fee", async () => {
      const adapter = new StellarTestnetAdapter(
        makeConfig({ base_fee_stroops: 0 }),
        makeRoleMapping(),
        makeRpcPort(),
        makeSignerPort(BUYER_KP),
        makeTimeSource(),
      );
      const res = await adapter.submit(makeSubmitRequest());
      expect(res.outcome).toBe("failed");
    });

    it("rejects base > max fee", async () => {
      const adapter = new StellarTestnetAdapter(
        makeConfig({ base_fee_stroops: 200, max_fee_stroops: 100 }),
        makeRoleMapping(),
        makeRpcPort(),
        makeSignerPort(BUYER_KP),
        makeTimeSource(),
      );
      const res = await adapter.submit(makeSubmitRequest());
      expect(res.outcome).toBe("failed");
    });

    it("rejects when network identity fails", async () => {
      const rpcPort = makeRpcPort();
      rpcPort.verifyNetworkIdentity.mockResolvedValue(false);
      const adapter = new StellarTestnetAdapter(
        makeConfig(),
        makeRoleMapping(),
        rpcPort,
        makeSignerPort(BUYER_KP),
        makeTimeSource(),
      );
      const res = await adapter.submit(makeSubmitRequest());
      expect(res.outcome).toBe("failed");
      if (res.outcome === "failed") {
        expect(res.error_code).toBe("ERR_NETWORK_FAILURE");
        expect(res.retryable).toBe(true);
      }
    });

    it("rejects when source account fails", async () => {
      const rpcPort = makeRpcPort();
      rpcPort.loadSourceAccount.mockResolvedValue({ ok: false });
      const adapter = new StellarTestnetAdapter(
        makeConfig(),
        makeRoleMapping(),
        rpcPort,
        makeSignerPort(BUYER_KP),
        makeTimeSource(),
      );
      const res = await adapter.submit(makeSubmitRequest());
      expect(res.outcome).toBe("failed");
      if (res.outcome === "failed") {
        expect(res.error_code).toBe("ERR_NETWORK_FAILURE");
      }
    });

    it("rejects negative time source", async () => {
      const adapter = new StellarTestnetAdapter(
        makeConfig(),
        makeRoleMapping(),
        makeRpcPort(),
        makeSignerPort(BUYER_KP),
        makeTimeSource(-1),
      );
      const res = await adapter.submit(makeSubmitRequest());
      expect(res.outcome).toBe("failed");
      if (res.outcome === "failed") {
        expect(res.error_code).toBe("ERR_INVALID_STATE");
      }
    });

    it("rejects non-integer time source", async () => {
      const adapter = new StellarTestnetAdapter(
        makeConfig(),
        makeRoleMapping(),
        makeRpcPort(),
        makeSignerPort(BUYER_KP),
        makeTimeSource(1.5),
      );
      const res = await adapter.submit(makeSubmitRequest());
      expect(res.outcome).toBe("failed");
    });

    it("rejects simulation failure", async () => {
      const rpcPort = makeRpcPort();
      rpcPort.simulateAndPrepareTransaction.mockResolvedValue({
        ok: false,
        error_code: "ERR_CONTRACT_REJECTED",
      });
      const adapter = new StellarTestnetAdapter(
        makeConfig(),
        makeRoleMapping(),
        rpcPort,
        makeSignerPort(BUYER_KP),
        makeTimeSource(),
      );
      const res = await adapter.submit(makeSubmitRequest());
      expect(res.outcome).toBe("failed");
      if (res.outcome === "failed") {
        expect(res.error_code).toBe("ERR_CONTRACT_REJECTED");
      }
    });

    it("maps auth failure to ERR_AUTH_FAILED", async () => {
      const rpcPort = makeRpcPort();
      rpcPort.simulateAndPrepareTransaction.mockResolvedValue({
        ok: false,
        error_code: "ERR_AUTH_FAILED",
      });
      const adapter = new StellarTestnetAdapter(
        makeConfig(),
        makeRoleMapping(),
        rpcPort,
        makeSignerPort(BUYER_KP),
        makeTimeSource(),
      );
      const res = await adapter.submit(makeSubmitRequest());
      expect(res.outcome).toBe("failed");
      if (res.outcome === "failed") {
        expect(res.error_code).toBe("ERR_AUTH_FAILED");
        expect(res.stage).toBe("sign");
      }
    });

    it("rejects signer rejection", async () => {
      const signerPort: StellarSignerPort = {
        signTransaction: vi.fn().mockResolvedValue({
          ok: false,
          error_code: "ERR_SIGNER_REJECTED",
        }),
      };
      const adapter = new StellarTestnetAdapter(
        makeConfig(),
        makeRoleMapping(),
        makeRpcPort(),
        signerPort,
        makeTimeSource(),
      );
      const res = await adapter.submit(makeSubmitRequest());
      expect(res.outcome).toBe("failed");
      if (res.outcome === "failed") {
        expect(res.stage).toBe("sign");
        expect(res.error_code).toBe("ERR_AUTH_FAILED");
      }
    });

    it("rejects malicious signer returning garbage XDR", async () => {
      const rpcPort = makeRpcPort();
      const signerPort: StellarSignerPort = {
        signTransaction: vi.fn().mockResolvedValue({
          ok: true,
          signed_transaction_xdr: "INVALIDXDR",
        }),
      };
      const adapter = new StellarTestnetAdapter(
        makeConfig(),
        makeRoleMapping(),
        rpcPort,
        signerPort,
        makeTimeSource(),
      );
      const res = await adapter.submit(makeSubmitRequest());
      expectSignAuthFailure(res);
      expect(signerPort.signTransaction).toHaveBeenCalledTimes(1);
      expect(rpcPort.submitTransaction).not.toHaveBeenCalled();
    });

    it("rejects signer returning unsigned transaction", async () => {
      const rpcPort = makeRpcPort();
      const signerPort: StellarSignerPort = {
        signTransaction: vi.fn().mockImplementation(async (req: StellarSignRequest) => {
          return { ok: true, signed_transaction_xdr: req.prepared_transaction_xdr };
        }),
      };
      const adapter = new StellarTestnetAdapter(
        makeConfig(),
        makeRoleMapping(),
        rpcPort,
        signerPort,
        makeTimeSource(),
      );
      const res = await adapter.submit(makeSubmitRequest());
      expectSignAuthFailure(res);
      expect(signerPort.signTransaction).toHaveBeenCalledTimes(1);
      expect(rpcPort.submitTransaction).not.toHaveBeenCalled();
    });

    it("rejects signer with wrong key", async () => {
      const rpcPort = makeRpcPort();
      const signerPort = makeSignerPort(ADMIN_KP);
      const adapter = new StellarTestnetAdapter(
        makeConfig(),
        makeRoleMapping(),
        rpcPort,
        signerPort,
        makeTimeSource(),
      );
      const res = await adapter.submit(makeSubmitRequest());
      expectSignAuthFailure(res);
      expect(signerPort.signTransaction).toHaveBeenCalledTimes(1);
      expect(rpcPort.submitTransaction).not.toHaveBeenCalled();
    });

    it("submits canonical contract call with no explicit operation source", async () => {
      const rpcPort = makeRpcPort();
      const signerPort = makeSignerPort(BUYER_KP);

      const res = await submitWithPorts(rpcPort, signerPort);

      expect(res.outcome).toBe("submitted");
      expect(signerPort.signTransaction).toHaveBeenCalledTimes(1);
      expect(rpcPort.submitTransaction).toHaveBeenCalledTimes(1);
    });

    it("normalizes null and undefined absent operation source as the same intent", async () => {
      const rpcPort = makeRpcPort();
      const signerPort = makeSignerPort(BUYER_KP);
      rpcPort.simulateAndPrepareTransaction.mockImplementation(async (tx: Transaction) => {
        const preparedTx = parseNormalTestTransaction(tx.toXDR(), Networks.TESTNET);
        return {
          ok: true,
          prepared_transaction: withNullOperationSourceEnvelope(preparedTx),
        };
      });

      const res = await submitWithPorts(rpcPort, signerPort);

      expect(res.outcome).toBe("submitted");
      expect(signerPort.signTransaction).toHaveBeenCalledTimes(1);
      expect(rpcPort.submitTransaction).toHaveBeenCalledTimes(1);
    });

    it("rejects explicit operation source mutation before signer or RPC submission", async () => {
      const rpcPort = makeRpcPort();
      const signerPort = makeSignerPort(BUYER_KP);
      rpcPort.simulateAndPrepareTransaction.mockImplementation(async (tx: Transaction) => {
        return { ok: true, prepared_transaction: mutateTransactionBody(tx, "operation_source") };
      });

      const res = await submitWithPorts(rpcPort, signerPort);

      expectSimulateInvalidStateFailure(res);
      expect(JSON.stringify(res)).not.toContain("signed_transaction_xdr");
      expect(JSON.stringify(res)).not.toContain("signature");
      expect(signerPort.signTransaction).not.toHaveBeenCalled();
      expect(rpcPort.submitTransaction).not.toHaveBeenCalled();
    });

    const rpcIntentMutations: readonly TransactionBodyMutation[] = [
      "source_account",
      "sequence",
      "time_bounds",
      "memo",
      "operation_count",
      "operation_type",
      "operation_source",
      "contract_id",
      "method",
      "argument_value",
      "argument_order",
    ];

    for (const mutation of rpcIntentMutations) {
      it(`rejects RPC-prepared canonical intent mutation: ${mutation}`, async () => {
        const rpcPort = makeRpcPort();
        const signerPort = makeSignerPort(BUYER_KP);
        rpcPort.simulateAndPrepareTransaction.mockImplementation(async (tx: Transaction) => {
          return { ok: true, prepared_transaction: mutateTransactionBody(tx, mutation) };
        });

        const res = await submitWithPorts(rpcPort, signerPort);

        expectSimulateInvalidStateFailure(res);
        expect(signerPort.signTransaction).not.toHaveBeenCalled();
        expect(rpcPort.submitTransaction).not.toHaveBeenCalled();
      });
    }

    it("accepts RPC-prepared fee, auth, and Soroban resource data when intent is unchanged", async () => {
      const rpcPort = makeRpcPort();
      rpcPort.simulateAndPrepareTransaction.mockImplementation(async (tx: Transaction) => {
        return { ok: true, prepared_transaction: prepareWithAllowedRpcChanges(tx) };
      });

      const res = await submitWithPorts(rpcPort, makeSignerPort(BUYER_KP));

      expect(res.outcome).toBe("submitted");
      expect(rpcPort.submitTransaction).toHaveBeenCalledTimes(1);
    });

    const signerBodyMutations: readonly TransactionBodyMutation[] = [
      "source_account",
      "sequence",
      "fee",
      "time_bounds",
      "memo",
      "operation_count",
      "operation_type",
      "operation_source",
      "contract_id",
      "method",
      "argument_value",
      "argument_order",
      "soroban_data",
    ];

    for (const mutation of signerBodyMutations) {
      it(`rejects signer-returned transaction body mutation: ${mutation}`, async () => {
        const rpcPort = makeRpcPort();
        const signerPort = makeMutatingSignerPort(mutation);

        const res = await submitWithPorts(rpcPort, signerPort);

        expectSignAuthFailure(res);
        expect(signerPort.signTransaction).toHaveBeenCalledTimes(1);
        expect(rpcPort.submitTransaction).not.toHaveBeenCalled();
      });
    }

    it("rejects signer returning FeeBumpTransaction XDR", async () => {
      const rpcPort = makeRpcPort();
      const signerPort = makeFeeBumpSignerPort();

      const res = await submitWithPorts(rpcPort, signerPort);

      expectSignAuthFailure(res);
      expect(signerPort.signTransaction).toHaveBeenCalledTimes(1);
      expect(rpcPort.submitTransaction).not.toHaveBeenCalled();
    });

    it("rejects signer signature with malformed bytes", async () => {
      const rpcPort = makeRpcPort();
      const signerPort = makeDecoratedSignatureSignerPort({
        hint: Buffer.from(BUYER_KP.signatureHint()),
        signature: Buffer.from([1, 2, 3]),
      });

      const res = await submitWithPorts(rpcPort, signerPort);

      expectSignAuthFailure(res);
      expect(signerPort.signTransaction).toHaveBeenCalledTimes(1);
      expect(rpcPort.submitTransaction).not.toHaveBeenCalled();
    });

    it("rejects signer signature with matching hint but invalid bytes", async () => {
      const rpcPort = makeRpcPort();
      const signerPort = makeDecoratedSignatureSignerPort({
        hint: Buffer.from(BUYER_KP.signatureHint()),
        signature: Buffer.alloc(64, 7),
      });

      const res = await submitWithPorts(rpcPort, signerPort);

      expectSignAuthFailure(res);
      expect(signerPort.signTransaction).toHaveBeenCalledTimes(1);
      expect(rpcPort.submitTransaction).not.toHaveBeenCalled();
    });

    it("rejects valid expected signer signature made under wrong network passphrase", async () => {
      const rpcPort = makeRpcPort();
      const signerPort = makeWrongNetworkSignerPort();

      const res = await submitWithPorts(rpcPort, signerPort);

      expectSignAuthFailure(res);
      expect(signerPort.signTransaction).toHaveBeenCalledTimes(1);
      expect(rpcPort.submitTransaction).not.toHaveBeenCalled();
    });

    it("rejects signer output with only unrelated extra signatures", async () => {
      const rpcPort = makeRpcPort();
      const signerPort = makeExtraSignatureSignerPort({ includeExpectedSigner: false });

      const res = await submitWithPorts(rpcPort, signerPort);

      expectSignAuthFailure(res);
      expect(signerPort.signTransaction).toHaveBeenCalledTimes(1);
      expect(rpcPort.submitTransaction).not.toHaveBeenCalled();
    });

    it("accepts signer output with valid expected signer and unrelated extra signatures", async () => {
      const rpcPort = makeRpcPort();
      const signerPort = makeExtraSignatureSignerPort({ includeExpectedSigner: true });

      const res = await submitWithPorts(rpcPort, signerPort);

      expect(res.outcome).toBe("submitted");
      expect(signerPort.signTransaction).toHaveBeenCalledTimes(1);
      expect(rpcPort.submitTransaction).toHaveBeenCalledTimes(1);
    });

    it("rejects valid expected signature over altered transaction body", async () => {
      const rpcPort = makeRpcPort();
      const signerPort = makeMutatingSignerPort("fee", BUYER_KP);

      const res = await submitWithPorts(rpcPort, signerPort);

      expectSignAuthFailure(res);
      expect(signerPort.signTransaction).toHaveBeenCalledTimes(1);
      expect(rpcPort.submitTransaction).not.toHaveBeenCalled();
    });

    it("succeeds with valid submit flow", async () => {
      const adapter = new StellarTestnetAdapter(
        makeConfig(),
        makeRoleMapping(),
        makeRpcPort(),
        makeSignerPort(BUYER_KP),
        makeTimeSource(),
      );
      const res = await adapter.submit(makeSubmitRequest());
      expect(res.outcome).toBe("submitted");
      if (res.outcome === "submitted") {
        expect(res.action).toBe("buyer_deposit");
        expect(res.transaction_hash).toBe("a".repeat(64));
      }
    });

    it("treats duplicate as submitted", async () => {
      const rpcPort = makeRpcPort();
      rpcPort.submitTransaction.mockResolvedValue({
        ok: false,
        status: "duplicate",
        transaction_hash: "b".repeat(64),
      });
      const adapter = new StellarTestnetAdapter(
        makeConfig(),
        makeRoleMapping(),
        rpcPort,
        makeSignerPort(BUYER_KP),
        makeTimeSource(),
      );
      const res = await adapter.submit(makeSubmitRequest());
      expect(res.outcome).toBe("submitted");
    });

    it("maps retry_later to retryable failure", async () => {
      const rpcPort = makeRpcPort();
      rpcPort.submitTransaction.mockResolvedValue({
        ok: false,
        status: "retry_later",
      });
      const adapter = new StellarTestnetAdapter(
        makeConfig(),
        makeRoleMapping(),
        rpcPort,
        makeSignerPort(BUYER_KP),
        makeTimeSource(),
      );
      const res = await adapter.submit(makeSubmitRequest());
      expect(res.outcome).toBe("failed");
      if (res.outcome === "failed") {
        expect(res.stage).toBe("submit");
        expect(res.retryable).toBe(true);
      }
    });

    it("does not call confirm during submit", async () => {
      const rpcPort = makeRpcPort();
      const adapter = new StellarTestnetAdapter(
        makeConfig(),
        makeRoleMapping(),
        rpcPort,
        makeSignerPort(BUYER_KP),
        makeTimeSource(),
      );
      await adapter.submit(makeSubmitRequest());
      expect(rpcPort.confirmTransaction).not.toHaveBeenCalled();
    });

    it("calls time source exactly once", async () => {
      const timeSource = makeTimeSource();
      const adapter = new StellarTestnetAdapter(
        makeConfig(),
        makeRoleMapping(),
        makeRpcPort(),
        makeSignerPort(BUYER_KP),
        timeSource,
      );
      await adapter.submit(makeSubmitRequest());
      expect(timeSource.nowUnixSeconds).toHaveBeenCalledTimes(1);
    });

    it("does not mutate input", async () => {
      const adapter = new StellarTestnetAdapter(
        makeConfig(),
        makeRoleMapping(),
        makeRpcPort(),
        makeSignerPort(BUYER_KP),
        makeTimeSource(),
      );
      const req = makeSubmitRequest();
      const reqCopy = JSON.parse(JSON.stringify(req));
      await adapter.submit(req);
      expect(req).toEqual(reqCopy);
    });
  });

  describe("confirm", () => {
    it("returns confirmed for create_deal with escrow ID", async () => {
      const { nativeToScVal } = await import("@stellar/stellar-sdk");
      const rpcPort = makeRpcPort();
      rpcPort.confirmTransaction.mockResolvedValue({
        outcome: "confirmed",
        transaction_hash: "hash1",
        result_value: nativeToScVal(BigInt(999), { type: "u64" }),
      });
      const adapter = new StellarTestnetAdapter(
        makeConfig(),
        makeRoleMapping(),
        rpcPort,
        makeSignerPort(BUYER_KP),
        makeTimeSource(),
      );
      const res = await adapter.confirm({
        action: "create_deal",
        transaction_hash: "a".repeat(64),
      });
      expect(res.outcome).toBe("confirmed");
      if (res.outcome === "confirmed") {
        expect(res.result_escrow_id).toBe("999");
      }
    });

    it("returns confirmed for transition with null escrow ID", async () => {
      const rpcPort = makeRpcPort();
      rpcPort.confirmTransaction.mockResolvedValue({
        outcome: "confirmed",
        transaction_hash: "hash1",
        result_value: { switch: () => ({ name: "scvVoid" }) },
      });
      const adapter = new StellarTestnetAdapter(
        makeConfig(),
        makeRoleMapping(),
        rpcPort,
        makeSignerPort(BUYER_KP),
        makeTimeSource(),
      );
      const res = await adapter.confirm({
        action: "buyer_deposit",
        transaction_hash: "a".repeat(64),
      });
      expect(res.outcome).toBe("confirmed");
      if (res.outcome === "confirmed") {
        expect(res.result_escrow_id).toBe(null);
      }
    });

    it("returns failed for RPC failure", async () => {
      const rpcPort = makeRpcPort();
      rpcPort.confirmTransaction.mockResolvedValue({
        outcome: "failed",
        transaction_hash: "a".repeat(64),
      });
      const adapter = new StellarTestnetAdapter(
        makeConfig(),
        makeRoleMapping(),
        rpcPort,
        makeSignerPort(BUYER_KP),
        makeTimeSource(),
      );
      const res = await adapter.confirm({
        action: "buyer_deposit",
        transaction_hash: "a".repeat(64),
      });
      expect(res.outcome).toBe("failed");
      if (res.outcome === "failed") {
        expect(res.error_code).toBe("ERR_CONTRACT_REJECTED");
      }
    });

    it("returns unknown for not_found", async () => {
      const rpcPort = makeRpcPort();
      rpcPort.confirmTransaction.mockResolvedValue({ outcome: "not_found" });
      const adapter = new StellarTestnetAdapter(
        makeConfig(),
        makeRoleMapping(),
        rpcPort,
        makeSignerPort(BUYER_KP),
        makeTimeSource(),
      );
      const res = await adapter.confirm({
        action: "buyer_deposit",
        transaction_hash: "a".repeat(64),
      });
      expect(res.outcome).toBe("unknown");
      if (res.outcome === "unknown") {
        expect(res.reconciliation_required).toBe(true);
        expect(res.resubmission_allowed).toBe(false);
      }
    });

    it("returns unknown for RPC error", async () => {
      const rpcPort = makeRpcPort();
      rpcPort.confirmTransaction.mockResolvedValue({
        outcome: "error",
        error_code: "ERR_NETWORK_FAILURE",
      });
      const adapter = new StellarTestnetAdapter(
        makeConfig(),
        makeRoleMapping(),
        rpcPort,
        makeSignerPort(BUYER_KP),
        makeTimeSource(),
      );
      const res = await adapter.confirm({
        action: "buyer_deposit",
        transaction_hash: "a".repeat(64),
      });
      expect(res.outcome).toBe("unknown");
    });

    it("rejects invalid transaction hash", async () => {
      const adapter = new StellarTestnetAdapter(
        makeConfig(),
        makeRoleMapping(),
        makeRpcPort(),
        makeSignerPort(BUYER_KP),
        makeTimeSource(),
      );
      const res = await adapter.confirm({
        action: "buyer_deposit",
        transaction_hash: "invalid",
      });
      expect(res.outcome).toBe("failed");
    });

    it("does not call submit during confirm", async () => {
      const rpcPort = makeRpcPort();
      rpcPort.confirmTransaction.mockResolvedValue({
        outcome: "confirmed",
        transaction_hash: "hash1",
        result_value: { switch: () => ({ name: "scvVoid" }) },
      });
      const adapter = new StellarTestnetAdapter(
        makeConfig(),
        makeRoleMapping(),
        rpcPort,
        makeSignerPort(BUYER_KP),
        makeTimeSource(),
      );
      await adapter.confirm({
        action: "buyer_deposit",
        transaction_hash: "a".repeat(64),
      });
      expect(rpcPort.submitTransaction).not.toHaveBeenCalled();
    });

    it("does not call time source during confirm", async () => {
      const timeSource = makeTimeSource();
      const rpcPort = makeRpcPort();
      rpcPort.confirmTransaction.mockResolvedValue({
        outcome: "confirmed",
        transaction_hash: "hash1",
        result_value: { switch: () => ({ name: "scvVoid" }) },
      });
      const adapter = new StellarTestnetAdapter(
        makeConfig(),
        makeRoleMapping(),
        rpcPort,
        makeSignerPort(BUYER_KP),
        timeSource,
      );
      await adapter.confirm({
        action: "buyer_deposit",
        transaction_hash: "a".repeat(64),
      });
      expect(timeSource.nowUnixSeconds).not.toHaveBeenCalled();
    });

    it("rejects unexpected escrow ID for transition action", async () => {
      const { nativeToScVal } = await import("@stellar/stellar-sdk");
      const rpcPort = makeRpcPort();
      rpcPort.confirmTransaction.mockResolvedValue({
        outcome: "confirmed",
        transaction_hash: "hash1",
        result_value: nativeToScVal(BigInt(42), { type: "u64" }),
      });
      const adapter = new StellarTestnetAdapter(
        makeConfig(),
        makeRoleMapping(),
        rpcPort,
        makeSignerPort(BUYER_KP),
        makeTimeSource(),
      );
      const res = await adapter.confirm({
        action: "buyer_deposit",
        transaction_hash: "a".repeat(64),
      });
      expect(res.outcome).toBe("failed");
    });
  });
});
