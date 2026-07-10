import { Check, Clock3 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Step {
  label: string;
  status: 'complete' | 'current' | 'upcoming';
  actor?: string;
  detail?: string;
  timestamp?: string | null;
  txHash?: string | null;
  proofHash?: string | null;
}

interface StepperProps {
  steps: Step[];
  className?: string;
}

export function Stepper({ steps, className }: StepperProps) {
  return (
    <nav aria-label="Trade progression" className={className}>
      <ol className="grid gap-0 overflow-hidden rounded-lg border bg-[var(--surface)] md:grid-cols-3 xl:grid-cols-6">
        {steps.map((step, index) => (
          <li
            key={step.label}
            aria-current={step.status === 'current' ? 'step' : undefined}
            className={cn(
              'relative min-h-24 border-b border-[var(--border-subtle)] p-4 md:border-b-0 md:border-r last:border-0',
              step.status === 'current' && 'bg-[var(--navy-50)]',
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold financial-figures',
                  step.status === 'complete' &&
                    'border-[var(--green-700)] bg-[var(--green-700)] text-white',
                  step.status === 'current' &&
                    'border-[var(--navy-700)] bg-white text-[var(--navy-800)]',
                  step.status === 'upcoming' &&
                    'border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-muted)]',
                )}
              >
                {step.status === 'complete' ? (
                  <Check className="h-4 w-4" />
                ) : step.status === 'current' ? (
                  <Clock3 className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </span>
              <span className="text-[10px] font-semibold uppercase text-[var(--text-muted)]">
                {step.status}
              </span>
            </div>
            <div className="mt-3 text-sm font-semibold text-[var(--navy-900)]">{step.label}</div>
            {step.actor || step.detail ? (
              <div className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                {step.actor ?? step.detail}
              </div>
            ) : null}
            {step.timestamp && (
              <div className="mt-2 text-[10px] font-medium text-[var(--text-muted)]">
                {step.timestamp}
              </div>
            )}
            {step.txHash && (
              <div className="mt-1 flex items-center gap-1 text-[10px] font-mono text-emerald-600">
                <span className="truncate" title={step.txHash}>
                  Tx: {step.txHash.slice(0, 8)}...{step.txHash.slice(-4)}
                </span>
              </div>
            )}
            {step.proofHash && (
              <div className="mt-1 flex items-center gap-1 text-[10px] font-mono text-purple-600">
                <span className="truncate" title={step.proofHash}>
                  Proof: {step.proofHash.slice(0, 8)}...{step.proofHash.slice(-4)}
                </span>
              </div>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
