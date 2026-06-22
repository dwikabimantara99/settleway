'use client';

import { useState, useMemo } from 'react';
import { demoBuyerRequests, demoProfiles } from '@/lib/demo/demo-data';
import { Search, SlidersHorizontal, X, Package2 } from 'lucide-react';
import { TradeSurfaceCard } from '@/components/marketplace/TradeSurfaceCard';

const BADGE_LABELS = ['Immediate Need', 'Recurring Demand', 'Scheduled Purchase'];
const BADGE_TONES = ['emerald', 'violet', 'blue'] as const;

export default function BuyerRequestsPage() {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return demoBuyerRequests.filter((req) =>
      !q ||
      req.commodity.toLowerCase().includes(q) ||
      req.variety?.toLowerCase().includes(q) ||
      req.deliveryLocation?.toLowerCase().includes(q),
    );
  }, [search]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* ── Header ── */}
      <div className="mb-10 flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-500" />
            </span>
            {filtered.length} active request{filtered.length !== 1 ? 's' : ''}
          </div>
          <h1 className="mt-3 text-5xl font-extrabold tracking-tight text-slate-950">Sell</h1>
          <p className="mt-3 text-xl leading-8 text-slate-600">
            Browse active agricultural purchase requests posted by buyers before any protected room is opened.
          </p>
          <p className="mt-2 text-base leading-7 text-slate-400">
            Review demand, target prices, and delivery needs, then respond with the right supply offer.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row xl:pt-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search commodity, location…"
              className="h-13 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-10 text-base text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 sm:w-80"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            type="button"
            className="flex h-13 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-base font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <SlidersHorizontal className="h-5 w-5" />
            Filters
          </button>
        </div>
      </div>

      {/* ── Results ── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white py-20 text-center shadow-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <Package2 className="h-8 w-8" />
          </div>
          <h2 className="mt-5 text-xl font-bold text-slate-900">No requests found</h2>
          <p className="mt-2 text-sm text-slate-500">Try adjusting your search.</p>
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="mt-5 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
          {filtered.map((req, index) => {
            const buyer = demoProfiles[req.buyerId];
            const badgeLabel = BADGE_LABELS[index % BADGE_LABELS.length];
            const badgeTone = BADGE_TONES[index % BADGE_TONES.length];

            return (
              <TradeSurfaceCard
                key={req.id}
                audience="sell"
                commodity={req.commodity}
                subtitle={req.variety}
                badgeLabel={badgeLabel}
                badgeTone={badgeTone}
                locationLabel="Delivery to"
                locationValue={req.deliveryLocation}
                volumeValue={`${req.requiredVolumeKg.toLocaleString('id-ID')} kg needed`}
                pricePerKgIdr={req.targetPricePerKgIdr}
                estimatedValueIdr={req.estimatedTotalIdr}
                trustScore={buyer?.buyerScore ?? 0}
                verificationLabel="Verified Buyer"
                activityLabel={`${buyer?.buyerCompletedCount ?? 0} completed purchases`}
                counterpartyName={buyer?.displayName ?? 'Counterparty'}
                detailHref={`/offers/new?buyerRequestId=${req.id}`}
                detailLabel="Submit Offer"
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
