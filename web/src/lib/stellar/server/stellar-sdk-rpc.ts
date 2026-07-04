import {
  rpc,
  TransactionBuilder,
  Transaction,
} from "@stellar/stellar-sdk";
import type {
  StellarRpcPort,
  RpcSourceAccountResult,
  SimulatedTransactionResult,
  SubmitTransactionResult,
  ConfirmTransactionResult,
} from "./stellar-rpc-port";

export class StellarSdkRpc implements StellarRpcPort {
  private readonly server: rpc.Server;

  constructor(
    rpcUrl: string,
    private readonly expectedPassphrase: string,
  ) {
    this.server = new rpc.Server(rpcUrl, { allowHttp: false });
  }

  async verifyNetworkIdentity(expectedPassphrase: string): Promise<boolean> {
    try {
      const network = await this.server.getNetwork();
      return network.passphrase === expectedPassphrase;
    } catch {
      return false;
    }
  }

  async loadSourceAccount(
    address: string,
  ): Promise<RpcSourceAccountResult> {
    try {
      const account = await this.server.getAccount(address);
      return { ok: true, sequence: account.sequenceNumber() };
    } catch {
      return { ok: false };
    }
  }

  async simulateAndPrepareTransaction(
    transaction: Transaction,
  ): Promise<SimulatedTransactionResult> {
    try {
      const sim = await this.server.simulateTransaction(transaction);
      if (rpc.Api.isSimulationError(sim)) {
        return { ok: false, error_code: "ERR_CONTRACT_REJECTED" };
      }
      const results = (sim as rpc.Api.SimulateTransactionSuccessResponse).result?.auth || [];
      for (const auth of results) {
        const credentials = auth.credentials();
        if (credentials.switch().name === "sorobanCredentialsAddress") {
          return { ok: false, error_code: "ERR_AUTH_FAILED" };
        }
      }
      const preparedTransaction = await this.server.prepareTransaction(transaction);
      return { ok: true, prepared_transaction: preparedTransaction };
    } catch {
      return { ok: false, error_code: "ERR_NETWORK_FAILURE" };
    }
  }

  async submitTransaction(
    signedXdr: string,
  ): Promise<SubmitTransactionResult> {
    try {
      const tx = TransactionBuilder.fromXDR(
        signedXdr,
        this.expectedPassphrase,
      );
      const response = await this.server.sendTransaction(tx);
      const status = response.status;
      const hash = response.hash;

      if (status === "PENDING") {
        return { ok: true, transaction_hash: hash };
      }
      if (status === "DUPLICATE") {
        return { ok: false, status: "duplicate", transaction_hash: hash };
      }
      if (status === "TRY_AGAIN_LATER") {
        return { ok: false, status: "retry_later" };
      }
      return { ok: false, status: "rejected", error_code: status };
    } catch {
      return { ok: false, status: "error", error_code: "ERR_NETWORK_FAILURE" };
    }
  }

  async confirmTransaction(
    transactionHash: string,
  ): Promise<ConfirmTransactionResult> {
    try {
      const response = await this.server.getTransaction(transactionHash);
      const status = response.status;

      if (status === "SUCCESS") {
        const resultValue = response.returnValue ?? null;
        return {
          outcome: "confirmed",
          transaction_hash: transactionHash,
          ledger: typeof response.ledger === "number" ? response.ledger : null,
          result_value: resultValue as ConfirmTransactionResult extends { outcome: "confirmed" } ? ConfirmTransactionResult["result_value"] : never,
        };
      }
      if (status === "FAILED") {
        const resultXdr = (response as { resultXdr?: { toString(): string }, resultMetaXdr?: { toString(): string } }).resultXdr?.toString() || (response as { resultXdr?: { toString(): string }, resultMetaXdr?: { toString(): string } }).resultMetaXdr?.toString();
        return { outcome: "failed", transaction_hash: transactionHash, result_xdr: resultXdr };
      }
      if (status === "NOT_FOUND") {
        return { outcome: "not_found" };
      }
      return { outcome: "not_found" };
    } catch {
      return { outcome: "error", error_code: "ERR_NETWORK_FAILURE" };
    }
  }
}
