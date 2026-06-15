/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireDealParticipant, getCurrentUser } from './server';
import { repository } from '../repositories';
import * as nextHeaders from 'next/headers';

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

describe('Auth & Authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATA_STORE = 'mock'; // explicitly use mock store
  });

  it('getCurrentUser returns null when no cookie', async () => {
    vi.mocked(nextHeaders.cookies).mockReturnValue({
      get: () => undefined,
    } as any);

    const user = await getCurrentUser();
    expect(user).toBeNull();
  });

  it('getCurrentUser returns mock actor id', async () => {
    vi.mocked(nextHeaders.cookies).mockReturnValue({
      get: (name: string) => name === 'mock_actor' ? { value: 'buyer-surabaya-restaurant' } : undefined,
    } as any);

    const user = await getCurrentUser();
    expect(user?.id).toBe('buyer-surabaya-restaurant');
  });

  it('requireDealParticipant succeeds for buyer', async () => {
    vi.mocked(nextHeaders.cookies).mockReturnValue({
      get: () => ({ value: 'buyer-surabaya-restaurant' }),
    } as any);

    const { deal, role } = await requireDealParticipant('demo-cabai-001');
    expect(deal.id).toBe('demo-cabai-001');
    expect(role).toBe('buyer');
  });

  it('requireDealParticipant succeeds for seller', async () => {
    vi.mocked(nextHeaders.cookies).mockReturnValue({
      get: () => ({ value: 'seller-probolinggo-cabai' }),
    } as any);

    const { deal, role } = await requireDealParticipant('demo-cabai-001');
    expect(deal.id).toBe('demo-cabai-001');
    expect(role).toBe('seller');
  });

  it('requireDealParticipant throws for unrelated participant', async () => {
    vi.mocked(nextHeaders.cookies).mockReturnValue({
      get: () => ({ value: 'some-other-dude' }),
    } as any);

    await expect(requireDealParticipant('demo-cabai-001')).rejects.toThrow('Forbidden');
  });

  it('requireDealParticipant throws when anonymous', async () => {
    vi.mocked(nextHeaders.cookies).mockReturnValue({
      get: () => undefined,
    } as any);

    await expect(requireDealParticipant('demo-cabai-001')).rejects.toThrow('Unauthorized');
  });
});
