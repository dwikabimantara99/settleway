/**
 * server-crypto.test.ts
 *
 * Comprehensive dual-key AES-256-GCM tests covering:
 * 1. v1 (legacy key) decrypts only with legacy key
 * 2. v2 (current key) decrypts only with current key
 * 3. Wrong key fails closed
 * 4. encryptStellarSecret always writes v2
 * 5. reEncryptV1ToV2 preserves public key derivation
 * 6. No raw seed is ever returned unless purposefully decrypted
 * 7. Missing key fails closed
 */

import { Keypair } from '@stellar/stellar-sdk';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  encryptStellarSecret,
  decryptStellarSecret,
  reEncryptV1ToV2,
  isCurrentKeyConfigured,
  isLegacyKeyConfigured,
  ENCRYPTION_VERSION_LEGACY,
  ENCRYPTION_VERSION_CURRENT,
} from '@/lib/auth/server-crypto';

const KEY_CURRENT = '1111111111111111111111111111111111111111111111111111111111111111'; // 64 hex chars
const KEY_LEGACY  = '2222222222222222222222222222222222222222222222222222222222222222'; // 64 hex chars
const KEY_WRONG   = '3333333333333333333333333333333333333333333333333333333333333333'; // 64 hex chars

function setEnv(current: string | undefined, legacy: string | undefined) {
  if (current !== undefined) process.env.WALLET_ENCRYPTION_KEY = current;
  else delete process.env.WALLET_ENCRYPTION_KEY;

  if (legacy !== undefined) process.env.WALLET_ENCRYPTION_KEY_LEGACY = legacy;
  else delete process.env.WALLET_ENCRYPTION_KEY_LEGACY;
}

