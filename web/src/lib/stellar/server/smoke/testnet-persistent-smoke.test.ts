import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { redact, checkSafetyGates, runSmoke } from '../../../../../scripts/testnet-persistent-smoke';

const mockInsert = vi.fn().mockResolvedValue({ error: null });

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

vi.mock('@/lib/repositories', () => ({
  repository: {
    getProfile: vi.fn().mockResolvedValue({ id: 'mock', status: 'WAITING_DEPOSITS' }),
    getDeal: vi.fn().mockResolvedValue({ id: 'mock', status: 'WAITING_DEPOSITS' })
  },
  runtimeMode: 'persistent'
}));

describe('Testnet Persistent Smoke Runner', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    mockInsert.mockClear();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('redacts secret-like values', () => {
    expect(redact(undefined)).toBe('undefined');
    expect(redact('short')).toBe('***');
    expect(redact('GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX')).toBe('GXXX...XXXX');
  });

  it('refuses non-persistent mode', () => {
    process.env.RUNTIME_MODE = 'demo';
    process.env.NEXT_PUBLIC_RUNTIME_MODE = 'demo';
    expect(() => checkSafetyGates()).toThrow('Runner requires RUNTIME_MODE=persistent');
  });

  it('refuses missing DB configuration signal', () => {
    process.env.RUNTIME_MODE = 'persistent';
    process.env.NEXT_PUBLIC_RUNTIME_MODE = 'persistent';
    delete process.env.TESTNET_DATABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_URL;
    expect(() => checkSafetyGates()).toThrow('Missing DB configuration signal');
  });

  it('refuses missing Stellar Testnet config', () => {
    process.env.RUNTIME_MODE = 'persistent';
    process.env.NEXT_PUBLIC_RUNTIME_MODE = 'persistent';
    process.env.TESTNET_DATABASE_URL = 'postgresql://localhost:5432';
    delete process.env.NEXT_PUBLIC_STELLAR_TESTNET_PASSPHRASE;
    expect(() => checkSafetyGates()).toThrow('Missing NEXT_PUBLIC_STELLAR_TESTNET_PASSPHRASE');
  });

  it('refuses missing Supabase REST URL during run', async () => {
    process.env.RUNTIME_MODE = 'persistent';
    process.env.NEXT_PUBLIC_RUNTIME_MODE = 'persistent';
    process.env.TESTNET_DATABASE_URL = 'postgresql://localhost:5432';
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyMockToken';
    process.env.NEXT_PUBLIC_STELLAR_TESTNET_PASSPHRASE = 'Test SDF Network ; September 2015';

    const mockLog = vi.fn();
    const mockErrLog = vi.fn();
    const report = await runSmoke(mockLog, mockErrLog);

    expect(report.classification).toBe('PERSISTENT_SMOKE_RUNNER_BLOCKED');
    expect(report.blocker).toContain('Missing Supabase REST URL');
  });

  it('refuses missing service role key', async () => {
    process.env.RUNTIME_MODE = 'persistent';
    process.env.NEXT_PUBLIC_RUNTIME_MODE = 'persistent';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co';
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.NEXT_PUBLIC_STELLAR_TESTNET_PASSPHRASE = 'Test SDF Network ; September 2015';

    const mockLog = vi.fn();
    const mockErrLog = vi.fn();
    const report = await runSmoke(mockLog, mockErrLog);

    expect(report.classification).toBe('PERSISTENT_SMOKE_RUNNER_BLOCKED');
    expect(report.blocker).toContain('Missing Supabase REST URL or service role key');
  });

  it('classifies partial when wallet provisioning is unavailable', async () => {
    process.env.RUNTIME_MODE = 'persistent';
    process.env.NEXT_PUBLIC_RUNTIME_MODE = 'persistent';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyMockToken';
    process.env.NEXT_PUBLIC_STELLAR_TESTNET_PASSPHRASE = 'Test SDF Network ; September 2015';
    delete process.env.WALLET_ENCRYPTION_KEY; // Force provisioning to fail

    const mockLog = vi.fn();
    const mockErrLog = vi.fn();
    const report = await runSmoke(mockLog, mockErrLog);

    expect(report.classification).toBe('PERSISTENT_SMOKE_RUNNER_PARTIAL');
    expect(report.blocker).toContain('Wallet provisioning unavailable');

    // Safety check that encrypted_secret_key is never exposed in output
    const calls = mockLog.mock.calls.map(c => c.join(' ')).join(' ');
    expect(calls).not.toContain('encrypted_secret_key');
  });

  it('plan-only mode does not write remote data', async () => {
    process.env.RUNTIME_MODE = 'persistent';
    process.env.NEXT_PUBLIC_RUNTIME_MODE = 'persistent';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyMockToken';
    process.env.NEXT_PUBLIC_STELLAR_TESTNET_PASSPHRASE = 'Test';
    process.env.WALLET_ENCRYPTION_KEY = 'mock';
    process.env.SMOKE_PLAN_ONLY = '1';

    const mockLog = vi.fn();
    const mockErrLog = vi.fn();
    const report = await runSmoke(mockLog, mockErrLog);

    expect(mockInsert).not.toHaveBeenCalled();
    expect(report.isPlanOnly).toBe(true);
    // When plan only completes gracefully up to execution layer
    expect(report.classification).toBe('PERSISTENT_SMOKE_RUNNER_PARTIAL');
  });
});
