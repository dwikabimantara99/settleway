import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  ChevronLeft,
  FileText,
  Handshake,
  MapPin,
  Package,
  ShieldCheck,
  Tag,
} from 'lucide-react';
import {
  AmountDisplay,
  DataRow,
  Notice,
  SectionHeader,
  StatusBadge,
} from '@/components/field-ledger/primitives';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { demoListings, demoProfiles } from '@/lib/demo/demo-data';

function formatIdr(value: number): string {
  return `Rp ${value.toLocaleString('id-ID')}`;
}

function getCommodityImage(commodity: string) {
  const normalized = commodity.toLowerCase();
  if (normalized.includes('coffee') || normalized.includes('arabica') || normalized.includes('beans')) {
    return '/commodities/green-coffee.png';
  }
  if (normalized.includes('rice')) return '/commodities/white-rice.png';
  return '/commodities/red-chili.png';
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`));
}

function buildSellerDescription(input: {
  variety: string;
  isReadyStock: boolean;
  location: string;
  volumeKg: number;
  harvestDate?: string;
  sellerName?: string;
}) {
  const readiness = input.isReadyStock
    ? 'This lot is already sorted and ready for buyer review, pickup coordination, or delivery scheduling.'
    : `This lot is planned from the upcoming harvest window${input.harvestDate ? ` around ${formatDate(input.harvestDate)}` : ''}, so buyers should confirm the final delivery schedule during negotiation.`;

  return `${input.sellerName ?? 'The seller'} is offering ${input.volumeKg.toLocaleString('id-ID')} kg of ${input.variety} from ${input.location}. ${readiness} Buyers should use the recorded negotiation to confirm final quantity, price, grading expectations, packaging, delivery handoff, and the product photos or documents that should be attached before the protected Deal Room opens.`;
}

export default async function ListingDetailPage(props: {
  params: Promise<{ listingId: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { listingId } = await props.params;
  const resolvedSearchParams = props.searchParams ? await props.searchParams : {};
  const listing = demoListings.find((item) => item.id === listingId);

  if (!listing) return notFound();

  const isDemo = resolvedSearchParams?.demo === '1';
  const role = typeof resolvedSearchParams?.role === 'string' ? resolvedSearchParams.role : undefined;

  const queryParams = new URLSearchParams();
  if (isDemo) queryParams.set('demo', '1');
  if (role) queryParams.set('role', role);
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

  let submitOfferHref = `/offers/new?listingId=${listing.id}${queryString ? '&' + queryParams.toString() : ''}`;
  if (isDemo && listingId === 'listing-cabai-001') {
    submitOfferHref = `/offers/offer-demo-cabai-001${queryString}`;
  }

  const seller = demoProfiles[listing.sellerId];
  const isReadyStock = listing.status === 'ready_stock';
  const sellerDescription = buildSellerDescription({
    variety: listing.variety,
    isReadyStock,
    location: listing.location,
    volumeKg: listing.estimatedVolumeKg,
    harvestDate: listing.harvestDate,
    sellerName: seller?.displayName,
  });

  return (
    <main className="field-container min-w-0 py-10">
      <Link
        href={`/marketplace${queryString}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--green-700)]"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Buy marketplace
      </Link>

      <SectionHeader
        eyebrow="Seller listing"
        title={listing.commodity}
        description={listing.description}
        action={
          <StatusBadge
            label={isReadyStock ? 'Ready stock' : 'Pre-harvest'}
            tone={isReadyStock ? 'success' : 'info'}
          />
        }
      />

      <div className="mt-8 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="min-w-0 space-y-6">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="relative aspect-[16/7] min-h-72 max-w-full bg-[var(--surface-subtle)]">
                <Image
                  src={getCommodityImage(listing.commodity)}
                  alt={listing.commodity}
                  fill
                  sizes="(min-width: 1024px) 760px, 100vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[rgba(3,8,31,0.72)] to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 text-white">
                  <StatusBadge label="Offer before escrow" tone="success" />
                  <h2 className="mt-4 max-w-2xl text-3xl font-semibold">{listing.variety}</h2>
                  <p className="mt-2 text-sm text-white/80">
                    Submit Offer starts recorded negotiation. The active room opens only after
                    accepted terms and mutual commitment.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Listing Snapshot</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-[var(--border-subtle)] p-4">
                  <Package className="h-5 w-5 text-[var(--green-700)]" />
                  <AmountDisplay
                    label="Available volume"
                    value={`${listing.estimatedVolumeKg.toLocaleString('id-ID')} kg`}
                  />
                </div>
                <div className="rounded-lg border border-[var(--border-subtle)] p-4">
                  <Tag className="h-5 w-5 text-[var(--green-700)]" />
                  <AmountDisplay label="Price per kg" value={`${formatIdr(listing.pricePerKgIdr)} /kg`} />
                </div>
                <div className="rounded-lg border border-[var(--border-subtle)] p-4">
                  <MapPin className="h-5 w-5 text-[var(--green-700)]" />
                  <AmountDisplay label="Origin" value={listing.location} />
                </div>
                <div className="rounded-lg border border-[var(--border-subtle)] p-4">
                  <CalendarDays className="h-5 w-5 text-[var(--green-700)]" />
                  <AmountDisplay
                    label={listing.harvestDate ? 'Harvest date' : 'Availability'}
                    value={listing.harvestDate ? formatDate(listing.harvestDate) : 'Available now'}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Seller Description</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_16rem]">
                <div>
                  <p className="text-base leading-8 text-[var(--text-secondary)]">
                    {sellerDescription}
                  </p>
                  <p className="mt-4 text-sm leading-6 text-[var(--text-muted)]">
                    Seller notes are part of pre-deal context. Final commercial terms must still be
                    confirmed through Submit Offer and the recorded negotiation thread.
                  </p>
                </div>
                <div className="rounded-2xl border border-[var(--green-100)] bg-[var(--green-50)] p-4">
                  <h3 className="text-sm font-semibold text-[var(--green-800)]">
                    What to clarify next
                  </h3>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--text-secondary)]">
                    <li>Quality grade and sorting tolerance</li>
                    <li>Delivery timing and handoff location</li>
                    <li>Photos, receipts, or quality documents</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Notice title="Recorded negotiation is the first gate" tone="success">
            Buyers and sellers discuss price, quantity, delivery, quality, and evidence before any
            deposit or escrow action begins.
          </Notice>
        </section>

        <aside className="min-w-0 space-y-6">
          <Card className="border-[var(--green-700)]/25">
            <CardHeader>
              <CardTitle>Commercial Baseline</CardTitle>
            </CardHeader>
            <CardContent>
              <dl>
                <DataRow label="Volume" value={`${listing.estimatedVolumeKg.toLocaleString('id-ID')} kg`} />
                <DataRow label="Price" value={`${formatIdr(listing.pricePerKgIdr)} /kg`} />
                <DataRow
                  label="Indicative value"
                  value={<span className="text-[var(--green-700)]">{formatIdr(listing.estimatedValueIdr)}</span>}
                  emphasized
                />
              </dl>
              <Link
                href={submitOfferHref}
                className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] border border-[var(--green-700)] bg-[var(--green-700)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--green-800)]"
              >
                Submit Offer
                <ArrowRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Seller Assurance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-[var(--navy-900)]">{seller?.displayName}</h3>
                <p className="text-sm text-[var(--text-secondary)]">{seller?.roleLabel}</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-[var(--text-muted)]">
                  <MapPin className="h-4 w-4" />
                  {seller?.location}
                </p>
              </div>
              <div className="grid gap-3">
                <div className="flex items-center gap-3 rounded-md border border-[var(--border-subtle)] p-3">
                  <ShieldCheck className="h-5 w-5 text-[var(--green-700)]" />
                  <span className="text-sm">Reputation {seller?.sellerScore ?? 0}/100</span>
                </div>
                <div className="flex items-center gap-3 rounded-md border border-[var(--border-subtle)] p-3">
                  <Handshake className="h-5 w-5 text-[var(--green-700)]" />
                  <span className="text-sm">{seller?.sellerCompletedCount ?? 0} completed deals</span>
                </div>
                <div className="flex items-center gap-3 rounded-md border border-[var(--border-subtle)] p-3">
                  <BadgeCheck className="h-5 w-5 text-[var(--green-700)]" />
                  <span className="text-sm">Verified seller</span>
                </div>
                <div className="flex items-center gap-3 rounded-md border border-[var(--border-subtle)] p-3">
                  <FileText className="h-5 w-5 text-[var(--green-700)]" />
                  <span className="text-sm">Evidence expected after escrow activation</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  );
}
