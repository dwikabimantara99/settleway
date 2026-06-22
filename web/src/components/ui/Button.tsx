import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const baseStyles = 'inline-flex shrink-0 items-center justify-center gap-2 rounded-[var(--radius-control)] font-semibold transition-colors duration-[var(--duration-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)] disabled:pointer-events-none disabled:opacity-50';
    
    const variants = {
      primary: 'border border-[var(--green-700)] bg-[var(--green-700)] text-white hover:bg-[var(--green-800)]',
      secondary: 'border border-[var(--navy-800)] bg-[var(--navy-800)] text-white hover:bg-[var(--navy-900)]',
      outline: 'border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--navy-800)] hover:border-[var(--navy-500)] hover:bg-[var(--navy-50)]',
      ghost: 'border border-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--navy-900)]',
      danger: 'border border-[var(--danger-600)] bg-[var(--danger-600)] text-white hover:bg-[#923128]',
    };
    
    const sizes = {
      sm: 'min-h-9 px-3 text-xs',
      md: 'min-h-11 px-4 py-2 text-sm',
      lg: 'min-h-12 px-6 text-base',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button };
