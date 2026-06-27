import type { Transaction, FeeBumpTransaction } from "@stellar/stellar-sdk";

// --- Network Identity ---

export interface RpcNetworkIdentityResult {
  readonly passphrase: string;
}

// --- Source Account ---

export type RpcSourceAccountResult =
  | { readonly ok: true; readonly sequence: string }
  | { readonly ok: false };

// --- Simulation / Preparation ---

export type SimulatedTransactionResult =
  | {
      readonly ok: true;
      readonly prepared_transaction: Transaction | FeeBumpTransaction;
    }
  | {
      readonly ok: false;
      readonly error_code: "ERR_CONTRACT_REJECTED" | "ERR_AUTH_FAILED" | "ERR_NETWORK_FAILURE";
    };

// --- Submission ---

export type SubmitTransactionResult =
  | { readonly ok: true; readonly transaction_hash: string }
  | { readonly ok: false; readonly status: "duplicate"; readonly transaction_hash: string }
  | { readonly ok: false; readonly status: "retry_later" }
  | { readonly ok: false; readonly status: "rejected"; readonly error_code: string }
  | { readonly ok: false; readonly status: "error"; readonly error_code: "ERR_NETWORK_FAILURE" };

// --- Confirmation ---

export type ConfirmTransactionResult =
  | {
      readonly outcome: "confirmed";
      readonly transaction_hash: string;
      readonly ledger: number | null;
      readonly result_value: ConfirmResultValue | null;
    }
  | {
      readonly outcome: "failed";
      readonly transaction_hash: string;
    }
  | {
      readonly outcome: "not_found";
    }
  | {
      readonly outcome: "error";
      readonly error_code: "ERR_NETWORK_FAILURE";
    };

export interface ConfirmResultValue {
  switch(): { name: string };
  u64?(): { toString(): string };
}

// --- Port ---

export interface StellarRpcPort {
  verifyNetworkIdentity(expectedPassphrase: string): Promise<boolean>;

  loadSourceAccount(address: string): Promise<RpcSourceAccountResult>;

  simulateAndPrepareTransaction(
    transaction: Transaction,
  ): Promise<SimulatedTransactionResult>;

  submitTransaction(
    signedXdr: string,
  ): Promise<SubmitTransactionResult>;

  confirmTransaction(
    transactionHash: string,
  ): Promise<ConfirmTransactionResult>;
}
