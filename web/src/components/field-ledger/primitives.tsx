import type { HTMLAttributes, ReactNode } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Info,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="max-w-3xl">
        {eyebrow ? (
          <p className="mb-2 text-xs font-semibold uppercase text-[var(--green-700)]">{eyebrow}</p>
        ) : null}
        <h1 className="text-3xl font-semibold text-[var(--navy-900)] sm:text-4xl">{title}</h1>
        {description ? (
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function DataRow({
  label,
  value,
  emphasized = false,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  emphasized?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex min-h-11 items-center justify-between gap-4 border-b border-[var(--border-subtle)] py-2.5 last:border-b-0',
        emphasized && 'font-semibold text-[var(--navy-900)]',
        className,
      )}
    >
      <dt className="text-sm text-[var(--text-secondary)]">{label}</dt>
      <dd className="text-right text-sm financial-figures">{value}</dd>
    </div>
  );
}

export function AmountDisplay({
  value,
  label,
  size = 'md',
  tone = 'default',
}: {
  value: string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  tone?: 'default' | 'positive' | 'warning';
}) {
  const sizeClass = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-base' : 'text-xl';
  const toneClass =
    tone === 'positive'
      ? 'text-[var(--green-700)]'
      : tone === 'warning'
        ? 'text-[var(--warning-600)]'
        : 'text-[var(--navy-900)]';

  return (
    <div>
      {label ? <div className="text-xs text-[var(--text-muted)]">{label}</div> : null}
      <div className={cn('mt-1 font-semibold financial-figures', sizeClass, toneClass)}>{value}</div>
    </div>
  );
}

export function HashDisplay({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string | null;
}) {
  const content = (
    <>
      <span className="identifier min-w-0 flex-1 text-xs text-[var(--navy-700)]">{value}</span>
      {href ? <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
    </>
  );

  return (
    <div>
      <div className="mb-1.5 text-xs font-medium text-[var(--text-muted)]">{label}</div>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="flex min-h-11 items-center gap-3 rounded-md border bg-[var(--surface-subtle)] px-3 hover:border-[var(--navy-300)]"
        >
          {content}
        </a>
      ) : (
        <div className="flex min-h-11 items-center gap-3 rounded-md border bg-[var(--surface-subtle)] px-3">
          {content}
        </div>
      )}
    </div>
  );
}

export function DeadlineDisplay({
  label,
  value,
  tone = 'warning',
}: {
  label: string;
  value: string;
  tone?: 'warning' | 'neutral' | 'danger';
}) {
  const toneClass =
    tone === 'danger'
      ? 'border-[var(--danger-600)]/30 bg-[var(--danger-50)] text-[var(--danger-600)]'
      : tone === 'warning'
        ? 'border-[var(--warning-600)]/30 bg-[var(--warning-50)] text-[var(--warning-600)]'
        : 'border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-secondary)]';

  return (
    <div className={cn('flex items-start gap-3 rounded-md border p-3', toneClass)}>
      <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <div className="text-xs font-medium">{label}</div>
        <div className="mt-1 font-semibold financial-figures">{value}</div>
      </div>
    </div>
  );
}

type NoticeTone = 'info' | 'success' | 'warning' | 'danger';

export function Notice({
  title,
  children,
  tone = 'info',
  className,
}: {
  title?: string;
  children: ReactNode;
  tone?: NoticeTone;
  className?: string;
}) {
  const config = {
    info: {
      icon: Info,
      classes: 'border-[var(--info-600)]/25 bg-[var(--info-50)] text-[var(--info-600)]',
    },
    success: {
      icon: CheckCircle2,
      classes: 'border-[var(--green-700)]/25 bg-[var(--success-50)] text-[var(--success-700)]',
    },
    warning: {
      icon: AlertTriangle,
      classes: 'border-[var(--warning-600)]/25 bg-[var(--warning-50)] text-[var(--warning-600)]',
    },
    danger: {
      icon: XCircle,
      classes: 'border-[var(--danger-600)]/25 bg-[var(--danger-50)] text-[var(--danger-600)]',
    },
  }[tone];
  const Icon = config.icon;

  return (
    <div className={cn('flex gap-3 rounded-md border p-4 text-sm', config.classes, className)}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="min-w-0">
        {title ? <div className="font-semibold">{title}</div> : null}
        <div className={cn('leading-6', title && 'mt-1')}>{children}</div>
      </div>
    </div>
  );
}

export function StatusBadge({
  label,
  tone = 'neutral',
  icon,
  className,
}: {
  label: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  icon?: ReactNode;
  className?: string;
}) {
  const tones = {
    neutral: 'border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-secondary)]',
    success: 'border-[var(--green-700)]/25 bg-[var(--success-50)] text-[var(--success-700)]',
    warning: 'border-[var(--warning-600)]/25 bg-[var(--warning-50)] text-[var(--warning-600)]',
    danger: 'border-[var(--danger-600)]/25 bg-[var(--danger-50)] text-[var(--danger-600)]',
    info: 'border-[var(--stellar-700)]/25 bg-[var(--stellar-50)] text-[var(--stellar-700)]',
  };

  return (
    <span
      className={cn(
        'inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold',
        tones[tone],
        className,
      )}
    >
      {icon}
      {label}
    </span>
  );
}

export function VerificationSurface({
  status,
  description,
  reference,
  href,
  confirmed,
}: {
  status: string;
  description: string;
  reference?: string | null;
  href?: string | null;
  confirmed: boolean;
}) {
  return (
    <section className="rounded-lg border border-[var(--info-600)]/25 bg-[var(--stellar-50)] p-4">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--stellar-700)]" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold text-[var(--navy-900)]">Verification</h3>
            <StatusBadge
              label={status}
              tone={confirmed ? 'info' : 'neutral'}
              icon={confirmed ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
            />
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
          {reference ? (
            <div className="mt-3">
              <HashDisplay label="Reference" value={reference} href={href} />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('skeleton rounded-md', className)} {...props} />;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="field-surface flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
      {icon ? <div className="mb-4 text-[var(--text-muted)]">{icon}</div> : null}
      <h2 className="text-lg font-semibold text-[var(--navy-900)]">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
