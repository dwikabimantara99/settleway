import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

export interface TimelineEvent {
  id: string;
  content: string;
  actor: string;
  date: string;
  icon?: ReactNode;
  txHash?: string;
}

interface TimelineProps {
  events: TimelineEvent[];
  className?: string;
}

export function Timeline({ events, className }: TimelineProps) {
  return (
    <div className={cn('flow-root', className)}>
      <ul role="list" className="-mb-8">
        {events.map((event, eventIdx) => (
          <li key={event.id}>
            <div className="relative pb-8">
              {eventIdx !== events.length - 1 ? (
                <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-slate-200" aria-hidden="true" />
              ) : null}
              <div className="relative flex space-x-3">
                <div>
                  <span className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center ring-8 ring-white">
                    {event.icon || <div className="h-2.5 w-2.5 rounded-full bg-emerald-600" />}
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                  <div>
                    <p className="text-sm text-slate-500">
                      {event.content}{' '}
                      <span className="font-medium text-slate-900">{event.actor}</span>
                    </p>
                    {event.txHash && (
                      <p className="mt-1 text-xs text-slate-400 font-mono">
                        Tx: {event.txHash.slice(0, 8)}...{event.txHash.slice(-8)}
                      </p>
                    )}
                  </div>
                  <div className="whitespace-nowrap text-right text-sm text-slate-500">
                    <time dateTime={event.date}>{new Date(event.date).toLocaleDateString()}</time>
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
