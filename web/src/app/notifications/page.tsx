import Link from 'next/link';
import { Bell, ChevronRight, Inbox } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { getCurrentUser } from '@/lib/auth/server';
import { repository } from '@/lib/repositories';

function formatNotificationType(type: string): string {
  return type
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  const notifications = user ? await repository.getNotifications(user.id) : [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
          <Bell className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Notifications</h1>
          <p className="mt-1 text-sm text-slate-600">
            Incoming offers, negotiation updates, and mutual Open Deal Room signals land here.
          </p>
        </div>
      </div>

      {!user ? (
        <Card>
          <CardContent className="p-6 text-sm text-slate-600">
            Choose a demo role from the header first, then refresh this page to see role-specific notifications.
          </CardContent>
        </Card>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <Inbox className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">No notifications yet</h2>
              <p className="mt-1 text-sm text-slate-600">
                Start from Marketplace or Buyer Requests, then use Submit Offer to create the first negotiation thread.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <Card key={notification.id} className="transition-colors hover:border-emerald-300">
              <CardHeader className="border-b border-slate-100 pb-4">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base text-slate-900">{notification.message}</CardTitle>
                  <Badge className={notification.read_at ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200'}>
                    {notification.read_at ? 'Seen' : 'New'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-4 p-6 text-sm text-slate-600">
                <div>
                  <div>Type: {formatNotificationType(notification.type)}</div>
                  <div className="mt-1">{new Date(notification.created_at).toLocaleString()}</div>
                </div>
                <Link
                  href={`/offers/${notification.offer_id}`}
                  className="inline-flex items-center font-medium text-emerald-700 hover:text-emerald-800"
                >
                  Open negotiation thread
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
