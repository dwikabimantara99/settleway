import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';


// We need to re-import the module fresh each time to test env var changes
describe('Runtime Mode Resolution', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('explicit test selects Mock', async () => {
    process.env.NEXT_PUBLIC_RUNTIME_MODE = 'test';
    const { runtimeMode, repository } = await import('./index');
    expect(runtimeMode).toBe('test');
    expect(repository.constructor.name).toBe('MockRepositoryAdapter');
  });

  it('explicit demo selects Mock', async () => {
    process.env.NEXT_PUBLIC_RUNTIME_MODE = 'demo';
    const { runtimeMode, repository } = await import('./index');
    expect(runtimeMode).toBe('demo');
    expect(repository.constructor.name).toBe('MockRepositoryAdapter');
  });

  it('explicit persistent selects Supabase', async () => {
    process.env.NEXT_PUBLIC_RUNTIME_MODE = 'persistent';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'key';
    const { runtimeMode, repository } = await import('./index');
    expect(runtimeMode).toBe('persistent');
    expect(repository.constructor.name).toBe('SupabaseRepositoryAdapter');
  });

  it('explicit invalid value throws', async () => {
    process.env.NEXT_PUBLIC_RUNTIME_MODE = 'invalid';
    await expect(import('./index')).rejects.toThrow(/Invalid explicit runtime mode: invalid/);
  });

  it('production with missing credentials fails closed', async () => {
    delete process.env.NEXT_PUBLIC_RUNTIME_MODE;
    delete process.env.RUNTIME_MODE;
    process.env.NODE_ENV = 'production';
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    
    await expect(import('./index')).rejects.toThrow(/Missing Supabase configuration in persistent mode/);
  });

  it('persistent mode never returns Mock adapter', async () => {
    process.env.NEXT_PUBLIC_RUNTIME_MODE = 'persistent';
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    
    // It should throw, not return mock adapter
    await expect(import('./index')).rejects.toThrow(/Missing Supabase configuration in persistent mode/);
  });

  it('development default remains usable for the demo', async () => {
    delete process.env.NEXT_PUBLIC_RUNTIME_MODE;
    delete process.env.RUNTIME_MODE;
    process.env.NODE_ENV = 'development';
    
    const { runtimeMode, repository } = await import('./index');
    expect(runtimeMode).toBe('demo');
    expect(repository.constructor.name).toBe('MockRepositoryAdapter');
  });

  it('test default remains deterministic', async () => {
    delete process.env.NEXT_PUBLIC_RUNTIME_MODE;
    delete process.env.RUNTIME_MODE;
    process.env.NODE_ENV = 'test';
    
    const { runtimeMode, repository } = await import('./index');
    expect(runtimeMode).toBe('test');
    expect(repository.constructor.name).toBe('MockRepositoryAdapter');
  });
});
