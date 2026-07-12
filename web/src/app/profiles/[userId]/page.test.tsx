import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import ProfilePage from './page';

vi.mock('@/lib/auth/server', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/lib/repositories', () => ({
  repository: {
    getProfile: vi.fn(),
    getParticipantReputationEvents: vi.fn(),
    getListings: vi.fn(),
    getBuyerRequests: vi.fn(),
  },
}));

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
}));


import { getCurrentUser } from '@/lib/auth/server';
import { repository } from '@/lib/repositories';

describe('Profile Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders demo seller profile with demo context instead of 404', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'seller-probolinggo-cabai' } as never);
    vi.mocked(repository.getProfile).mockResolvedValue(null);
    vi.mocked(repository.getParticipantReputationEvents).mockResolvedValue([]);
    vi.mocked(repository.getListings).mockResolvedValue([]);
    vi.mocked(repository.getBuyerRequests).mockResolvedValue([]);

    const html = renderToString(
      await ProfilePage({
        params: Promise.resolve({ userId: 'seller-probolinggo-cabai' }),
        searchParams: Promise.resolve({ demo: '1' }),
      })
    );

    expect(html).toContain('Probolinggo Farmer Group');
  });

  it('renders demo buyer profile with demo context instead of 404', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'buyer-surabaya-restaurant' } as never);
    vi.mocked(repository.getProfile).mockResolvedValue(null);
    vi.mocked(repository.getParticipantReputationEvents).mockResolvedValue([]);
    vi.mocked(repository.getListings).mockResolvedValue([]);
    vi.mocked(repository.getBuyerRequests).mockResolvedValue([]);

    const html = renderToString(
      await ProfilePage({
        params: Promise.resolve({ userId: 'buyer-surabaya-restaurant' }),
        searchParams: Promise.resolve({ demo: '1' }),
      })
    );

    expect(html).toContain('Surabaya Spice Co.');
  });

  it('404s for unknown profile', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'buyer-surabaya-restaurant' } as never);
    vi.mocked(repository.getProfile).mockResolvedValue(null);

    await expect(
      ProfilePage({
        params: Promise.resolve({ userId: 'unknown-user' }),
        searchParams: Promise.resolve({ demo: '1' }),
      })
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });
});
