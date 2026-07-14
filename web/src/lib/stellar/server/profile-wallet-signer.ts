import 'server-only';
import {
  Keypair,
  Transaction,
  TransactionBuilder,
  FeeBumpTransaction,
  authorizeEntry,
  StrKey,
} from '@stellar/stellar-sdk';
import type { StellarSignerPort, StellarSignRequest, StellarSignResult } from './stellar-signer-port';
import { decryptStellarSecret } from '@/lib/auth/server-crypto';

// How many extra ledgers to add to current_ledger when computing validUntilLedgerSeq.
// Testnet produces ~1 ledger per 5 seconds; 100 ledgers ≈ 8 minutes gives ample headroom.
const AUTH_LEDGER_BUFFER = 100;

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

/**
 * Extract the Stellar public key (G...) from a SorobanAuthorizationEntry with address credentials.
 * Returns null if the address is a contract or cannot be decoded.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractAddressFromAuthEntry(entry: any): string | null {

  try {
    const creds = entry.credentials();
    if (creds.switch().name !== 'sorobanCredentialsAddress') return null;
    const scAddr = creds.address().address();
    if (scAddr.switch().name !== 'scAddressTypeAccount') return null;
    const rawKey = scAddr.accountId().ed25519();
    return StrKey.encodeEd25519PublicKey(Buffer.from(rawKey));
  } catch {
    return null;
  }
}

/**
 * Sign all Soroban auth entries in a prepared transaction that require signing
 * by the given keypair (matched by public key). This is required for any contract
 * call that uses `require_auth()` for participant addresses.
 *
 * Uses the SDK's authorizeEntry which handles the preimage construction and signing.
 */
async function signSorobanAuthEntries(
  transaction: Transaction,
  keypair: Keypair,
  networkPassphrase: string,
  validUntilLedgerSeq: number,
): Promise<void> {
  const operations = transaction.toEnvelope().v1().tx().operations();
  for (const operation of operations) {
    const body = operation.body();
    if (body.switch().name !== 'invokeHostFunction') continue;
    const authEntries = body.invokeHostFunctionOp().auth();
    for (let i = 0; i < authEntries.length; i++) {
      const entry = authEntries[i];
      const entryAddress = extractAddressFromAuthEntry(entry);
      if (entryAddress === null) continue;
      if (entryAddress !== keypair.publicKey()) continue;

      console.log(`Signing auth entry for address ${entryAddress} at ledger ${validUntilLedgerSeq}`);
      // authorizeEntry sets the signatureExpirationLedger, builds the preimage, and signs
      const signed = await authorizeEntry(
        entry,
        keypair,
        validUntilLedgerSeq,
        networkPassphrase,
      );
      authEntries[i] = signed;
    }
  }
}

export class ProfileWalletSigner implements StellarSignerPort {
  private readonly keypair: Keypair | null = null;
  private readonly demoPublicKey: string | null = null;

  constructor(encryptedSecret: string, demoPublicKeyFallback?: string, encryptionVersion?: string) {
    if (encryptedSecret === 'DEMO_PUBLIC_ONLY') {
      this.demoPublicKey = demoPublicKeyFallback || null;
      return;
    }
    const decrypted = decryptStellarSecret(encryptedSecret, encryptionVersion);
    this.keypair = Keypair.fromSecret(decrypted);
  }

  public getPublicKey(): string {
    if (this.keypair) return this.keypair.publicKey();
    if (this.demoPublicKey) return this.demoPublicKey;
    return '';
  }

  async signTransaction(request: StellarSignRequest): Promise<StellarSignResult> {
    if (!this.keypair) {
      return { ok: false, error_code: 'ERR_SIGNER_REJECTED' };
    }

    if (request.expected_signer_address !== this.getPublicKey()) {
      console.error(`ProfileWalletSigner rejected: expected ${request.expected_signer_address}, got ${this.getPublicKey()}`);
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
      // Sign Soroban auth entries that require this signer's authorization.
      // validUntilLedgerSeq comes from simulation current_ledger + AUTH_LEDGER_BUFFER.
      const validUntil = (request.valid_until_ledger_seq ?? 0) > 0
        ? (request.valid_until_ledger_seq ?? 0) + AUTH_LEDGER_BUFFER
        : AUTH_LEDGER_BUFFER;
      await signSorobanAuthEntries(
        transaction,
        this.keypair,
        request.expected_network_passphrase,
        validUntil,
      );

      // Sign the transaction envelope (source account authorization)
      transaction.sign(this.keypair);
      return {
        ok: true,
        signed_transaction_xdr: transaction.toXDR(),
      };
    } catch (e) {
      console.error('ProfileWalletSigner signing error:', e);
      return { ok: false, error_code: 'ERR_SIGNER_REJECTED' };
    }
  }
}

export class PlatformWalletSigner implements StellarSignerPort {
  private readonly keypair: Keypair | null = null;

  constructor() {
    const secret = process.env.STELLAR_PLATFORM_SECRET;
    if (secret && secret.trim()) {
      this.keypair = Keypair.fromSecret(secret.trim());
    }
  }

  public getPublicKey(): string {
    return this.keypair ? this.keypair.publicKey() : '';
  }

  async signTransaction(request: StellarSignRequest): Promise<StellarSignResult> {
    if (!this.keypair) {
      return { ok: false, error_code: 'ERR_SIGNER_REJECTED' };
    }

    if (request.expected_signer_address !== this.getPublicKey()) {
      console.error(`PlatformWalletSigner rejected: expected ${request.expected_signer_address}, got ${this.getPublicKey()}`);
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
      // Sign Soroban auth entries that require the platform signer's authorization.
      const validUntil = (request.valid_until_ledger_seq ?? 0) > 0
        ? (request.valid_until_ledger_seq ?? 0) + AUTH_LEDGER_BUFFER
        : AUTH_LEDGER_BUFFER;
      await signSorobanAuthEntries(
        transaction,
        this.keypair,
        request.expected_network_passphrase,
        validUntil,
      );

      // Sign the transaction envelope (source account authorization)
      transaction.sign(this.keypair);
      return {
        ok: true,
        signed_transaction_xdr: transaction.toXDR(),
      };
    } catch (e) {
      console.error('PlatformWalletSigner signing error:', e);
      return { ok: false, error_code: 'ERR_SIGNER_REJECTED' };
    }
  }
}
