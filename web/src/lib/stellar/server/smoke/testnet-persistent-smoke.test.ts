import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { redact, runSmoke } from '../../../../../scripts/testnet-persistent-smoke';
import { executeHeadlessSmokeAction } from './headless-execution-hook';
import { fundTestnetWalletViaFriendbot } from './testnet-friendbot';

const { mockInsert, mockGetProfileWallet, mockCoordinateDealExecution, mockGetDeal, mockGetStellarOperation, mockAddEvent } = vi.hoisted(() => {
  return {
    mockInsert: vi.fn().mockResolvedValue({ error: null }),
    mockGetProfileWallet: vi.fn(),
    mockCoordinateDealExecution: vi.fn(),
    mockGetDeal: vi.fn(),
    mockGetStellarOperation: vi.fn(),
    mockAddEvent: vi.fn()
  };
});

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn((url) => {
    if (url.startsWith('postgresql://')) {
      throw new Error('createClient used postgresql URL instead of REST URL');
    }
    return {
      from: vi.fn().mockReturnThis(),
      insert: mockInsert
    };
  })
}));

vi.mock('@/lib/stellar/server/wallet-repository', () => ({
  getServerWalletRepository: vi.fn(() => ({
    getProfileWallet: mockGetProfileWallet,
    provisionProfileWallet: vi.fn().mockResolvedValue({})
  }))
}));

vi.mock('@/lib/stellar/server/deal-execution-coordinator', () => ({
  coordinateDealExecution: mockCoordinateDealExecution
}));

vi.mock('@/lib/repositories', () => ({
  runtimeMode: 'persistent'
}));

vi.mock('@/lib/stellar/server/smoke/headless-smoke-admin-context', () => ({
  getAdminSmokeRepository: vi.fn(() => ({
    getProfile: vi.fn().mockResolvedValue({ id: 'mock', status: 'WAITING_DEPOSITS' }),
    getDeal: (...args: unknown[]) => mockGetDeal(...args),
    getStellarOperation: (...args: unknown[]) => mockGetStellarOperation(...args),
    addEvent: (...args: unknown[]) => mockAddEvent(...args)
  }))
}));

vi.mock('@/lib/stellar/server/deal-room-testnet-runtime', () => ({ checkTestnetBalance: vi.fn().mockResolvedValue({ status: 'sufficient' }), loadDealRoomTestnetRuntime: vi.fn().mockReturnValue({ ok: true, runtime: { contract_id: 'C123', metadata: {}, execution_adapter: {} } }) }));
vi.mock('@/lib/stellar/server/deal-room-funding-runtime', () => ({ composeDealRoomFundingRuntime: vi.fn().mockReturnValue({ ok: true, context: { funding_intent: { actor_address: 'G123' }, public_proof: 'mock_proof' } }) }));

vi.mock('@/lib/stellar/server/smoke/testnet-friendbot', () => ({
  fundTestnetWalletViaFriendbot: vi.fn().mockResolvedValue({ ok: true, status: 200, redactedAddress: 'G...TEST' })
}));

