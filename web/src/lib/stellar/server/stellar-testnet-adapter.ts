import {
  TransactionBuilder,
  Networks,
  Keypair,
  Transaction,
  FeeBumpTransaction,
  xdr,
} from "@stellar/stellar-sdk";
import type { StellarSignerRole } from "./action-policy";
import type {
  StellarExecutionAdapter,
  StellarAdapterSubmitRequest,
  StellarAdapterSubmitResult,
  StellarAdapterConfirmRequest,
  StellarAdapterConfirmationResult,
} from "./adapter-contracts";
import type { ConfirmResultValue, StellarRpcPort } from "./stellar-rpc-port";
import type { StellarSignerPort, StellarTimeSource } from "./stellar-signer-port";
import { encodeContractArguments } from "./stellar-sdk-codec";
import { constructUnsignedSorobanTransaction } from "./stellar-transaction-factory";
import type { EscrowAction } from "@/lib/escrow/state-machine";

export interface StellarTestnetAdapterConfig {
  readonly network_passphrase: string;
  readonly contract_id: string;
  readonly custody_contract_id: string;
  readonly testnet_token_contract_id: string;
  readonly base_fee_stroops: number;
  readonly max_fee_stroops: number;
  readonly timeout_seconds: number;
}

export interface StellarTestnetRoleMapping {
  readonly admin_address: string;
  readonly buyer_demo_address: string;
  readonly seller_demo_address: string;
}

const SUBMIT_TIMEOUT_SECONDS_MAX = 600;

function resolveSourceAddress(
  role: StellarSignerRole,
  mapping: StellarTestnetRoleMapping,
): string {
  switch (role) {
    case "admin":
      return mapping.admin_address;
    case "buyer_demo":
      return mapping.buyer_demo_address;
    case "seller_demo":
      return mapping.seller_demo_address;
  }
}

function validateConfig(
  config: StellarTestnetAdapterConfig,
): string | null {
  if (config.network_passphrase !== Networks.TESTNET) {
    return "ERR_INVALID_NETWORK";
  }
  if (
    !Number.isInteger(config.base_fee_stroops) ||
    config.base_fee_stroops <= 0 ||
    !Number.isSafeInteger(config.base_fee_stroops)
  ) {
    return "ERR_INVALID_BASE_FEE";
  }
  if (
    !Number.isInteger(config.max_fee_stroops) ||
    config.max_fee_stroops <= 0 ||
    !Number.isSafeInteger(config.max_fee_stroops)
  ) {
    return "ERR_INVALID_MAX_FEE";
  }
  if (config.base_fee_stroops > config.max_fee_stroops) {
    return "ERR_BASE_EXCEEDS_MAX_FEE";
  }
  if (
    !Number.isInteger(config.timeout_seconds) ||
    config.timeout_seconds <= 0 ||
    config.timeout_seconds > SUBMIT_TIMEOUT_SECONDS_MAX ||
    !Number.isSafeInteger(config.timeout_seconds)
  ) {
    return "ERR_INVALID_TIMEOUT";
  }
  if (!config.contract_id || config.contract_id.trim() === "") {
    return "ERR_MISSING_CONTRACT_ID";
  }
  if (!config.custody_contract_id || config.custody_contract_id.trim() === "") {
    return "ERR_MISSING_CONTRACT_ID";
  }
  if (!config.testnet_token_contract_id || config.testnet_token_contract_id.trim() === "") {
    return "ERR_MISSING_CONTRACT_ID";
  }
  return null;
}

function validateRoleMapping(mapping: StellarTestnetRoleMapping): string | null {
  if (!mapping.admin_address || mapping.admin_address.trim() === "") return "ERR_MISSING_ADMIN_ADDRESS";
  if (!mapping.buyer_demo_address || mapping.buyer_demo_address.trim() === "") return "ERR_MISSING_BUYER_ADDRESS";
  if (!mapping.seller_demo_address || mapping.seller_demo_address.trim() === "") return "ERR_MISSING_SELLER_ADDRESS";
  return null;
}

function extractTransactionFee(tx: Transaction): number | null {
  const feeStr = tx.fee;
  const fee = Number(feeStr);
  if (!Number.isFinite(fee) || !Number.isSafeInteger(fee) || fee < 0) {
    return null;
  }
  return fee;
}

type ParsedNormalTransactionResult =
  | {
      readonly ok: true;
      readonly transaction: Transaction;
    }
  | {
      readonly ok: false;
      readonly reason: "malformed_xdr" | "fee_bump";
    };

