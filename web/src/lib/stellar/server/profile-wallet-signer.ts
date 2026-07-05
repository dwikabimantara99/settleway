import { Keypair, Transaction, TransactionBuilder, FeeBumpTransaction } from '@stellar/stellar-sdk';
import type { StellarSignerRole } from './action-policy';
import type { StellarSignerPort, StellarSignRequest, StellarSignResult } from './stellar-signer-port';
import { decryptStellarSecret } from '@/lib/auth/server-crypto';

function parseNormalTransaction(
  transactionXdr: string,
  networkPassphrase: string,
): Transaction | null {
  try {
    const parsed = TransactionBuilder.fromXDR(transactionXdr, networkPassphrase);
    if (parsed instanceof FeeBumpTransaction) {
      return null;
    }
    return parsed as Transaction;
  } catch {
    return null;
  }
}

export class ProfileWalletSigner implements StellarSignerPort {
  private readonly keypair: Keypair;

  constructor(encryptedSecret: string) {
    const decrypted = decryptStellarSecret(encryptedSecret);
    this.keypair = Keypair.fromSecret(decrypted);
  }

  public getPublicKey(): string {
    return this.keypair.publicKey();
  }

  async signTransaction(request: StellarSignRequest): Promise<StellarSignResult> {
    if (request.expected_signer_address !== this.getPublicKey()) {
      return { ok: false, error_code: 'ERR_SIGNER_REJECTED' };
    }

    const transaction = parseNormalTransaction(
      request.prepared_transaction_xdr,
      request.expected_network_passphrase,
    );
    if (transaction === null) {
      return { ok: false, error_code: 'ERR_SIGNER_REJECTED' };
    }

    try {
      transaction.sign(this.keypair);
      return {
        ok: true,
        signed_transaction_xdr: transaction.toXDR(),
      };
    } catch {
      return { ok: false, error_code: 'ERR_SIGNER_REJECTED' };
    }
  }
}
