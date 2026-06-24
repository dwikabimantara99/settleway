'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Bell, ChevronRight, Inbox, CheckCheck, Clock } from 'lucide-react';
import type { DbNotification } from '@/lib/db/types';

function formatNotificationType(type: string): string {
  return type
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatRelativeTime(value: string): string {
  const diffMs = Date.now() - new Date(value).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  return new Date(value).toLocaleDateString();
}

function NotificationCard({
  notification,
  onMarkRead,
}: {
  notification: DbNotification;
  onMarkRead: (id: string) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const isUnread = !notification.read_at;

  const handleMark = async () => {
    if (!isUnread) return;
    setLoading(true);
    await onMarkRead(notification.id);
    setLoading(false);
  };

  return (
    <div
      className={`group relative flex flex-col gap-4 overflow-hidden rounded-3xl border p-6 shadow-sm transition-all duration-200 sm:flex-row sm:items-center sm:justify-between ${
        isUnread
          ? 'border-emerald-200 bg-white ring-1 ring-emerald-100'
          : 'border-slate-200 bg-slate-50'
      }`}
    >
      {/* Unread indicator */}
      {isUnread && (
        <div className="absolute left-0 top-0 h-full w-1 rounded-l-3xl bg-emerald-500" />
      )}

      <div className="flex items-start gap-4 pl-2">
        {/* Icon */}
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
            isUnread ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
          }`}
        >
          <Bell className="h-5 w-5" />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-slate-900">{notification.message}</p>
            {isUnread && (
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
                !
              </span>
            )}
          </div>
          <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatRelativeTime(notification.created_at)}
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600">
              {formatNotificationType(notification.type)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 pl-[60px] sm:pl-0">
        {isUnread && (
          <button
            type="button"
            onClick={handleMark}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-all hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            {loading ? 'Marking...' : 'Mark read'}
          </button>
        )}
        <Link
          href={`/offers/${notification.offer_id}`}
          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-emerald-700"
        >
          Open thread
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

export function NotificationsClient({
  initialNotifications,
  userId,
}: {
  initialNotifications: DbNotification[];
  userId: string | null;
}) {
  const [notifications, setNotifications] = useState(initialNotifications);

  const handleMarkRead = useCallback(async (id: string) => {
    await fetch(`/api/notifications/${id}`, { method: 'PATCH' });
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, read_at: new Date().toISOString() } : n,
      ),
    );
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    const unreadIds = notifications.filter((n) => !n.read_at).map((n) => n.id);
    await Promise.all(unreadIds.map((id) => fetch(`/api/notifications/${id}`, { method: 'PATCH' })));
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })),
    );
  }, [notifications]);

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  if (!userId) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <Bell className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-base font-semibold text-slate-900">No identity selected</h2>
        <p className="mt-2 text-sm text-slate-500">
          Choose a demo role from the switcher first, then refresh this page.
        </p>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white py-20 text-center shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <Inbox className="h-8 w-8" />
        </div>
        <h2 className="mt-5 text-xl font-bold text-slate-900">All clear</h2>
        <p className="mt-2 text-sm text-slate-500">
          Start from Marketplace or Buyer Requests, then use Submit Offer to create the first negotiation thread.
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            href="/marketplace"
            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Browse Marketplace
          </Link>
          <Link
            href="/buyer-requests"
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Browse Requests
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {unreadCount > 0 && (
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-medium text-slate-600">
            <span className="font-bold text-emerald-700">{unreadCount}</span> unread
          </p>
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-all hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </button>
        </div>
      )}
      <div className="space-y-4">
        {notifications.map((n) => (
          <NotificationCard
            key={n.id}
            notification={n}
            onMarkRead={handleMarkRead}
          />
        ))}
      </div>
    </>
  );
}
