/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as nextHeaders from 'next/headers';

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

// We must mock the supabase client so it doesn't try to connect
vi.mock('../db/supabase-client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn()
    }
  }
}));

import { supabase } from '../db/supabase-client';

describe('Identity Spoofing Boundaries', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('mock_actor in demo: accepted as simulation', async () => {
    process.env.NEXT_PUBLIC_RUNTIME_MODE = 'demo';
    const { getCurrentUser } = await import('./server');
    
    vi.mocked(nextHeaders.cookies).mockReturnValue({
      get: (name: string) => name === 'mock_actor' ? { value: 'buyer-surabaya-restaurant' } : undefined,
    } as any);

    const user = await getCurrentUser();
    expect(user?.id).toBe('buyer-surabaya-restaurant');
  });

  it('mock_actor in test: accepted only where test behavior requires it', async () => {
    process.env.NEXT_PUBLIC_RUNTIME_MODE = 'test';
    const { getCurrentUser } = await import('./server');
    
    vi.mocked(nextHeaders.cookies).mockReturnValue({
      get: (name: string) => name === 'mock_actor' ? { value: 'buyer-surabaya-restaurant' } : undefined,
    } as any);

    const user = await getCurrentUser();
    expect(user?.id).toBe('buyer-surabaya-restaurant');
  });

  it('mock_actor in persistent: ignored', async () => {
    process.env.NEXT_PUBLIC_RUNTIME_MODE = 'persistent';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'key';
    
    const { getCurrentUser } = await import('./server');
    vi.mocked(nextHeaders.cookies).mockReturnValue({
      get: (name: string) => name === 'mock_actor' ? { value: 'some-hacker' } : undefined,
    } as any);

    // Because there's no sb-access-token, it should return null, ignoring 'some-hacker'
    const user = await getCurrentUser();
    expect(user).toBeNull();
  });

  it('persistent uses sb-access-token', async () => {
    process.env.NEXT_PUBLIC_RUNTIME_MODE = 'persistent';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'key';
    
    const { getCurrentUser } = await import('./server');
    
    vi.mocked(nextHeaders.cookies).mockReturnValue({
      get: (name: string) => name === 'sb-access-token' ? { value: 'real-token' } : undefined,
    } as any);

    vi.mocked(supabase!.auth.getUser).mockResolvedValue({
      data: { user: { id: 'real-user', email: 'real@user.com' } },
      error: null
    } as any);

    const user = await getCurrentUser();
    expect(user?.id).toBe('real-user');
  });
});

describe('Authorization Boundaries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.NEXT_PUBLIC_RUNTIME_MODE = 'test';
  });

  it('requireDealParticipant succeeds for buyer', async () => {
    const { requireDealParticipant } = await import('./server');
    vi.mocked(nextHeaders.cookies).mockReturnValue({
      get: (name: string) => name === 'mock_actor' ? { value: 'buyer-surabaya-restaurant' } : undefined,
    } as any);

    const { deal, role } = await requireDealParticipant('demo-cabai-001');
    expect(deal.id).toBe('demo-cabai-001');
    expect(role).toBe('buyer');
  });

  it('requireDealParticipant succeeds for seller', async () => {
    const { requireDealParticipant } = await import('./server');
    vi.mocked(nextHeaders.cookies).mockReturnValue({
      get: (name: string) => name === 'mock_actor' ? { value: 'seller-probolinggo-cabai' } : undefined,
    } as any);

    const { deal, role } = await requireDealParticipant('demo-cabai-001');
    expect(deal.id).toBe('demo-cabai-001');
    expect(role).toBe('seller');
  });

  it('unrelated authenticated participant: 403', async () => {
    const { requireDealParticipant } = await import('./server');
    vi.mocked(nextHeaders.cookies).mockReturnValue({
      get: (name: string) => name === 'mock_actor' ? { value: 'some-other-dude' } : undefined,
    } as any);

    await expect(requireDealParticipant('demo-cabai-001')).rejects.toThrow('Forbidden');
  });

  it('anonymous sensitive mutation: 401', async () => {
    const { requireDealParticipant } = await import('./server');
    vi.mocked(nextHeaders.cookies).mockReturnValue({
      get: () => undefined,
    } as any);

    await expect(requireDealParticipant('demo-cabai-001')).rejects.toThrow('Unauthorized');
  });
});
