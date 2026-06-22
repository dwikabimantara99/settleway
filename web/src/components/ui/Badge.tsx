import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline';
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const baseStyles = 'inline-flex min-h-7 items-center rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:ring-offset-2';
  
  const variants = {
    default: 'border-[var(--navy-800)] bg-[var(--navy-800)] text-white',
    secondary: 'border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-secondary)]',
    outline: 'border-[var(--border-default)] bg-[var(--surface)] text-[var(--navy-800)]',
  };

  return (
    <div className={cn(baseStyles, variants[variant], className)} {...props} />
  );
}

export { Badge };
