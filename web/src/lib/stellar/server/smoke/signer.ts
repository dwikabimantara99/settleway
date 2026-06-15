import {
  FeeBumpTransaction,
  Transaction,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import type { StellarSignerRole } from "../action-policy";
import type {
  StellarSignerPort,
  StellarSignRequest,
  StellarSignResult,
} from "../stellar-signer-port";

export interface SmokeRoleTransactionSigner {
  readonly public_key: string;
  signTransaction(transaction: Transaction, networkPassphrase: string): string;
}

export interface SmokeRoleSigners {
  readonly admin: SmokeRoleTransactionSigner;
  readonly buyer_demo: SmokeRoleTransactionSigner;
  readonly seller_demo: SmokeRoleTransactionSigner;
}

export type SmokeRoleSignerInput = Readonly<
  Partial<Record<StellarSignerRole, SmokeRoleTransactionSigner>>
>;

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

function roleSigner(
  role: StellarSignerRole,
  signers: SmokeRoleSignerInput,
): SmokeRoleTransactionSigner | null {
  switch (role) {
    case "admin":
      return signers.admin ?? null;
    case "buyer_demo":
      return signers.buyer_demo ?? null;
    case "seller_demo":
      return signers.seller_demo ?? null;
  }
}

export class InjectedSmokeSignerPort implements StellarSignerPort {
  constructor(
    private readonly networkPassphrase: string,
    private readonly signers: SmokeRoleSignerInput,
  ) {}

  async signTransaction(request: StellarSignRequest): Promise<StellarSignResult> {
    if (request.expected_network_passphrase !== this.networkPassphrase) {
      return { ok: false, error_code: "ERR_SIGNER_REJECTED" };
    }

    const signer = roleSigner(request.signer_role, this.signers);
    if (signer === null) {
      return { ok: false, error_code: "ERR_SIGNER_UNAVAILABLE" };
    }

    if (signer.public_key !== request.expected_signer_address) {
      return { ok: false, error_code: "ERR_SIGNER_REJECTED" };
    }

    const prepared = parseNormalTransaction(
      request.prepared_transaction_xdr,
      request.expected_network_passphrase,
    );
    if (prepared === null) {
      return { ok: false, error_code: "ERR_SIGNER_REJECTED" };
    }

    let signedTransactionXdr: string;
    try {
      signedTransactionXdr = signer.signTransaction(
        prepared,
        request.expected_network_passphrase,
      );
    } catch {
      return { ok: false, error_code: "ERR_SIGNER_REJECTED" };
    }

    const signed = parseNormalTransaction(
      signedTransactionXdr,
      request.expected_network_passphrase,
    );
    if (signed === null) {
      return { ok: false, error_code: "ERR_SIGNER_REJECTED" };
    }

    return {
      ok: true,
      signed_transaction_xdr: signed.toXDR(),
    };
  }
}
