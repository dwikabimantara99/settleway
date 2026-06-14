import {
  TransactionBuilder,
  Networks,
  Keypair,
  Transaction,
  xdr,
} from "@stellar/stellar-sdk";
import type { StellarAction } from "@/lib/stellar/types";
import type { StellarSignerRole } from "./action-policy";
import type {
  StellarExecutionAdapter,
  StellarAdapterSubmitRequest,
  StellarAdapterSubmitResult,
  StellarAdapterConfirmRequest,
  StellarAdapterConfirmationResult,
} from "./adapter-contracts";
import type { StellarRpcPort } from "./stellar-rpc-port";
import type { StellarSignerPort, StellarTimeSource } from "./stellar-signer-port";
import { encodeContractArguments, decodeEscrowIdResult } from "./stellar-sdk-codec";
import { constructUnsignedSorobanTransaction } from "./stellar-transaction-factory";

export interface StellarTestnetAdapterConfig {
  readonly network_passphrase: string;
  readonly contract_id: string;
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

function verifyTransactionSemantics(
  original: Transaction,
  signed: Transaction,
): string | null {
  if (original.source !== signed.source) return "ERR_SOURCE_CHANGED";
  if (original.sequence !== signed.sequence) return "ERR_SEQUENCE_CHANGED";
  if (signed.operations.length !== 1) return "ERR_OPERATION_COUNT_CHANGED";

  const op = signed.operations[0];
  if (op.type !== "invokeHostFunction") return "ERR_OPERATION_TYPE_CHANGED";

  return null;
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
    const sourceAddress = resolveSourceAddress(
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
    const unsignedTx = TransactionBuilder.fromXDR(
      txResult.unsigned_transaction_xdr,
      this.config.network_passphrase,
    ) as Transaction;

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

    // 9. Validate fee
    const preparedTx = simResult.prepared_transaction as Transaction;
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
    let signedTx: Transaction;
    try {
      signedTx = TransactionBuilder.fromXDR(
        signResult.signed_transaction_xdr,
        this.config.network_passphrase,
      ) as Transaction;
    } catch {
      return {
        outcome: "failed",
        action: invocation.action,
        stage: "sign",
        transaction_hash: null,
        error_code: "ERR_AUTH_FAILED",
        retryable: false,
      };
    }

    // 12. Verify semantics unchanged
    const semanticErr = verifyTransactionSemantics(
      preparedTx,
      signedTx,
    );
    if (semanticErr !== null) {
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
      if (action === "create_deal") {
        if (result.result_value === null) {
          return {
            outcome: "failed",
            action,
            transaction_hash,
            error_code: "ERR_CONTRACT_REJECTED",
            retryable: false,
          };
        }
        try {
          const escrowId = decodeEscrowIdResult(
            result.result_value as xdr.ScVal,
          );
          return {
            outcome: "confirmed",
            action: "create_deal",
            transaction_hash,
            result_escrow_id: escrowId,
          };
        } catch {
          return {
            outcome: "failed",
            action,
            transaction_hash,
            error_code: "ERR_CONTRACT_REJECTED",
            retryable: false,
          };
        }
      }

      // Transition actions — escrow_id must be null
      if (result.result_value !== null) {
        const switchName = (result.result_value as { switch(): { name: string } }).switch().name;
        if (switchName !== "scvVoid") {
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
        action: action as Exclude<StellarAction, "create_deal">,
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
