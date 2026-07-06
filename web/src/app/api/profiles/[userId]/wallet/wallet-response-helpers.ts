/**
 * Pure helper functions extracted from /api/profiles/[userId]/wallet/route.ts
 * These functions are side-effect free and can be deterministically unit tested
 * without needing a real Supabase session, wallet repository, or Next.js runtime.
 */

import type { TestnetDemoWalletRole } from '@/lib/stellar/testnet-demo-identities';
import { TESTNET_DEMO_IDENTITIES } from '@/lib/stellar/testnet-demo-identities';

/**
 * Describes the safe public wallet response shape that this API returns.
 * NEVER includes secret_key, encrypted_secret_key, private_key, seed, or mnemonic.
 */
export interface SafeWalletResponse {
  userId: string;
  publicAddress: string;
  status: string;
  createdAt: string;
}

/**
 * Describes the error response shape returned on wallet load failure.
 */
export interface WalletLoadError {
  error: string;
}

/**
 * Maps a provisioning exception in demo mode to a safe public wallet fallback.
 * Returns null if the userId cannot be mapped to a known demo role, or if not in demo mode.
 *
 * This is the pure extraction of the demo fallback logic in the wallet route handler.
 * It guarantees:
 *   - Only publicAddress from TESTNET_DEMO_IDENTITIES is returned (no secret material)
 *   - Role mapping is deterministic: userId containing "buyer" → buyer, "seller" → seller
 *   - Returns null for any userId that does not resolve to a known role
 *   - Does not depend on NEXT_PUBLIC_RUNTIME_MODE (caller decides when to invoke)
 */
export function resolveDemoWalletFallback(userId: string): SafeWalletResponse | null {
  const role: TestnetDemoWalletRole | null = userId.includes('buyer')
    ? 'buyer'
    : userId.includes('seller')
      ? 'seller'
      : null;

  if (!role) return null;

  const demoIdentity = TESTNET_DEMO_IDENTITIES[role];
  return {
    userId,
    publicAddress: demoIdentity.public_address,
    status: 'active',
    createdAt: new Date().toISOString(),
  };
}

/**
 * Maps a non-ok wallet API response to a safe UI error state.
 * Never throws. The wallet component uses this to degrade gracefully
 * instead of propagating an uncaught Error to the React tree.
 *
 * @param status   HTTP status code from /api/profiles/[userId]/wallet
 * @param body     JSON body from the error response (may be partial or empty)
 * @returns        A user-safe error message string
 */
export function mapWalletLoadError(status: number, body: { error?: string } | null): string {
  if (status === 401) return 'You must be logged in to view your wallet.';
  if (status === 403) return 'You do not have permission to view this wallet.';
  if (status === 404) return 'Wallet not found.';
  if (body?.error) return body.error;
  return 'Wallet is not initialized yet or configuration is missing.';
}

/**
 * Safety check: given a wallet API response body, returns true if any
 * forbidden private fields are present. Used in tests to assert the
 * public API never leaks encrypted or raw secret material.
 */
export function walletResponseContainsSecretMaterial(body: Record<string, unknown>): boolean {
  const FORBIDDEN_FIELDS = [
    'secret_key',
    'encrypted_secret_key',
    'private_key',
    'seed',
    'mnemonic',
    'raw_key',
    'encryption_key',
  ];
  return FORBIDDEN_FIELDS.some((field) => field in body);
}
