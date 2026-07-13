import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import NotificationsPage from './page';

vi.mock('@/lib/auth/server', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/lib/repositories', () => ({
  repository: {
    getNotifications: vi.fn(),
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    refresh: vi.fn(),
  })),
}));

vi.mock('@/lib/offers/demo-service', () => ({
  getDemoNotifications: vi.fn(),
}));

import { getCurrentUser } from '@/lib/auth/server';
import { repository } from '@/lib/repositories';
import { getDemoNotifications } from '@/lib/offers/demo-service';

describe('Notifications Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDemoNotifications).mockResolvedValue([]);
  });

  it('shows the empty-state instruction using Submit Offer wording', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'some-other-buyer' } as never);
    vi.mocked(repository.getNotifications).mockResolvedValue([]);

    const html = renderToString(await NotificationsPage({ searchParams: Promise.resolve({}) }));

    expect(html).toContain('All clear');
    expect(html).toContain('Submit Offer');
    expect(html).toContain('negotiation thread');
  });

  it('shows the negotiation-thread CTA for a populated notification list', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'seller-probolinggo-cabai' } as never);
    vi.mocked(repository.getNotifications).mockResolvedValue([
      {
        id: 'notif-1',
        recipient_id: 'seller-probolinggo-cabai',
        offer_id: 'offer-1',
        type: 'open_deal_room_requested',
        message: 'Buyer requested Open Deal Room.',
        read_at: null,
        created_at: new Date().toISOString(),
      },
    ] as never);

    const html = renderToString(await NotificationsPage({ searchParams: Promise.resolve({}) }));

    expect(html).toContain('Open thread');
    expect(html).toContain('Open Deal Room Requested');
  });

  

  

  
});

