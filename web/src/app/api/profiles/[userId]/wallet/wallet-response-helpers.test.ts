/**
 * Tests for wallet-response-helpers.ts
 *
 * These are pure unit tests — no network, no Supabase, no Next.js runtime.
 * They directly lock the Profile Wallet crash fix:
 *
 *   - The demo mode fallback returns safe public wallet data only.
 *   - The response never includes secret_key, encrypted_secret_key, private_key,
 *     seed, mnemonic, or raw custody material.
 *   - Missing WALLET_ENCRYPTION_KEY in demo mode does not crash the route
 *     (instead resolveDemoWalletFallback returns a valid SafeWalletResponse).
 *   - Missing WALLET_ENCRYPTION_KEY in non-demo mode is NOT silently ignored:
 *     the caller must handle the null return from resolveDemoWalletFallback
 *     and propagate the error explicitly.
 *   - ProfileWalletCard no longer throws an uncaught Error on non-ok response:
 *     mapWalletLoadError provides a safe UI string instead.
 */
import { describe, expect, it } from 'vitest';
import {
  mapWalletLoadError,
  resolveDemoWalletFallback,
  walletResponseContainsSecretMaterial,
} from './wallet-response-helpers';
import { TESTNET_DEMO_IDENTITIES } from '@/lib/stellar/testnet-demo-identities';

describe('resolveDemoWalletFallback', () => {
  it('returns the testnet buyer public address for a userId containing "buyer"', () => {
    const result = resolveDemoWalletFallback('buyer-1');
    expect(result).not.toBeNull();
    expect(result!.publicAddress).toBe(TESTNET_DEMO_IDENTITIES.buyer.public_address);
    expect(result!.userId).toBe('buyer-1');
    expect(result!.status).toBe('active');
    expect(typeof result!.createdAt).toBe('string');
  });

  it('returns the testnet seller public address for a userId containing "seller"', () => {
    const result = resolveDemoWalletFallback('seller-probolinggo-cabai');
    expect(result).not.toBeNull();
    expect(result!.publicAddress).toBe(TESTNET_DEMO_IDENTITIES.seller.public_address);
    expect(result!.userId).toBe('seller-probolinggo-cabai');
  });

  it('returns null for an arbitrary userId that is not buyer or seller', () => {
    // This is the "non-demo mode" / "unknown actor" case.
    // The caller must handle null and propagate an error — not silently succeed.
    expect(resolveDemoWalletFallback('platform-admin-123')).toBeNull();
    expect(resolveDemoWalletFallback('user-12345')).toBeNull();
    expect(resolveDemoWalletFallback('')).toBeNull();
  });

  it('never includes secret_key, encrypted_secret_key, private_key, seed, or mnemonic in the response', () => {
    const buyerResult = resolveDemoWalletFallback('buyer-1');
    const sellerResult = resolveDemoWalletFallback('seller-1');

    // These must not be present — the response is a safe DTO
    for (const result of [buyerResult, sellerResult]) {
      expect(result).not.toBeNull();
      const body = result as Record<string, unknown>;
      expect(walletResponseContainsSecretMaterial(body)).toBe(false);
      expect('secret_key' in body).toBe(false);
      expect('encrypted_secret_key' in body).toBe(false);
      expect('private_key' in body).toBe(false);
      expect('seed' in body).toBe(false);
      expect('mnemonic' in body).toBe(false);
    }
  });

  it('returns only the publicly safe fields: userId, publicAddress, status, createdAt', () => {
    const result = resolveDemoWalletFallback('buyer-surabaya-restaurant');
    expect(result).not.toBeNull();
    const keys = Object.keys(result!);
    expect(keys).toEqual(['userId', 'publicAddress', 'status', 'createdAt']);
  });
});

describe('mapWalletLoadError — ProfileWalletCard does not throw on non-ok response', () => {
  it('maps a 401 to a login-required message (not an uncaught Error)', () => {
    const message = mapWalletLoadError(401, null);
    expect(typeof message).toBe('string');
    expect(message).toContain('logged in');
  });

  it('maps a 403 to a permission message', () => {
    const message = mapWalletLoadError(403, null);
    expect(typeof message).toBe('string');
    expect(message).toContain('permission');
  });

  it('maps a 500 with a body error field to the body error text', () => {
    const message = mapWalletLoadError(500, {
      error: 'Failed to provision wallet. Configuration may be missing.',
    });
    expect(message).toBe('Failed to provision wallet. Configuration may be missing.');
  });

  it('maps a 500 with no body to the generic init message', () => {
    const message = mapWalletLoadError(500, null);
    expect(message).toContain('not initialized');
  });

  it('never throws regardless of status and body shape', () => {
    const cases: Array<[number, Record<string, unknown> | null]> = [
      [200, null],
      [400, null],
      [401, null],
      [403, {}],
      [404, null],
      [500, null],
      [500, { error: 'some message' }],
      [502, { unexpected_field: true }],
    ];
    for (const [status, body] of cases) {
      expect(() => mapWalletLoadError(status, body)).not.toThrow();
      const result = mapWalletLoadError(status, body as { error?: string } | null);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    }
  });
});

describe('walletResponseContainsSecretMaterial — public API secret leak guard', () => {
  it('detects a secret_key field as a blocker', () => {
    expect(walletResponseContainsSecretMaterial({ userId: 'x', secret_key: 'S...' })).toBe(true);
  });

  it('detects an encrypted_secret_key field as a blocker', () => {
    expect(walletResponseContainsSecretMaterial({ encrypted_secret_key: 'base64...' })).toBe(true);
  });

  it('detects a private_key field as a blocker', () => {
    expect(walletResponseContainsSecretMaterial({ private_key: 'S...' })).toBe(true);
  });

  it('detects a seed field as a blocker', () => {
    expect(walletResponseContainsSecretMaterial({ seed: 'word1 word2...' })).toBe(true);
  });

  it('detects a mnemonic field as a blocker', () => {
    expect(walletResponseContainsSecretMaterial({ mnemonic: '...' })).toBe(true);
  });

  it('passes a clean public wallet DTO with no secret material', () => {
    expect(
      walletResponseContainsSecretMaterial({
        userId: 'buyer-1',
        publicAddress: 'GBKFD4EHOTC64YWBEHSQECOXLRR4WKKUFBAVQ3GF2HQADRBLNVSR5RLX',
        status: 'active',
        createdAt: '2026-07-06T07:00:00.000Z',
      }),
    ).toBe(false);
  });
});
