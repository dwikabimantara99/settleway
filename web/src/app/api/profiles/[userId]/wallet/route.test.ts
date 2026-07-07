import { GET } from './route';
import { NextRequest } from 'next/server';
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { mockStore } from '@/lib/db/mock-store';
import { getServerWalletRepository } from '@/lib/stellar/server/wallet-repository';
import { Keypair } from '@stellar/stellar-sdk';
import { decryptStellarSecret } from '@/lib/auth/server-crypto';

import { vi } from 'vitest';

// Mock the auth context
vi.mock('@/lib/auth/server', () => ({
  getCurrentUser: vi.fn().mockResolvedValue({ id: 'buyer-demo' }),
}));

describe('Wallet Provisioning Integration Route', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    mockStore.seed();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('1. With WALLET_ENCRYPTION_KEY missing, demo wallet remains fail-closed / DEMO_PUBLIC_ONLY', async () => {
    delete process.env.WALLET_ENCRYPTION_KEY;
    process.env.NEXT_PUBLIC_RUNTIME_MODE = 'demo';

    const req = new NextRequest('http://localhost/api/profiles/buyer-demo/wallet');
    const res = await GET(req, { params: Promise.resolve({ userId: 'buyer-demo' }) });
    
    expect(res.status).toBe(200);
    const data = await res.json();
    
    // 4. API response exposes only userId, publicAddress, status, createdAt.
    // 5. encrypted_secret_key never appears in wallet API response.
    expect(data).toHaveProperty('userId', 'buyer-demo');
    expect(data).toHaveProperty('publicAddress');
    expect(data).toHaveProperty('status', 'active');
    expect(data).toHaveProperty('createdAt');
    expect(data.encrypted_secret_key).toBeUndefined();

    // The backend repository should still return DEMO_PUBLIC_ONLY
    const repo = getServerWalletRepository();
    const internalWallet = await repo.getProfileWallet('buyer-demo');
    expect(internalWallet?.encrypted_secret_key).toBe('DEMO_PUBLIC_ONLY');
  });

  it('2. With WALLET_ENCRYPTION_KEY present, wallet provisioning returns ENCRYPTED/signable wallet, not DEMO_PUBLIC_ONLY', async () => {
    process.env.WALLET_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    process.env.NEXT_PUBLIC_RUNTIME_MODE = 'demo';

    const req = new NextRequest('http://localhost/api/profiles/buyer-demo/wallet');
    const res = await GET(req, { params: Promise.resolve({ userId: 'buyer-demo' }) });
    
    expect(res.status).toBe(200);
    const data = await res.json();
    
    expect(data).toHaveProperty('userId', 'buyer-demo');
    expect(data.encrypted_secret_key).toBeUndefined();

    // The backend repository should now return an encrypted wallet
    const repo = getServerWalletRepository();
    const internalWallet = await repo.getProfileWallet('buyer-demo');
    expect(internalWallet?.encrypted_secret_key).not.toBe('DEMO_PUBLIC_ONLY');
    expect(internalWallet?.encrypted_secret_key).toContain(':'); // IV format indicator
  });

  it('3. Existing DEMO_PUBLIC_ONLY wallet is repaired/reprovisioned when key exists', async () => {
    // First, simulate it being requested without a key (which falls back to DEMO_PUBLIC_ONLY)
    delete process.env.WALLET_ENCRYPTION_KEY;
    process.env.NEXT_PUBLIC_RUNTIME_MODE = 'demo';
    
    // Explicitly seed a DEMO_PUBLIC_ONLY wallet in the store for this test
    mockStore.provisionProfileWallet({
      user_id: 'buyer-demo',
      public_address: 'GDEMO...',
      encrypted_secret_key: 'DEMO_PUBLIC_ONLY',
      encryption_version: 'demo',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const repoBefore = getServerWalletRepository();
    const walletBefore = await repoBefore.getProfileWallet('buyer-demo');
    expect(walletBefore?.encrypted_secret_key).toBe('DEMO_PUBLIC_ONLY');

    // Now, add the key
    process.env.WALLET_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

    // Fetch again
    const req = new NextRequest('http://localhost/api/profiles/buyer-demo/wallet');
    const res = await GET(req, { params: Promise.resolve({ userId: 'buyer-demo' }) });
    
    expect(res.status).toBe(200);

    // The internal wallet should be repaired to an encrypted string
    const repoAfter = getServerWalletRepository();
    const walletAfter = await repoAfter.getProfileWallet('buyer-demo');
    expect(walletAfter?.encrypted_secret_key).not.toBe('DEMO_PUBLIC_ONLY');
    
    // 8. Derived signer public key matches stored public_address.
    const decrypted = decryptStellarSecret(walletAfter!.encrypted_secret_key);
    const kp = Keypair.fromSecret(decrypted);
    expect(kp.publicKey()).toBe(walletAfter!.public_address);
  });
});
