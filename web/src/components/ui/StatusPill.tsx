import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import type { DealStatus } from '@/lib/escrow/state-machine';

export interface StatusPillProps extends HTMLAttributes<HTMLDivElement> {
  status: DealStatus | string;
}

export function StatusPill({ status, className, ...props }: StatusPillProps) {
  const statusConfig: Record<string, { label: string; classes: string }> = {
    WAITING_DEPOSITS: { label: 'Awaiting deposits', classes: 'bg-[var(--warning-50)] text-[var(--warning-600)] border-[var(--warning-600)]/25' },
    BUYER_FUNDED: { label: 'Buyer funded', classes: 'bg-[var(--info-50)] text-[var(--info-600)] border-[var(--info-600)]/25' },
    SELLER_FUNDED: { label: 'Seller funded', classes: 'bg-[var(--info-50)] text-[var(--info-600)] border-[var(--info-600)]/25' },
    CUSTODY_PENDING: { label: 'Confirming custody', classes: 'bg-[var(--warning-50)] text-[var(--warning-600)] border-[var(--warning-600)]/25' },
    LOCKED: { label: 'Escrow protected', classes: 'bg-[var(--success-50)] text-[var(--success-700)] border-[var(--success-700)]/25' },
    PROOF_SUBMITTED: { label: 'Evidence submitted', classes: 'bg-[var(--stellar-50)] text-[var(--stellar-700)] border-[var(--stellar-700)]/25' },
    DELIVERED: { label: 'Buyer review', classes: 'bg-[var(--info-50)] text-[var(--info-600)] border-[var(--info-600)]/25' },
    COMPLETED: { label: 'Settled', classes: 'bg-[var(--success-50)] text-[var(--success-700)] border-[var(--success-700)]/25' },
    EXPIRED: { label: 'Expired', classes: 'bg-[var(--danger-50)] text-[var(--danger-600)] border-[var(--danger-600)]/25' },
    REFUNDED: { label: 'Refunded', classes: 'bg-[var(--surface-subtle)] text-[var(--text-secondary)] border-[var(--border-default)]' },
    CANCELLED: { label: 'Cancelled', classes: 'bg-[var(--danger-50)] text-[var(--danger-600)] border-[var(--danger-600)]/25' },
    REFUND_PENDING: { label: 'Refund Pending', classes: 'bg-[var(--surface-subtle)] text-[var(--text-secondary)] border-[var(--border-default)]' },
    REVIEW_REQUIRED: { label: 'Manual Review', classes: 'bg-[var(--warning-50)] text-[var(--warning-600)] border-[var(--warning-600)]/25' },
    DELIVERY_REJECTED: { label: 'Delivery Rejected', classes: 'bg-[var(--danger-50)] text-[var(--danger-600)] border-[var(--danger-600)]/25' },
  };

  const config = statusConfig[status] || { label: status, classes: 'bg-[var(--surface-subtle)] text-[var(--text-secondary)] border-[var(--border-default)]' };

  return (
    <div 
      className={cn('inline-flex min-h-7 items-center rounded-full border px-2.5 py-1 text-xs font-semibold', config.classes, className)}
      {...props}
    >
      {config.label}
    </div>
  );
}
