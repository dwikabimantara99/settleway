export default function GlobalLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="space-y-3">
          <div className="skeleton h-4 w-32 rounded-full" />
          <div className="skeleton h-10 w-2/3 rounded-2xl" />
          <div className="skeleton h-5 w-1/2 rounded-full" />
        </div>
        {/* Cards skeleton grid */}
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6">
              <div className="skeleton mb-4 h-5 w-24 rounded-full" />
              <div className="skeleton mb-2 h-7 w-3/4 rounded-xl" />
              <div className="skeleton h-4 w-1/2 rounded-full" />
              <div className="mt-5 space-y-2">
                <div className="skeleton h-3 w-full rounded-full" />
                <div className="skeleton h-3 w-4/5 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
