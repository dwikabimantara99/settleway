import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./index', () => ({
  get runtimeMode() {
    return process.env.NEXT_PUBLIC_RUNTIME_MODE || 'demo';
  }
}));

vi.mock('../db/server-service-client', () => ({
  getServiceRoleClient: vi.fn(() => ({ mockClient: true }))
}));

describe('Privileged Server Repository', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  it('Privileged construction is explicit', async () => {
    const { createPrivilegedServerRepository } = await import('./server-repository');
    expect(createPrivilegedServerRepository).toBeDefined();
  });

  it('The privileged module is server-only', async () => {
    const mod = await import('./server-repository');
    expect(mod.createPrivilegedServerRepository).toBeDefined();
  });

  it('Missing service-role configuration fails closed in persistent mode', async () => {
    process.env.NEXT_PUBLIC_RUNTIME_MODE = 'persistent';
    const { getServiceRoleClient } = await import('../db/server-service-client');
    vi.mocked(getServiceRoleClient).mockImplementationOnce(() => {
      throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
    });
    
    const { createPrivilegedServerRepository } = await import('./server-repository');
    expect(() => createPrivilegedServerRepository()).toThrow('Missing SUPABASE_SERVICE_ROLE_KEY');
  });
});