function requireNormalTransaction(
  parsed: Transaction | FeeBumpTransaction,
): ParsedNormalTransactionResult {
  if (parsed instanceof FeeBumpTransaction) {
    return { ok: false, reason: "fee_bump" };
  }
  return { ok: true, transaction: parsed };
}

function parseNormalTransactionXdr(
  transactionXdr: string,
  networkPassphrase: string,
): ParsedNormalTransactionResult {
  try {
    return requireNormalTransaction(
      TransactionBuilder.fromXDR(transactionXdr, networkPassphrase),
    );
  } catch {
    return { ok: false, reason: "malformed_xdr" };
  }
}

function readTransactionBody(tx: Transaction): xdr.Transaction | null {
  try {
    const envelope = tx.toEnvelope();
    if (envelope.switch().name !== "envelopeTypeTx") {
      return null;
    }
    return envelope.v1().tx();
  } catch {
    return null;
  }
}

function transactionBodyXdr(tx: Transaction): string | null {
  const body = readTransactionBody(tx);
  return body === null ? null : body.toXDR("base64");
}

interface HostFunctionIntent {
  readonly operation_source_xdr: string | null;
  readonly contract_address_xdr: string;
  readonly function_name: string;
  readonly argument_xdrs: readonly string[];
}

interface TransactionIntent {
  readonly source_account_xdr: string;
  readonly sequence_xdr: string;
  readonly conditions_xdr: string;
  readonly memo_xdr: string;
  readonly operations: readonly HostFunctionIntent[];
}

function readHostFunctionIntent(
  operation: xdr.Operation,
): HostFunctionIntent | null {
  const body = operation.body();
  if (body.switch().name !== "invokeHostFunction") {
    return null;
  }

  const hostFunctionOp = body.invokeHostFunctionOp();
  const hostFunction = hostFunctionOp.hostFunction();
  if (hostFunction.switch().name !== "hostFunctionTypeInvokeContract") {
    return null;
  }

  const invokeContract = hostFunction.invokeContract();
  const sourceAccount = operation.sourceAccount();
  const operationSourceXdr = sourceAccount == null ? null : sourceAccount.toXDR("base64");
  return {
    operation_source_xdr: operationSourceXdr,
    contract_address_xdr: invokeContract.contractAddress().toXDR("base64"),
    function_name: invokeContract.functionName().toString(),
    argument_xdrs: invokeContract.args().map((arg) => arg.toXDR("base64")),
  };
}

function readTransactionIntent(tx: Transaction): TransactionIntent | null {
  const body = readTransactionBody(tx);
  if (body === null) {
    return null;
  }

  const operations: HostFunctionIntent[] = [];
  for (const operation of body.operations()) {
    const operationIntent = readHostFunctionIntent(operation);
    if (operationIntent === null) {
      return null;
    }
    operations.push(operationIntent);
  }

  return {
    source_account_xdr: body.sourceAccount().toXDR("base64"),
    sequence_xdr: body.seqNum().toXDR("base64"),
    conditions_xdr: body.cond().toXDR("base64"),
    memo_xdr: body.memo().toXDR("base64"),
    operations,
  };
}

function sameStringArray(
  left: readonly string[],
  right: readonly string[],
): boolean {
  if (left.length !== right.length) {
    return false;
  }
  return left.every((value, index) => value === right[index]);
}

function sameHostFunctionIntent(
  expected: HostFunctionIntent,
  actual: HostFunctionIntent,
): boolean {
  return (
    expected.operation_source_xdr === actual.operation_source_xdr &&
    expected.contract_address_xdr === actual.contract_address_xdr &&
    expected.function_name === actual.function_name &&
    sameStringArray(expected.argument_xdrs, actual.argument_xdrs)
  );
}

function sameTransactionIntent(
  expectedTx: Transaction,
  actualTx: Transaction,
): boolean {
  const expected = readTransactionIntent(expectedTx);
  const actual = readTransactionIntent(actualTx);
  if (expected === null || actual === null) {
    return false;
  }

  if (
    expected.source_account_xdr !== actual.source_account_xdr ||
    expected.sequence_xdr !== actual.sequence_xdr ||
    expected.conditions_xdr !== actual.conditions_xdr ||
    expected.memo_xdr !== actual.memo_xdr ||
    expected.operations.length !== actual.operations.length
  ) {
    return false;
  }

  for (let index = 0; index < expected.operations.length; index += 1) {
    const expectedOperation = expected.operations[index];
    const actualOperation = actual.operations[index];
    if (
      expectedOperation === undefined ||
      actualOperation === undefined ||
      !sameHostFunctionIntent(expectedOperation, actualOperation)
    ) {
      return false;
    }
  }

  return true;
}