describe('Testnet Persistent Smoke Runner & Hook', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    mockInsert.mockClear();
    mockGetProfileWallet.mockReset();
    mockCoordinateDealExecution.mockReset();
    mockGetDeal.mockReset();
    mockGetStellarOperation.mockReset();
    mockAddEvent.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('redacts secret-like values', () => {
    expect(redact(undefined)).toBe('undefined');
    expect(redact('short')).toBe('***');
    expect(redact('GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX')).toBe('GXXX...XXXX');
  });

  it('hook refuses non-persistent mode', async () => {
    process.env.RUNTIME_MODE = 'demo';
    process.env.NEXT_PUBLIC_RUNTIME_MODE = 'demo';
    await expect(executeHeadlessSmokeAction({ dealId: 'd', actorId: 'a', expectedRole: 'buyer', action: 'buyer_deposit' }))
      .rejects.toThrow('Headless hook requires RUNTIME_MODE=persistent');
  });

  it('hook refuses missing ALLOW_HEADLESS_TESTNET_SMOKE_EXECUTION=1', async () => {
    process.env.RUNTIME_MODE = 'persistent';
    process.env.NEXT_PUBLIC_RUNTIME_MODE = 'persistent';
    delete process.env.ALLOW_HEADLESS_TESTNET_SMOKE_EXECUTION;
    
    const result = await executeHeadlessSmokeAction({ dealId: 'd', actorId: 'a', expectedRole: 'buyer', action: 'buyer_deposit' });
    expect(result.ok).toBe(false);
    expect(result.blocker).toContain('Headless execution is gated off');
  });

  it('hook refuses mainnet config', async () => {
    process.env.RUNTIME_MODE = 'persistent';
    process.env.NEXT_PUBLIC_RUNTIME_MODE = 'persistent';
    process.env.ALLOW_HEADLESS_TESTNET_SMOKE_EXECUTION = '1';
    process.env.SETTLEWAY_SMOKE_NETWORK_PASSPHRASE = 'Public Global Stellar Network ; September 2015';
    
    const result = await executeHeadlessSmokeAction({ dealId: 'd', actorId: 'a', expectedRole: 'buyer', action: 'buyer_deposit' });
    expect(result.ok).toBe(false);
    expect(result.blocker).toContain('Hook refuses mainnet config');
  });

  it('buyer_deposit rejects actorId mismatch', async () => {
    process.env.RUNTIME_MODE = 'persistent';
    process.env.NEXT_PUBLIC_RUNTIME_MODE = 'persistent';
    process.env.ALLOW_HEADLESS_TESTNET_SMOKE_EXECUTION = '1';
    process.env.SETTLEWAY_SMOKE_NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';

    mockGetDeal.mockResolvedValue({ id: 'd', buyer_id: 'b', seller_id: 's', stellar_mode: 'testnet' });
    const result = await executeHeadlessSmokeAction({ dealId: 'd', actorId: 'wrong_id', expectedRole: 'buyer', action: 'buyer_deposit' });
    expect(result.ok).toBe(false);
    expect(result.blocker).toBe('Actor does not match expected deal participant role');
  });

  it('seller_deposit rejects actorId mismatch', async () => {
    process.env.RUNTIME_MODE = 'persistent';
    process.env.NEXT_PUBLIC_RUNTIME_MODE = 'persistent';
    process.env.ALLOW_HEADLESS_TESTNET_SMOKE_EXECUTION = '1';
    process.env.SETTLEWAY_SMOKE_NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';

    mockGetDeal.mockResolvedValue({ id: 'd', buyer_id: 'b', seller_id: 's', stellar_mode: 'testnet' });
    const result = await executeHeadlessSmokeAction({ dealId: 'd', actorId: 'wrong_id', expectedRole: 'seller', action: 'seller_deposit' });
    expect(result.ok).toBe(false);
    expect(result.blocker).toBe('Actor does not match expected deal participant role');
  });

  it('buyer_deposit rejects expectedRole=seller', async () => {
    process.env.RUNTIME_MODE = 'persistent';
    process.env.NEXT_PUBLIC_RUNTIME_MODE = 'persistent';
    process.env.ALLOW_HEADLESS_TESTNET_SMOKE_EXECUTION = '1';
    process.env.SETTLEWAY_SMOKE_NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';

    mockGetDeal.mockResolvedValue({ id: 'd', buyer_id: 'b', seller_id: 's', stellar_mode: 'testnet' });
    const result = await executeHeadlessSmokeAction({ dealId: 'd', actorId: 's', expectedRole: 'seller', action: 'buyer_deposit' });
    expect(result.ok).toBe(false);
    expect(result.blocker).toBe('Action does not match expected participant role');
  });

  it('seller_deposit rejects expectedRole=buyer', async () => {
    process.env.RUNTIME_MODE = 'persistent';
    process.env.NEXT_PUBLIC_RUNTIME_MODE = 'persistent';
    process.env.ALLOW_HEADLESS_TESTNET_SMOKE_EXECUTION = '1';
    process.env.SETTLEWAY_SMOKE_NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';

    mockGetDeal.mockResolvedValue({ id: 'd', buyer_id: 'b', seller_id: 's', stellar_mode: 'testnet' });
    const result = await executeHeadlessSmokeAction({ dealId: 'd', actorId: 'b', expectedRole: 'buyer', action: 'seller_deposit' });
    expect(result.ok).toBe(false);
    expect(result.blocker).toBe('Action does not match expected participant role');
  });

  it('hook preserves idempotency key usage', async () => {
    process.env.RUNTIME_MODE = 'persistent';
    process.env.NEXT_PUBLIC_RUNTIME_MODE = 'persistent';
    process.env.ALLOW_HEADLESS_TESTNET_SMOKE_EXECUTION = '1';
    process.env.SETTLEWAY_SMOKE_NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';

    mockGetDeal.mockResolvedValue({ id: 'd', buyer_id: 'b', seller_id: 's', stellar_mode: 'testnet', status: 'WAITING_DEPOSITS', volume_kg: 100, principal_idr: 1000, terms: { deposit_deadline_at: '2027-01-01T00:00:00Z' } });
    mockGetProfileWallet.mockResolvedValue({ public_address: 'G123', encrypted_secret_key: 'enc123' });
    
    mockGetStellarOperation.mockResolvedValue({ operation_status: 'confirmed', transaction_hash: 'hash123' });

    const result = await executeHeadlessSmokeAction({ dealId: 'd', actorId: 'b', expectedRole: 'buyer', action: 'buyer_deposit', idempotencyKey: 'idem-123' });
    expect(result.ok).toBe(true);
    expect(result.transactionHash).toBe('hash123');
    
    expect(mockGetStellarOperation).toHaveBeenCalledWith('idem-123');
  });
  
  it('runner without ALLOW_HEADLESS stops and returns PARTIAL', async () => {
    process.env.RUNTIME_MODE = 'persistent';
    process.env.NEXT_PUBLIC_RUNTIME_MODE = 'persistent';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyMockToken';
    process.env.SETTLEWAY_SMOKE_NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
    process.env.WALLET_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    delete process.env.ALLOW_HEADLESS_TESTNET_SMOKE_EXECUTION;

    mockGetDeal.mockImplementation((id: string) => Promise.resolve({ id, buyer_id: id.replace('deal', 'buyer'), seller_id: id.replace('deal', 'seller'), status: 'WAITING_DEPOSITS' }));
    mockGetProfileWallet.mockResolvedValue({ public_address: 'G123', encrypted_secret_key: 'enc123' });

    const mockLog = vi.fn();
    const mockErrLog = vi.fn();
    const report = await runSmoke(mockLog, mockErrLog);

    expect(report.classification).toBe('PERSISTENT_SMOKE_RUNNER_PARTIAL');
    expect(report.blocker).toContain('Wallet execution via coordinator requires programmatic hook');
  });

  it('runner plan-only mode performs no writes and skips hook', async () => {
    process.env.RUNTIME_MODE = 'persistent';
    process.env.NEXT_PUBLIC_RUNTIME_MODE = 'persistent';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyMockToken';
    process.env.SETTLEWAY_SMOKE_NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
    process.env.WALLET_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    process.env.SMOKE_PLAN_ONLY = '1';
    process.env.ALLOW_HEADLESS_TESTNET_SMOKE_EXECUTION = '1';

    const mockLog = vi.fn();
    const mockErrLog = vi.fn();
    const report = await runSmoke(mockLog, mockErrLog);

    expect(mockInsert).not.toHaveBeenCalled();
    expect(fundTestnetWalletViaFriendbot).not.toHaveBeenCalled();
    expect(report.isPlanOnly).toBe(true);
    expect(report.classification).toBe('PERSISTENT_SMOKE_RUNNER_PARTIAL');
  });

  it('runner with mock executes funding and returns safe metadata', async () => {
    process.env.RUNTIME_MODE = 'persistent';
    process.env.NEXT_PUBLIC_RUNTIME_MODE = 'persistent';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyMockToken';
    process.env.SETTLEWAY_SMOKE_NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
    process.env.WALLET_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    process.env.ALLOW_HEADLESS_TESTNET_SMOKE_EXECUTION = '1';

    mockGetDeal.mockImplementation((id: string) => Promise.resolve({ 
       id, buyer_id: id.replace('deal', 'buyer'), seller_id: id.replace('deal', 'seller'), 
       stellar_mode: 'testnet', status: 'WAITING_DEPOSITS', 
       volume_kg: 100, principal_idr: 1000, 
       terms: { deposit_deadline_at: '2027-01-01T00:00:00Z' } 
    }));
    mockGetProfileWallet.mockResolvedValue({ public_address: 'G123', encrypted_secret_key: 'enc123' });
    
    mockGetStellarOperation.mockResolvedValue({ operation_status: 'confirmed', transaction_hash: 'tx-hash-123' });

    const mockLog = vi.fn();
    const mockErrLog = vi.fn();
    const report = await runSmoke(mockLog, mockErrLog);

    expect(fundTestnetWalletViaFriendbot).toHaveBeenCalledTimes(2);
    expect(report.classification).toBe('PERSISTENT_SMOKE_RUNNER_READY_FOR_DELIVERY_EXTENSION');
    
    const logs = mockLog.mock.calls.map((c: string[]) => c.join(' ')).join('\n');
    expect(logs).not.toContain('encrypted_secret_key');
    expect(logs).not.toContain('enc123');
    expect(logs).not.toContain('rawXdr');
  });

  it('runner blocked when Friendbot funding fails', async () => {
    process.env.RUNTIME_MODE = 'persistent';
    process.env.NEXT_PUBLIC_RUNTIME_MODE = 'persistent';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyMockToken';
    process.env.SETTLEWAY_SMOKE_NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
    process.env.WALLET_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    process.env.ALLOW_HEADLESS_TESTNET_SMOKE_EXECUTION = '1';

    mockGetDeal.mockImplementation((id: string) => Promise.resolve({ 
       id, buyer_id: id.replace('deal', 'buyer'), seller_id: id.replace('deal', 'seller'), 
       stellar_mode: 'testnet', status: 'WAITING_DEPOSITS', 
       volume_kg: 100, principal_idr: 1000, 
       terms: { deposit_deadline_at: '2027-01-01T00:00:00Z' } 
    }));
    mockGetProfileWallet.mockResolvedValue({ public_address: 'G123', encrypted_secret_key: 'enc123' });

    // @ts-expect-error Mocking imported function
    fundTestnetWalletViaFriendbot.mockResolvedValueOnce({ ok: false, status: 500, message: 'Friendbot rate limit' });

    const mockLog = vi.fn();
    const mockErrLog = vi.fn();
    const report = await runSmoke(mockLog, mockErrLog);
    expect(report.classification).toBe('PERSISTENT_SMOKE_RUNNER_BLOCKED_BALANCE');
    expect(report.blocker).toContain('Friendbot funding failed for buyer: Friendbot rate limit');
  });
});
