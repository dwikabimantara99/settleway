import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { HeadlessSmokeAdminRepository } from './headless-smoke-admin-context';

describe('HeadlessSmokeAdminRepository', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('refuses non-persistent mode', () => {
    process.env.RUNTIME_MODE = 'demo';
    process.env.NEXT_PUBLIC_RUNTIME_MODE = 'demo';
    expect(() => new HeadlessSmokeAdminRepository()).toThrow('Admin smoke context requires RUNTIME_MODE=persistent and NEXT_PUBLIC_RUNTIME_MODE=persistent');
  });

  it('refuses missing ALLOW_HEADLESS_TESTNET_SMOKE_EXECUTION=1', () => {
    process.env.RUNTIME_MODE = 'persistent';
    process.env.NEXT_PUBLIC_RUNTIME_MODE = 'persistent';
    delete process.env.ALLOW_HEADLESS_TESTNET_SMOKE_EXECUTION;
    expect(() => new HeadlessSmokeAdminRepository()).toThrow('Admin smoke context requires ALLOW_HEADLESS_TESTNET_SMOKE_EXECUTION=1');
  });

  it('refuses mainnet passphrase', () => {
    process.env.RUNTIME_MODE = 'persistent';
    process.env.NEXT_PUBLIC_RUNTIME_MODE = 'persistent';
    process.env.ALLOW_HEADLESS_TESTNET_SMOKE_EXECUTION = '1';
    process.env.SETTLEWAY_SMOKE_NETWORK_PASSPHRASE = 'Public Global Stellar Network ; September 2015';
    expect(() => new HeadlessSmokeAdminRepository()).toThrow('Admin smoke context refuses mainnet passphrase');
  });

  it('refuses missing service-role key', () => {
    process.env.RUNTIME_MODE = 'persistent';
    process.env.NEXT_PUBLIC_RUNTIME_MODE = 'persistent';
    process.env.ALLOW_HEADLESS_TESTNET_SMOKE_EXECUTION = '1';
    process.env.SETTLEWAY_SMOKE_NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost';
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(() => new HeadlessSmokeAdminRepository()).toThrow('Admin smoke context requires Supabase URL and Service Role Key');
  });

  it('instantiates cleanly with valid config', () => {
    process.env.RUNTIME_MODE = 'persistent';
    process.env.NEXT_PUBLIC_RUNTIME_MODE = 'persistent';
    process.env.ALLOW_HEADLESS_TESTNET_SMOKE_EXECUTION = '1';
    process.env.SETTLEWAY_SMOKE_NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_key';
    expect(() => new HeadlessSmokeAdminRepository()).not.toThrow();
  });
});
