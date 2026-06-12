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
      <ol role="list" className="flex flex-col md:flex-row md:items-center gap-y-6 md:gap-y-0 md:justify-between w-full">
        {steps.map((step, stepIdx) => (
          <li key={step.label} className={cn(stepIdx !== steps.length - 1 ? 'md:flex-1' : '', 'relative flex md:block items-center')}>
            {step.status === 'complete' ? (
              <>
                <div className="hidden md:block absolute top-4 left-4 w-full" aria-hidden="true">
                  <div className="h-0.5 w-full bg-emerald-600" />
                </div>
                <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 hover:bg-emerald-700 shrink-0 mx-auto">
                  <Check className="h-5 w-5 text-white" aria-hidden="true" />
                </div>
              </>
            ) : step.status === 'current' ? (
              <>
                <div className="hidden md:block absolute top-4 left-4 w-full" aria-hidden="true">
                  <div className="h-0.5 w-full bg-slate-200" />
                </div>
                <div className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-emerald-600 bg-white shrink-0 mx-auto">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
                </div>
              </>
            ) : (
              <>
                <div className="hidden md:block absolute top-4 left-4 w-full" aria-hidden="true">
                  <div className="h-0.5 w-full bg-slate-200" />
                </div>
                <div className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-300 bg-white shrink-0 mx-auto">
                  <span className="h-2.5 w-2.5 rounded-full bg-transparent" />
                </div>
              </>
            )}
            <span className="ml-3 md:ml-0 md:mt-3 md:block md:text-center text-sm md:text-xs font-medium text-slate-700 md:text-slate-500 md:w-full">
              {step.label}
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
