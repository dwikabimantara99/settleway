'use client';

import { useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Package2, Search, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { EmptyState, StatusBadge } from '@/components/field-ledger/primitives';
import { Select, TextInput } from '@/components/field-ledger/forms';
import { TradeSurfaceCard } from '@/components/marketplace/TradeSurfaceCard';
import { Button } from '@/components/ui/Button';
import { demoListings, demoProfiles } from '@/lib/demo/demo-data';

const STATUS_OPTIONS = [
  { value: '', label: 'All availability' },
  { value: 'ready_stock', label: 'Ready stock' },
  { value: 'pre_harvest', label: 'Pre-harvest' },
];

function MarketplaceContent() {
  const searchParams = useSearchParams();
  const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return demoListings.filter((listing) => {
      const matchesSearch =
        !q ||
        listing.commodity.toLowerCase().includes(q) ||
        listing.variety?.toLowerCase().includes(q) ||
        listing.location?.toLowerCase().includes(q);
      const matchesStatus = !statusFilter || listing.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter]);

  const hasActiveFilters = Boolean(search || statusFilter);
  const [featured, ...secondary] = filtered;

  function clearFilters() {
    setSearch('');
    setStatusFilter('');
  }

  return (
    <main className="aurora-canvas min-h-screen pb-16 pt-10">
      <div className="field-container">
        <header className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase text-[var(--azure-700)]">
              <Sparkles className="h-3.5 w-3.5" />
              Buy marketplace
            </div>
            <h1 className="display-balance mt-3 text-4xl font-semibold tracking-tight text-[var(--navy-900)] sm:text-5xl">
              Find supply worth committing to.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--text-secondary)]">
              Review origin, quantity, price, and outcome-backed seller confidence before a
              recorded negotiation begins.
            </p>
          </div>
          <StatusBadge
            label={`${filtered.length} listing${filtered.length === 1 ? '' : 's'} available`}
            tone="success"
            className="w-fit"
          />
        </header>

        <section className="aurora-command sticky top-[5.25rem] z-30 mt-8 p-3">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <TextInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search commodity, origin, or variety..."
                className="border-transparent bg-[var(--surface-subtle)] pl-11 pr-10"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-white"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            <Button type="button" variant="outline" onClick={() => setShowFilters((value) => !value)}>
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </Button>
            {hasActiveFilters ? (
              <Button type="button" variant="ghost" onClick={clearFilters}>
                Clear
              </Button>
            ) : null}
          </div>

          {showFilters ? (
            <div className="mt-3 border-t border-[var(--border-subtle)] pt-3 sm:max-w-xs">
              <label className="text-xs font-semibold text-[var(--navy-900)]" htmlFor="listing-status">
                Availability
              </label>
              <Select
                id="listing-status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="mt-2"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value || 'all'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
        </section>

        {filtered.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              icon={<Package2 className="h-8 w-8" />}
              title="No listings match this search"
              description="Try another commodity, origin, or availability filter."
              action={
                hasActiveFilters ? (
                  <Button type="button" variant="outline" onClick={clearFilters}>
                    Clear filters
                  </Button>
                ) : null
              }
            />
          </div>
        ) : (
          <>
            <section className="mt-8">
              <TradeSurfaceCard
                audience="buy"
                commodity={featured.commodity}
                subtitle={featured.variety}
                badgeLabel={featured.status === 'ready_stock' ? 'Ready stock' : 'Pre-harvest'}
                badgeTone={featured.status === 'ready_stock' ? 'success' : 'info'}
                locationLabel="Origin"
                locationValue={featured.location}
                volumeValue={`${featured.estimatedVolumeKg.toLocaleString('id-ID')} kg available`}
                pricePerKgIdr={featured.pricePerKgIdr}
                estimatedValueIdr={featured.estimatedValueIdr}
                trustScore={demoProfiles[featured.sellerId]?.sellerScore ?? 0}
                verificationLabel="Verified seller"
                activityLabel={`${demoProfiles[featured.sellerId]?.sellerCompletedCount ?? 0} completed deals`}
                counterpartyName={demoProfiles[featured.sellerId]?.displayName ?? 'Counterparty'}
                detailHref={`/marketplace/${featured.id}${queryString}`}
                detailLabel="Review opportunity"
                featured
              />
            </section>

            {secondary.length > 0 ? (
              <section className="mt-10">
                <div className="mb-5 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase text-[var(--text-muted)]">
                      More active supply
                    </p>
                    <h2 className="mt-1 text-2xl font-semibold text-[var(--navy-900)]">
                      Compare the commercial baseline
                    </h2>
                  </div>
                </div>
                <div className="grid gap-5 xl:grid-cols-2">
                  {secondary.map((listing) => {
                    const seller = demoProfiles[listing.sellerId];
                    return (
                      <TradeSurfaceCard
                        key={listing.id}
                        audience="buy"
                        commodity={listing.commodity}
                        subtitle={listing.variety}
                        badgeLabel={listing.status === 'ready_stock' ? 'Ready stock' : 'Pre-harvest'}
                        badgeTone={listing.status === 'ready_stock' ? 'success' : 'info'}
                        locationLabel="Origin"
                        locationValue={listing.location}
                        volumeValue={`${listing.estimatedVolumeKg.toLocaleString('id-ID')} kg available`}
                        pricePerKgIdr={listing.pricePerKgIdr}
                        estimatedValueIdr={listing.estimatedValueIdr}
                        trustScore={seller?.sellerScore ?? 0}
                        verificationLabel="Verified seller"
                        activityLabel={`${seller?.sellerCompletedCount ?? 0} completed deals`}
                        counterpartyName={seller?.displayName ?? 'Counterparty'}
                        detailHref={`/marketplace/${listing.id}${queryString}`}
                        detailLabel="Review opportunity"
                      />
                    );
                  })}
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}

export default function MarketplacePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--green-500)] border-t-transparent" />
      </div>
    }>
      <MarketplaceContent />
    </Suspense>
  );
}