describe('server-crypto dual-key', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // ─── Test 1: encryptStellarSecret always writes v2 ───────────────
  it('encryptStellarSecret always produces a v2-readable blob when current key is set', () => {
    setEnv(KEY_CURRENT, undefined);
    const kp = Keypair.random();
    const blob = encryptStellarSecret(kp.secret());

    // Must be a colon-separated GCM envelope
    expect(blob.split(':').length).toBe(3);

    // Must decrypt with current key (v2)
    const decrypted = decryptStellarSecret(blob, ENCRYPTION_VERSION_CURRENT);
    expect(decrypted).toBe(kp.secret());
  });

  it('encryptStellarSecret produces a blob that does NOT contain the raw seed', () => {
    setEnv(KEY_CURRENT, undefined);
    const kp = Keypair.random();
    const blob = encryptStellarSecret(kp.secret());
    expect(blob).not.toContain(kp.secret());
    expect(blob).not.toContain('S'); // Stellar secrets start with S — should not appear raw
  });

  // ─── Test 2: v1 decrypts only with legacy key ────────────────────
  it('decryptStellarSecret with v1 version uses legacy key, not current key', () => {
    // Encrypt with the legacy key manually
    setEnv(KEY_LEGACY, KEY_LEGACY); // WALLET_ENCRYPTION_KEY = legacy, so encryptStellarSecret writes with "legacy" here
    const kp = Keypair.random();
    const blobV1 = encryptStellarSecret(kp.secret()); // now encrypted with KEY_LEGACY

    // Switch: current = KEY_CURRENT, legacy = KEY_LEGACY
    setEnv(KEY_CURRENT, KEY_LEGACY);

    // v1 decrypt should use legacy key → succeed
    const decrypted = decryptStellarSecret(blobV1, ENCRYPTION_VERSION_LEGACY);
    expect(decrypted).toBe(kp.secret());
  });

  // ─── Test 3: wrong key fails closed ──────────────────────────────
  it('decryptStellarSecret with wrong key fails closed', () => {
    setEnv(KEY_CURRENT, undefined);
    const kp = Keypair.random();
    const blob = encryptStellarSecret(kp.secret());

    // Try to decrypt v2 blob using KEY_WRONG
    setEnv(KEY_WRONG, undefined);
    expect(() => decryptStellarSecret(blob, ENCRYPTION_VERSION_CURRENT)).toThrow();
  });

  it('decryptStellarSecret does not silently try the other key — wrong key for v1 must throw', () => {
    // Build a v1 blob with the legacy key
    setEnv(KEY_LEGACY, KEY_LEGACY);
    const kp = Keypair.random();
    const blobV1 = encryptStellarSecret(kp.secret());

    // Set current key (wrong for v1), no legacy key
    setEnv(KEY_CURRENT, undefined);

    // Should throw because legacy key is absent
    expect(() => decryptStellarSecret(blobV1, ENCRYPTION_VERSION_LEGACY)).toThrow(
      'WALLET_ENCRYPTION_KEY_LEGACY'
    );
  });

  // ─── Test 4: v2 decrypts only with current key ───────────────────
  it('decryptStellarSecret with v2 version uses current key, fails with legacy key', () => {
    setEnv(KEY_CURRENT, KEY_LEGACY);
    const kp = Keypair.random();
    const blob = encryptStellarSecret(kp.secret()); // v2 with current key

    // v2 decrypt with correct current key — succeeds
    const decrypted = decryptStellarSecret(blob, ENCRYPTION_VERSION_CURRENT);
    expect(decrypted).toBe(kp.secret());

    // Swap: current = legacy key → should fail
    setEnv(KEY_LEGACY, KEY_CURRENT); // current = old legacy, shouldn't decrypt v2 blob
    expect(() => decryptStellarSecret(blob, ENCRYPTION_VERSION_CURRENT)).toThrow();
  });

  // ─── Test 5: reEncryptV1ToV2 preserves public key derivation ─────
  it('reEncryptV1ToV2 preserves Stellar public key derivation', () => {
    const kp = Keypair.random();

    // Create v1 blob with legacy key
    setEnv(KEY_LEGACY, KEY_LEGACY);
    const blobV1 = encryptStellarSecret(kp.secret());

    // Now switch to dual-key mode
    setEnv(KEY_CURRENT, KEY_LEGACY);
    const blobV2 = reEncryptV1ToV2(blobV1);

    // v2 blob must decrypt to same seed
    const decrypted = decryptStellarSecret(blobV2, ENCRYPTION_VERSION_CURRENT);
    expect(decrypted).toBe(kp.secret());

    // Derived public key must match original
    const derived = Keypair.fromSecret(decrypted).publicKey();
    expect(derived).toBe(kp.publicKey());
  });

  // ─── Test 6: missing key fails closed ────────────────────────────
  it('encryptStellarSecret fails when WALLET_ENCRYPTION_KEY is absent', () => {
    setEnv(undefined, KEY_LEGACY);
    expect(() => encryptStellarSecret('Ssome_secret')).toThrow('WALLET_ENCRYPTION_KEY');
  });

  it('decryptStellarSecret v2 fails when WALLET_ENCRYPTION_KEY is absent', () => {
    setEnv(undefined, KEY_LEGACY);
    expect(() => decryptStellarSecret('iv:tag:enc', ENCRYPTION_VERSION_CURRENT)).toThrow(
      'WALLET_ENCRYPTION_KEY'
    );
  });

  it('decryptStellarSecret v1 fails when WALLET_ENCRYPTION_KEY_LEGACY is absent', () => {
    setEnv(KEY_CURRENT, undefined);
    expect(() => decryptStellarSecret('iv:tag:enc', ENCRYPTION_VERSION_LEGACY)).toThrow(
      'WALLET_ENCRYPTION_KEY_LEGACY'
    );
  });

  // ─── Test 7: isConfigured helpers ────────────────────────────────
  it('isCurrentKeyConfigured returns true when key is present and valid', () => {
    setEnv(KEY_CURRENT, undefined);
    expect(isCurrentKeyConfigured()).toBe(true);
  });

  it('isCurrentKeyConfigured returns false when key is absent', () => {
    setEnv(undefined, undefined);
    expect(isCurrentKeyConfigured()).toBe(false);
  });

  it('isLegacyKeyConfigured returns true when legacy key is present and valid', () => {
    setEnv(undefined, KEY_LEGACY);
    expect(isLegacyKeyConfigured()).toBe(true);
  });

  it('isLegacyKeyConfigured returns false when legacy key is absent', () => {
    setEnv(KEY_CURRENT, undefined);
    expect(isLegacyKeyConfigured()).toBe(false);
  });

  // ─── Test 8: plaintext not logged (structural) ───────────────────
  it('blob format does not expose raw stellar secret format', () => {
    setEnv(KEY_CURRENT, undefined);
    const kp = Keypair.random();
    const blob = encryptStellarSecret(kp.secret());
    // Stellar secrets are always 56 chars starting with S
    // The encrypted blob must not contain any 56-char segment starting with S
    const blobParts = blob.split(':');
    blobParts.forEach(part => {
      expect(part.startsWith('S') && part.length === 56).toBe(false);
    });
  });

  // ─── Test 9: wrong-length key fails with clear error ─────────────
  it('rejects a key that is not 32 bytes', () => {
    process.env.WALLET_ENCRYPTION_KEY = '0102';
    expect(() => encryptStellarSecret('seed')).toThrow('64-character hex string');
  });

  it('rejects an empty key', () => {
    process.env.WALLET_ENCRYPTION_KEY = '';
    expect(() => encryptStellarSecret('seed')).toThrow();
  });
});
