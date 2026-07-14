import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';

vi.mock('@/lib/auth/server', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/lib/stellar/server/wallet-repository', () => ({
  getServerWalletRepository: vi.fn(() => ({
    getProfileWallet: vi.fn(),
  })),
}));

vi.mock('@/lib/stellar/server/smoke/testnet-friendbot', () => ({
  fundTestnetWalletViaFriendbot: vi.fn(),
}));

vi.mock('@/lib/repositories', () => ({
  get runtimeMode() {
    return process.env.NEXT_PUBLIC_RUNTIME_MODE || 'test';
  }
}));

describe('Friendbot Route Security Boundaries', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  it('Unauthenticated caller is rejected', async () => {
    const { getCurrentUser } = await import('@/lib/auth/server');
    vi.mocked(getCurrentUser).mockResolvedValueOnce(null);

    const req = new Request('http://localhost', { method: 'POST' });
    const res = await POST(req, { params: Promise.resolve({ userId: 'demo-user' }) });
    
    expect(res.status).toBe(401);
  });

  it('Current actor cannot fund another actor\'s wallet', async () => {
    const { getCurrentUser } = await import('@/lib/auth/server');
    vi.mocked(getCurrentUser).mockResolvedValueOnce({ id: 'buyer-surabaya-restaurant' } as unknown);

    const req = new Request('http://localhost', { method: 'POST' });
    const res = await POST(req, { params: Promise.resolve({ userId: 'seller-probolinggo-cabai' }) });
    
    expect(res.status).toBe(403);
  });

  it('Wallet address is resolved from the authoritative user_wallets record', async () => {
    const { getCurrentUser } = await import('@/lib/auth/server');
    vi.mocked(getCurrentUser).mockResolvedValueOnce({ id: 'buyer-surabaya-restaurant' } as unknown);

    const { getServerWalletRepository } = await import('@/lib/stellar/server/wallet-repository');
    const getProfileWalletMock = vi.fn().mockResolvedValueOnce({
      public_address: 'GA_AUTHORITATIVE_ADDRESS',
    });
    vi.mocked(getServerWalletRepository).mockReturnValueOnce({
      getProfileWallet: getProfileWalletMock,
    } as unknown);

    const { fundTestnetWalletViaFriendbot } = await import('@/lib/stellar/server/smoke/testnet-friendbot');
    vi.mocked(fundTestnetWalletViaFriendbot).mockResolvedValueOnce({ ok: true, status: 200, message: 'Funded' });

    const req = new Request('http://localhost', { method: 'POST' });
    await POST(req, { params: Promise.resolve({ userId: 'buyer-surabaya-restaurant' }) });
    
    expect(getProfileWalletMock).toHaveBeenCalledWith('buyer-surabaya-restaurant');
    expect(fundTestnetWalletViaFriendbot).toHaveBeenCalledWith('GA_AUTHORITATIVE_ADDRESS');
  });

  it('Mainnet mode rejects Friendbot', async () => {
    process.env.NEXT_PUBLIC_RUNTIME_MODE = 'persistent';
    const { getCurrentUser } = await import('@/lib/auth/server');
    vi.mocked(getCurrentUser).mockResolvedValueOnce({ id: 'buyer-surabaya-restaurant' } as unknown);

    const req = new Request('http://localhost', { method: 'POST' });
    const res = await POST(req, { params: Promise.resolve({ userId: 'buyer-surabaya-restaurant' }) });
    
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toMatch(/disabled in this environment/);
  });
});
