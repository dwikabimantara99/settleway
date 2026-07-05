import { generateAndEncryptProfileWallet } from '../server/provisioning';
import { decryptStellarSecret } from '../../auth/server-crypto';
import { Keypair } from '@stellar/stellar-sdk';
import { describe, it, expect, beforeEach, afterAll } from 'vitest';

describe('Wallet Provisioning', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.WALLET_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('generates a valid keypair and encrypts the secret', () => {
    const userId = 'user-123';
    const wallet = generateAndEncryptProfileWallet(userId);

    expect(wallet.user_id).toBe(userId);
    expect(wallet.public_address.length).toBe(56);
    expect(wallet.public_address.startsWith('G')).toBe(true);
    expect(wallet.encryption_version).toBe('aes-256-gcm-v1');
    expect(wallet.status).toBe('active');

    expect(wallet.encrypted_secret_key).not.toContain('S'); // should not expose plaintext seed

    // Verify decryptability
    const decrypted = decryptStellarSecret(wallet.encrypted_secret_key);
    expect(decrypted.length).toBe(56);
    expect(decrypted.startsWith('S')).toBe(true);

    // Verify it matches the public key
    const kp = Keypair.fromSecret(decrypted);
    expect(kp.publicKey()).toBe(wallet.public_address);
  });

  it('fails closed when WALLET_ENCRYPTION_KEY is missing', () => {
    delete process.env.WALLET_ENCRYPTION_KEY;
    expect(() => generateAndEncryptProfileWallet('user-123')).toThrow('WALLET_ENCRYPTION_KEY is not defined');
  });

  it('fails if WALLET_ENCRYPTION_KEY is the wrong length', () => {
    process.env.WALLET_ENCRYPTION_KEY = 'too-short';
    expect(() => generateAndEncryptProfileWallet('user-123')).toThrow('64-character hex string');
  });
});
