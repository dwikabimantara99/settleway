import { Keypair, TransactionBuilder, Account, Asset, Operation, Networks } from '@stellar/stellar-sdk';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ProfileWalletSigner } from './profile-wallet-signer';
import { encryptStellarSecret } from '@/lib/auth/server-crypto';

// Setup mock for server-crypto if necessary, but we can also rely on environment variables if we mock them.
// We must mock WALLET_ENCRYPTION_KEY to allow encryptStellarSecret to work in tests.

describe('ProfileWalletSigner', () => {
  const originalEnv = process.env;

  beforeAll(() => {
    process.env = {
      ...originalEnv,
      WALLET_ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should initialize with an encrypted secret and provide the correct public key', () => {
    const keypair = Keypair.random();
    const encrypted = encryptStellarSecret(keypair.secret());
    
    const signer = new ProfileWalletSigner(encrypted);
    expect(signer.getPublicKey()).toBe(keypair.publicKey());
  });

  it('should reject signing if the expected address does not match', async () => {
    const keypair = Keypair.random();
    const encrypted = encryptStellarSecret(keypair.secret());
    const signer = new ProfileWalletSigner(encrypted);

    const result = await signer.signTransaction({
      prepared_transaction_xdr: 'fake_xdr',
      expected_network_passphrase: Networks.TESTNET,
      signer_role: 'buyer_demo',
      expected_signer_address: Keypair.random().publicKey(), // Mismatched address
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error_code).toBe('ERR_SIGNER_REJECTED');
    }
  });

  it('should reject signing if the encrypted secret is DEMO_PUBLIC_ONLY', async () => {
    const signer = new ProfileWalletSigner('DEMO_PUBLIC_ONLY');

    const result = await signer.signTransaction({
      prepared_transaction_xdr: 'fake_xdr',
      expected_network_passphrase: Networks.TESTNET,
      signer_role: 'buyer_demo',
      expected_signer_address: 'fake_pub_key',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error_code).toBe('ERR_SIGNER_REJECTED');
    }
  });

  it('should sign a valid transaction when the expected address matches', async () => {
    const keypair = Keypair.random();
    const encrypted = encryptStellarSecret(keypair.secret());
    const signer = new ProfileWalletSigner(encrypted);

    // Build a synthetic unsigned transaction
    const builder = new TransactionBuilder(new Account(keypair.publicKey(), '1'), {
      fee: '100',
      networkPassphrase: Networks.TESTNET,
    });
    builder.addOperation(
      Operation.payment({
        destination: keypair.publicKey(),
        asset: Asset.native(),
        amount: '1',
      })
    );
    builder.setTimebounds(0, 1);
    const unsignedTx = builder.build();

    const result = await signer.signTransaction({
      prepared_transaction_xdr: unsignedTx.toXDR(),
      expected_network_passphrase: Networks.TESTNET,
      signer_role: 'buyer_demo',
      expected_signer_address: keypair.publicKey(),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const signedTx = TransactionBuilder.fromXDR(result.signed_transaction_xdr, Networks.TESTNET);
      expect(signedTx.signatures.length).toBe(1);
    }
  });
});
