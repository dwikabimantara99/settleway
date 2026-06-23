import { Skeleton } from '@/components/field-ledger/primitives';

export default function MarketplaceLoading() {
  return (
    <main className="aurora-canvas min-h-screen py-10">
      <div className="field-container" aria-label="Loading marketplace">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="mt-4 h-12 max-w-2xl" />
        <Skeleton className="mt-4 h-6 max-w-xl" />
        <Skeleton className="mt-8 h-16 w-full rounded-[1.125rem]" />
        <div className="mt-8 grid min-h-[31rem] overflow-hidden rounded-[var(--radius-feature)] border bg-white lg:grid-cols-2">
          <Skeleton className="h-full min-h-72 rounded-none" />
          <div className="space-y-5 p-8">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-10 w-56" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="mt-10 h-12 w-full" />
          </div>
        </div>
      </div>
    </main>
  );
}
