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
    private readonly maxAttempts: number = 30,
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
      for (let attempt = 0; attempt < this.maxAttempts; attempt += 1) {
        const response = await this.server.getTransaction(transactionHash);
        const status = response.status;

        if (status === "SUCCESS") {
          const resultValue = response.returnValue ?? null;
          return {
            outcome: "confirmed",
            transaction_hash: transactionHash,
            result_value: resultValue as ConfirmTransactionResult extends { outcome: "confirmed" } ? ConfirmTransactionResult["result_value"] : never,
          };
        }
        if (status === "FAILED") {
          return { outcome: "failed", transaction_hash: transactionHash };
        }
        if (status === "NOT_FOUND") {
          await new Promise((resolve) => setTimeout(resolve, 3000));
          continue;
        }
      }
      return { outcome: "not_found" };
    } catch {
      return { outcome: "error", error_code: "ERR_NETWORK_FAILURE" };
    }
  }
}
