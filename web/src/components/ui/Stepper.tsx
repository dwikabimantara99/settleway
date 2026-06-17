import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export interface Step {
  label: string;
  status: 'complete' | 'current' | 'upcoming';
}

interface StepperProps {
  steps: Step[];
  className?: string;
}

export function Stepper({ steps, className }: StepperProps) {
  return (
    <nav aria-label="Progress" className={className}>
      <ol
        role="list"
        className="flex w-full flex-col gap-y-6 md:flex-row md:items-start md:gap-y-0"
      >
        {steps.map((step, stepIdx) => (
          <li
            key={step.label}
            className="relative flex items-center md:flex-1 md:basis-0 md:flex-col md:items-center"
          >
            {step.status === 'complete' ? (
              <>
                <div
                  className={cn(
                    'absolute left-1/2 top-4 hidden h-0.5 bg-emerald-600 md:block',
                    stepIdx === steps.length - 1 ? 'w-0' : 'w-full',
                  )}
                  aria-hidden="true"
                />
                <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 hover:bg-emerald-700 shrink-0 mx-auto">
                  <Check className="h-5 w-5 text-white" aria-hidden="true" />
                </div>
              </>
            ) : step.status === 'current' ? (
              <>
                <div
                  className={cn(
                    'absolute left-1/2 top-4 hidden h-0.5 bg-slate-200 md:block',
                    stepIdx === steps.length - 1 ? 'w-0' : 'w-full',
                  )}
                  aria-hidden="true"
                />
                <div className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-emerald-600 bg-white shrink-0 mx-auto">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
                </div>
              </>
            ) : (
              <>
                <div
                  className={cn(
                    'absolute left-1/2 top-4 hidden h-0.5 bg-slate-200 md:block',
                    stepIdx === steps.length - 1 ? 'w-0' : 'w-full',
                  )}
                  aria-hidden="true"
                />
                <div className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-300 bg-white shrink-0 mx-auto">
                  <span className="h-2.5 w-2.5 rounded-full bg-transparent" />
                </div>
              </>
            )}
            <span className="ml-3 text-sm font-medium text-slate-700 md:ml-0 md:mt-3 md:flex md:min-h-[2rem] md:w-full md:items-start md:justify-center md:px-2 md:text-center md:text-xs md:leading-4 md:text-slate-500">
              {step.label}
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
