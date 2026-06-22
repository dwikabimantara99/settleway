'use client';

import { useMemo, useState } from 'react';
import { Package2, Search, SlidersHorizontal, X } from 'lucide-react';
import { EmptyState, SectionHeader, StatusBadge } from '@/components/field-ledger/primitives';
import { Select, TextInput } from '@/components/field-ledger/forms';
import { TradeSurfaceCard } from '@/components/marketplace/TradeSurfaceCard';
import { Button } from '@/components/ui/Button';
import { demoListings, demoProfiles } from '@/lib/demo/demo-data';

const STATUS_OPTIONS = [
  { value: '', label: 'All status' },
  { value: 'ready_stock', label: 'Ready stock' },
  { value: 'pre_harvest', label: 'Pre-harvest' },
];

export default function MarketplacePage() {
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

  function clearFilters() {
    setSearch('');
    setStatusFilter('');
  }

  return (
    <main className="field-container py-10">
      <SectionHeader
        eyebrow="Buy marketplace"
        title="Buy"
        description="Browse agricultural products listed by sellers before any protected room is opened. Compare supply, price, reputation, and verified trade history before starting a recorded offer."
        action={
          <StatusBadge
            label={`${filtered.length} listing${filtered.length === 1 ? '' : 's'} available`}
            tone="success"
          />
        }
      />

      <section className="mt-8 field-surface p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <TextInput
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search commodities, origin, or variety..."
              className="pl-10 pr-10"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-[var(--text-muted)] hover:bg-[var(--surface-subtle)]"
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
          <div className="mt-4 grid gap-2 border-t border-[var(--border-subtle)] pt-4 sm:max-w-xs">
            <label className="text-sm font-medium text-[var(--navy-900)]" htmlFor="listing-status">
              Listing status
            </label>
            <Select
              id="listing-status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
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
            title="No listings found"
            description="Try another commodity, origin, or status filter."
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
        <section className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
          {filtered.map((listing) => {
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
                detailHref={`/marketplace/${listing.id}`}
                detailLabel="View Details"
              />
            );
          })}
        </section>
      )}
    </main>
  );
}
