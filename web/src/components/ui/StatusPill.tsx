import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import type { DealStatus } from '@/lib/escrow/state-machine';

export interface StatusPillProps extends HTMLAttributes<HTMLDivElement> {
  status: DealStatus | string;
}

export function StatusPill({ status, className, ...props }: StatusPillProps) {
  const statusConfig: Record<string, { label: string; classes: string }> = {
    WAITING_DEPOSITS: { label: 'Waiting Deposits', classes: 'bg-amber-100 text-amber-800 border-amber-200' },
    BUYER_FUNDED: { label: 'Buyer Funded', classes: 'bg-blue-100 text-blue-800 border-blue-200' },
    SELLER_FUNDED: { label: 'Seller Funded', classes: 'bg-blue-100 text-blue-800 border-blue-200' },
    LOCKED: { label: 'Locked (Protected)', classes: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    PROOF_SUBMITTED: { label: 'Proof Submitted', classes: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
    DELIVERED: { label: 'Delivered', classes: 'bg-purple-100 text-purple-800 border-purple-200' },
    COMPLETED: { label: 'Settled', classes: 'bg-slate-100 text-slate-800 border-slate-200' },
    EXPIRED: { label: 'Expired', classes: 'bg-red-100 text-red-800 border-red-200' },
    REFUNDED: { label: 'Refunded', classes: 'bg-slate-100 text-slate-800 border-slate-200' },
    CANCELLED: { label: 'Cancelled', classes: 'bg-red-100 text-red-800 border-red-200' },
  };

  const config = statusConfig[status] || { label: status, classes: 'bg-slate-100 text-slate-800 border-slate-200' };

  return (
    <div 
      className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', config.classes, className)}
      {...props}
    >
      {config.label}
    </div>
  );
}
