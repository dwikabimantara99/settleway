import { Bell } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/server';
import { repository } from '@/lib/repositories';
import { NotificationsClient } from './NotificationsClient';

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string; role?: string }>;
}) {
  const resolvedSearch = await searchParams;
  const isDemoUrl = resolvedSearch.demo === '1';
  const role = resolvedSearch.role;

  const user = await getCurrentUser();
  let notifications = user ? await repository.getNotifications(user.id) : [];

  const isApprovedDemoActor = user?.id === 'buyer-surabaya-restaurant' || user?.id === 'seller-probolinggo-cabai';

  if (isApprovedDemoActor && user?.id) {
    const { getDemoNotifications } = await import('@/lib/offers/demo-service');
    const demoNotifs = await getDemoNotifications(user.id);
    if (demoNotifs.length > 0) {
      notifications = demoNotifs;
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      {/* ── Header ── */}
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-[0_8px_24px_rgba(16,185,129,0.25)]">
          <Bell className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">Notifications</h1>
          <p className="mt-1 text-sm text-slate-500">
            Incoming offers, negotiation updates, and Deal Room signals.
          </p>
        </div>
      </div>

      <NotificationsClient
        initialNotifications={notifications}
        userId={user?.id ?? null}
      />
    </div>
  );
}