function sameUnsignedTransactionBody(
  expectedTx: Transaction,
  actualTx: Transaction,
): boolean {
  const expectedBodyXdr = transactionBodyXdr(expectedTx);
  const actualBodyXdr = transactionBodyXdr(actualTx);
  return (
    expectedBodyXdr !== null &&
    actualBodyXdr !== null &&
    expectedBodyXdr === actualBodyXdr
  );
}

function verifySignature(
  signed: Transaction,
  expectedAddress: string,
): boolean {
  if (signed.signatures.length === 0) return false;

  const txHash = signed.hash();
  try {
    const expectedKp = Keypair.fromPublicKey(expectedAddress);
    for (const sig of signed.signatures) {
      const hint = sig.hint();
      if (Buffer.from(hint).equals(Buffer.from(expectedKp.signatureHint()))) {
        if (expectedKp.verify(txHash, sig.signature())) {
          return true;
        }
      }
    }
  } catch {
    return false;
  }
  return false;
}

function decodeEscrowIdResultValue(
  resultValue: ConfirmResultValue,
): string | null {
  if (resultValue.switch().name !== "scvU64") {
    return null;
  }
  if (resultValue.u64 === undefined) {
    return null;
  }
  try {
    return resultValue.u64().toString();
  } catch {
    return null;
  }
}

export class StellarTestnetAdapter implements StellarExecutionAdapter {
  constructor(
    private readonly config: StellarTestnetAdapterConfig,
    private readonly roleMapping: StellarTestnetRoleMapping,
    private readonly rpcPort: StellarRpcPort,
    private readonly signerPort: StellarSignerPort,
    private readonly timeSource: StellarTimeSource,
  ) {}

