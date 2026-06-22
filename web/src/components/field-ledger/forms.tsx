import {
  forwardRef,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/lib/utils';

const controlClass =
  'min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-elevated)] px-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] hover:border-[var(--border-strong)] focus:border-[var(--green-600)] focus:outline-none focus:ring-2 focus:ring-[var(--green-100)] disabled:cursor-not-allowed disabled:bg-[var(--surface-subtle)] disabled:text-[var(--text-muted)]';

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(controlClass, className)} {...props} />
  ),
);
TextInput.displayName = 'TextInput';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(controlClass, 'min-h-28 resize-y py-3', className)}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select ref={ref} className={cn(controlClass, className)} {...props} />
  ),
);
Select.displayName = 'Select';

export function FieldLabel({
  htmlFor,
  children,
  hint,
}: {
  htmlFor: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-[var(--navy-900)]">
      {children}
      {hint ? <span className="ml-2 font-normal text-[var(--text-muted)]">{hint}</span> : null}
    </label>
  );
}
