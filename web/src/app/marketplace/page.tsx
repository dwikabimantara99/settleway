'use client';

import { useState, useMemo } from 'react';
import { demoListings, demoProfiles } from '@/lib/demo/demo-data';
import { Search, SlidersHorizontal, X, Package2 } from 'lucide-react';
import { TradeSurfaceCard } from '@/components/marketplace/TradeSurfaceCard';

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'ready_stock', label: 'Ready Stock' },
  { value: 'pre_harvest', label: 'Pre-Harvest' },
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

  const hasActiveFilters = search || statusFilter;

  function clearFilters() {
    setSearch('');
    setStatusFilter('');
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* ── Header ── */}
      <div className="mb-10 flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            {filtered.length} listing{filtered.length !== 1 ? 's' : ''} available
          </div>
          <h1 className="mt-3 text-5xl font-extrabold tracking-tight text-slate-950">Buy</h1>
          <p className="mt-3 text-xl leading-8 text-slate-600">
            Browse agricultural products listed by sellers before any protected room is opened.
          </p>
          <p className="mt-2 text-base leading-7 text-slate-400">
            Compare offers from sellers and connect with trusted farmer groups.
          </p>
        </div>

        {/* ── Search & Filter ── */}
        <div className="flex flex-col gap-3 sm:flex-row xl:pt-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search commodities, location…"
              className="h-13 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-10 text-base text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 sm:w-80"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={`flex h-13 items-center justify-center gap-2 rounded-2xl border px-5 text-base font-semibold transition-all ${
              showFilters || statusFilter
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="h-5 w-5" />
            Filters
            {statusFilter && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">1</span>
            )}
          </button>
        </div>
      </div>

      {/* ── Filter row ── */}
      {showFilters && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm animate-fade-in">
          <span className="text-sm font-semibold text-slate-700">Status:</span>
          {STATUS_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatusFilter(value)}
              className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-all ${
                statusFilter === value
                  ? 'border-emerald-500 bg-emerald-600 text-white shadow-[0_4px_12px_rgba(16,185,129,0.25)]'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:bg-emerald-50'
              }`}
            >
              {label}
            </button>
          ))}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="ml-auto flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-red-500"
            >
              <X className="h-4 w-4" />
              Clear all
            </button>
          )}
        </div>
      )}

      {/* ── Results ── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white py-20 text-center shadow-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <Package2 className="h-8 w-8" />
          </div>
          <h2 className="mt-5 text-xl font-bold text-slate-900">No listings found</h2>
          <p className="mt-2 text-sm text-slate-500">
            Try adjusting your search or filters.
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-5 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
          {filtered.map((listing) => {
            const seller = demoProfiles[listing.sellerId];
            return (
              <TradeSurfaceCard
                key={listing.id}
                audience="buy"
                commodity={listing.commodity}
                subtitle={listing.variety}
                badgeLabel={listing.status === 'ready_stock' ? 'Ready Stock' : 'Pre-Harvest'}
                badgeTone={listing.status === 'ready_stock' ? 'green' : 'blue'}
                locationLabel="Origin"
                locationValue={listing.location}
                volumeValue={`${listing.estimatedVolumeKg.toLocaleString('id-ID')} kg available`}
                pricePerKgIdr={listing.pricePerKgIdr}
                estimatedValueIdr={listing.estimatedValueIdr}
                trustScore={seller?.sellerScore ?? 0}
                verificationLabel="Verified Seller"
                activityLabel={`${seller?.sellerCompletedCount ?? 0} completed deals`}
                counterpartyName={seller?.displayName ?? 'Counterparty'}
                detailHref={`/marketplace/${listing.id}`}
                detailLabel="View Details"
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