  async submit(
    request: StellarAdapterSubmitRequest,
  ): Promise<StellarAdapterSubmitResult> {
    const { invocation } = request;

    // 1. Validate configuration
    const configErr = validateConfig(this.config);
    if (configErr !== null) {
      return {
        outcome: "failed",
        action: invocation.action,
        stage: "prepare",
        transaction_hash: null,
        error_code: "ERR_INVALID_STATE",
        retryable: false,
      };
    }

    const roleMappingErr = validateRoleMapping(this.roleMapping);
    if (roleMappingErr !== null) {
      return {
        outcome: "failed",
        action: invocation.action,
        stage: "prepare",
        transaction_hash: null,
        error_code: "ERR_INVALID_STATE",
        retryable: false,
      };
    }

    // 2. Verify Testnet network identity
    const networkOk = await this.rpcPort.verifyNetworkIdentity(
      this.config.network_passphrase,
    );
    if (!networkOk) {
      return {
        outcome: "failed",
        action: invocation.action,
        stage: "prepare",
        transaction_hash: null,
        error_code: "ERR_NETWORK_FAILURE",
        retryable: true,
      };
    }

    // 3. Load canonical source account
    console.log("executeAction signer_role:", invocation.signer_role, "mapping:", this.roleMapping); const sourceAddress = resolveSourceAddress(
      invocation.signer_role,
      this.roleMapping,
    );
    const accountResult = await this.rpcPort.loadSourceAccount(sourceAddress);
    if (!accountResult.ok) {
      return {
        outcome: "failed",
        action: invocation.action,
        stage: "prepare",
        transaction_hash: null,
        error_code: "ERR_NETWORK_FAILURE",
        retryable: true,
      };
    }

    // 4. Read injected time once
    const nowUnix = this.timeSource.nowUnixSeconds();
    if (
      !Number.isInteger(nowUnix) ||
      nowUnix < 0 ||
      !Number.isSafeInteger(nowUnix)
    ) {
      return {
        outcome: "failed",
        action: invocation.action,
        stage: "prepare",
        transaction_hash: null,
        error_code: "ERR_INVALID_STATE",
        retryable: false,
      };
    }

    const maxTime = nowUnix + this.config.timeout_seconds;
    if (!Number.isSafeInteger(maxTime)) {
      return {
        outcome: "failed",
        action: invocation.action,
        stage: "prepare",
        transaction_hash: null,
        error_code: "ERR_TIMEOUT",
        retryable: false,
      };
    }

    // 5. Encode arguments
    const codecResult = encodeContractArguments(invocation.arguments);
    if (!codecResult.ok) {
      return {
        outcome: "failed",
        action: invocation.action,
        stage: "prepare",
        transaction_hash: null,
        error_code: "ERR_INVALID_STATE",
        retryable: false,
      };
    }

    // 6. Construct unsigned transaction
    const txResult = constructUnsignedSorobanTransaction({
      source_address: sourceAddress,
      source_sequence: accountResult.sequence,
      network_passphrase: this.config.network_passphrase,
      contract_id: invocation.contract_id,
      method: invocation.method,
      encoded_arguments: codecResult.values,
      base_fee_stroops: this.config.base_fee_stroops,
      min_time_unix: 0,
      max_time_unix: maxTime,
    });
    if (!txResult.ok) {
      return {
        outcome: "failed",
        action: invocation.action,
        stage: "prepare",
        transaction_hash: null,
        error_code: "ERR_INVALID_STATE",
        retryable: false,
      };
    }

    // 7. Parse unsigned transaction for simulation
    const unsignedTxResult = parseNormalTransactionXdr(
      txResult.unsigned_transaction_xdr,
      this.config.network_passphrase,
    );
    if (!unsignedTxResult.ok) {
      return {
        outcome: "failed",
        action: invocation.action,
        stage: "prepare",
        transaction_hash: null,
        error_code: "ERR_INVALID_STATE",
        retryable: false,
      };
    }
    const unsignedTx = unsignedTxResult.transaction;

    // 8. Simulate/prepare transaction
    const simResult = await this.rpcPort.simulateAndPrepareTransaction(unsignedTx);
    if (!simResult.ok) {
      const errCode = simResult.error_code;
      if (errCode === "ERR_AUTH_FAILED") {
        return {
          outcome: "failed",
          action: invocation.action,
          stage: "sign",
          transaction_hash: null,
          error_code: "ERR_AUTH_FAILED",
          retryable: false,
        };
      }
      return {
        outcome: "failed",
        action: invocation.action,
        stage: "simulate",
        transaction_hash: null,
        error_code: errCode === "ERR_CONTRACT_REJECTED" ? "ERR_CONTRACT_REJECTED" : "ERR_NETWORK_FAILURE",
        retryable: errCode === "ERR_NETWORK_FAILURE",
      };
    }

    // 9. Validate RPC-prepared transaction intent and fee
    const preparedTxResult = requireNormalTransaction(simResult.prepared_transaction);
    if (!preparedTxResult.ok) {
      return {
        outcome: "failed",
        action: invocation.action,
        stage: "simulate",
        transaction_hash: null,
        error_code: "ERR_INVALID_STATE",
        retryable: false,
      };
    }
    const preparedTx = preparedTxResult.transaction;
    if (!sameTransactionIntent(unsignedTx, preparedTx)) {
      return {
        outcome: "failed",
        action: invocation.action,
        stage: "simulate",
        transaction_hash: null,
        error_code: "ERR_INVALID_STATE",
        retryable: false,
      };
    }

    const totalFee = extractTransactionFee(preparedTx);
    if (totalFee === null) {
      return {
        outcome: "failed",
        action: invocation.action,
        stage: "simulate",
        transaction_hash: null,
        error_code: "ERR_INVALID_STATE",
        retryable: false,
      };
    }
    if (totalFee > this.config.max_fee_stroops) {
      return {
        outcome: "failed",
        action: invocation.action,
        stage: "simulate",
        transaction_hash: null,
        error_code: "ERR_INVALID_STATE",
        retryable: false,
      };
    }

    // 10. Call signer
    const preparedXdr = preparedTx.toXDR();
    const signResult = await this.signerPort.signTransaction({
      prepared_transaction_xdr: preparedXdr,
      expected_network_passphrase: this.config.network_passphrase,
      signer_role: invocation.signer_role,
      expected_signer_address: sourceAddress,
    });
    if (!signResult.ok) {
      return {
        outcome: "failed",
        action: invocation.action,
        stage: "sign",
        transaction_hash: null,
        error_code: "ERR_AUTH_FAILED",
        retryable: false,
      };
    }

    // 11. Parse signed transaction
    const signedTxResult = parseNormalTransactionXdr(
      signResult.signed_transaction_xdr,
      this.config.network_passphrase,
    );
    if (!signedTxResult.ok) {
      return {
        outcome: "failed",
        action: invocation.action,
        stage: "sign",
        transaction_hash: null,
        error_code: "ERR_AUTH_FAILED",
        retryable: false,
      };
    }
    const signedTx = signedTxResult.transaction;

    // 12. Verify signer only added signatures to the RPC-prepared transaction
    if (!sameUnsignedTransactionBody(preparedTx, signedTx)) {
      return {
        outcome: "failed",
        action: invocation.action,
        stage: "sign",
        transaction_hash: null,
        error_code: "ERR_AUTH_FAILED",
        retryable: false,
      };
    }

    // 13. Verify valid signature from expected address
    const sigValid = verifySignature(
      signedTx,
      sourceAddress,
    );
    if (!sigValid) {
      return {
        outcome: "failed",
        action: invocation.action,
        stage: "sign",
        transaction_hash: null,
        error_code: "ERR_AUTH_FAILED",
        retryable: false,
      };
    }

    // 14. Submit exactly once
    const submitResult = await this.rpcPort.submitTransaction(
      signedTx.toXDR(),
    );

    if (submitResult.ok) {
      return {
        outcome: "submitted",
        action: invocation.action,
        transaction_hash: submitResult.transaction_hash,
      };
    }

    if (submitResult.status === "duplicate") {
      return {
        outcome: "submitted",
        action: invocation.action,
        transaction_hash: submitResult.transaction_hash,
      };
    }

    if (submitResult.status === "retry_later") {
      return {
        outcome: "failed",
        action: invocation.action,
        stage: "submit",
        transaction_hash: null,
        error_code: "ERR_NETWORK_FAILURE",
        retryable: true,
      };
    }

    return {
      outcome: "failed",
      action: invocation.action,
      stage: "submit",
      transaction_hash: null,
      error_code: "ERR_NETWORK_FAILURE",
      retryable: false,
    };
  }

