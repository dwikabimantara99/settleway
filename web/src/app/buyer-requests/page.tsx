'use client';

import { useMemo, useState } from 'react';
import { Package2, Search, SlidersHorizontal, X } from 'lucide-react';
import { EmptyState, SectionHeader, StatusBadge } from '@/components/field-ledger/primitives';
import { TextInput } from '@/components/field-ledger/forms';
import { TradeSurfaceCard } from '@/components/marketplace/TradeSurfaceCard';
import { Button } from '@/components/ui/Button';
import { demoBuyerRequests, demoProfiles } from '@/lib/demo/demo-data';

const BADGE_LABELS = ['Immediate need', 'Recurring demand', 'Scheduled purchase'];
const BADGE_TONES = ['warning', 'success', 'info'] as const;

export default function BuyerRequestsPage() {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return demoBuyerRequests.filter(
      (request) =>
        !q ||
        request.commodity.toLowerCase().includes(q) ||
        request.variety?.toLowerCase().includes(q) ||
        request.deliveryLocation?.toLowerCase().includes(q),
    );
  }, [search]);

  return (
    <main className="field-container py-10">
      <SectionHeader
        eyebrow="Sell marketplace"
        title="Sell"
        description="Review buyer requests and sell into verified demand."
        action={
          <StatusBadge
            label={`${filtered.length} request${filtered.length === 1 ? '' : 's'} active`}
            tone="info"
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
              placeholder="Search commodity, destination, or variety..."
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
          <Button type="button" variant="outline">
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </Button>
          {search ? (
            <Button type="button" variant="ghost" onClick={() => setSearch('')}>
              Clear
            </Button>
          ) : null}
        </div>
      </section>

      {filtered.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={<Package2 className="h-8 w-8" />}
            title="No buyer requests found"
            description="Try another commodity, destination, or variety."
            action={
              search ? (
                <Button type="button" variant="outline" onClick={() => setSearch('')}>
                  Clear search
                </Button>
              ) : null
            }
          />
        </div>
      ) : (
        <section className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
          {filtered.map((request, index) => {
            const buyer = demoProfiles[request.buyerId];

            return (
              <TradeSurfaceCard
                key={request.id}
                audience="sell"
                commodity={request.commodity}
                subtitle={request.variety}
                badgeLabel={BADGE_LABELS[index % BADGE_LABELS.length]}
                badgeTone={BADGE_TONES[index % BADGE_TONES.length]}
                locationLabel="Delivery to"
                locationValue={request.deliveryLocation}
                volumeValue={`${request.requiredVolumeKg.toLocaleString('id-ID')} kg needed`}
                pricePerKgIdr={request.targetPricePerKgIdr}
                estimatedValueIdr={request.estimatedTotalIdr}
                trustScore={buyer?.buyerScore ?? 0}
                verificationLabel="Verified buyer"
                activityLabel={`${buyer?.buyerCompletedCount ?? 0} completed purchases`}
                counterpartyName={buyer?.displayName ?? 'Counterparty'}
                detailHref={`/buyer-requests/${request.id}`}
                detailLabel="Review opportunity"
              />
            );
          })}
        </section>
      )}
    </main>
  );
}
