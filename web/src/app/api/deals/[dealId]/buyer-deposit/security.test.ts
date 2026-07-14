import { describe, it, expect, vi } from 'vitest';
import { POST } from './route';
import { requireDealParticipant } from '@/lib/auth/server';
import { createPrivilegedServerRepository } from '@/lib/repositories/server-repository';

vi.mock('@/lib/auth/server', () => ({
  requireDealParticipant: vi.fn(),
}));

vi.mock('@/lib/repositories/server-repository', () => ({
  createPrivilegedServerRepository: vi.fn(() => {
    throw new Error('Privileged repository should not be constructed');
  }),
}));

vi.mock('@/lib/repositories', () => ({
  repository: {
    getDeal: vi.fn(),
  },
  runtimeMode: 'persistent'
}));

describe('Buyer Deposit Security Boundaries', () => {
  it('Privileged repository is not constructed for unauthenticated actors', async () => {
    vi.mocked(requireDealParticipant).mockRejectedValueOnce(new Error('Unauthenticated'));

    const req = new Request('http://localhost');
    const res = await POST(req, { params: Promise.resolve({ dealId: 'deal-1' }) });
    
    expect(res.status).toBe(401);
    expect(createPrivilegedServerRepository).not.toHaveBeenCalled();
  });

  it('Privileged repository is not constructed for unrelated actors', async () => {
    vi.mocked(requireDealParticipant).mockRejectedValueOnce(new Error('Unauthorized actor'));

    const req = new Request('http://localhost');
    const res = await POST(req, { params: Promise.resolve({ dealId: 'deal-1' }) });
    
    expect(res.status).toBe(401);
    expect(createPrivilegedServerRepository).not.toHaveBeenCalled();
  });

  it('Privileged repository is not constructed for the wrong funding role (seller)', async () => {
    vi.mocked(requireDealParticipant).mockResolvedValueOnce({
      deal: { id: 'deal-1', status: 'WAITING_DEPOSITS' } as unknown,
      role: 'seller',
      user: { id: 'seller-1' } as unknown,
    });

    const req = new Request('http://localhost');
    const res = await POST(req, { params: Promise.resolve({ dealId: 'deal-1' }) });
    
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error.message).toBe('Only buyer can perform this action');
    expect(createPrivilegedServerRepository).not.toHaveBeenCalled();
  });
});