  async confirm(
    request: StellarAdapterConfirmRequest,
  ): Promise<StellarAdapterConfirmationResult> {
    const { action, transaction_hash } = request;

    if (
      !transaction_hash ||
      transaction_hash.trim() === "" ||
      !/^[0-9a-fA-F]{64}$/.test(transaction_hash)
    ) {
      return {
        outcome: "failed",
        action,
        transaction_hash: transaction_hash || "",
        error_code: "ERR_INVALID_STATE",
        retryable: false,
      };
    }

    const result = await this.rpcPort.confirmTransaction(transaction_hash);

    if (result.outcome === "confirmed") {
      if (action === "create_deal" || action === "create_deal_custody") {
        if (result.result_value === null) {
          return {
            outcome: "failed",
            action,
            transaction_hash,
            error_code: "ERR_CONTRACT_REJECTED",
            retryable: false,
          };
        }
        const escrowId = decodeEscrowIdResultValue(result.result_value);
        if (escrowId !== null) {
          return {
            outcome: "confirmed",
            action,
            transaction_hash,
            result_escrow_id: escrowId,
          };
        }
        return {
          outcome: "failed",
          action,
          transaction_hash,
          error_code: "ERR_CONTRACT_REJECTED",
          retryable: false,
        };
      }

      // Transition actions — escrow_id must be null
      if (result.result_value !== null) {
        if (result.result_value.switch().name !== "scvVoid") {
          return {
            outcome: "failed",
            action,
            transaction_hash,
            error_code: "ERR_CONTRACT_REJECTED",
            retryable: false,
          };
        }
      }
      return {
        outcome: "confirmed",
        action: action as EscrowAction, // It must be an EscrowAction because create_deal/create_deal_custody were caught above
        transaction_hash,
        result_escrow_id: null,
      };
    }

    if (result.outcome === "failed") {
      return {
        outcome: "failed",
        action,
        transaction_hash: result.transaction_hash,
        error_code: "ERR_CONTRACT_REJECTED",
        retryable: false,
      };
    }

    if (result.outcome === "not_found") {
      return {
        outcome: "unknown",
        action,
        transaction_hash,
        error_code: "ERR_UNKNOWN",
        reconciliation_required: true,
        resubmission_allowed: false,
      };
    }

    // error
    return {
      outcome: "unknown",
      action,
      transaction_hash,
      error_code: "ERR_NETWORK_FAILURE",
      reconciliation_required: true,
      resubmission_allowed: false,
    };
  }
}
