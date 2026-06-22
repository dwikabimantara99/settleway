import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  ChevronLeft,
  Handshake,
  MapPin,
  Scale,
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
import { demoBuyerRequests, demoProfiles } from '@/lib/demo/demo-data';

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

export default async function BuyerRequestDetailPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;
  const request = demoBuyerRequests.find((item) => item.id === requestId);

  if (!request) return notFound();

  const buyer = demoProfiles[request.buyerId];

  return (
    <main className="field-container py-10">
      <Link
        href="/buyer-requests"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--green-700)]"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Sell marketplace
      </Link>

      <SectionHeader
        eyebrow="Buyer request"
        title={request.commodity}
        description={request.description}
        action={<StatusBadge label="Open request" tone="info" />}
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="space-y-6">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="relative aspect-[16/7] min-h-72 bg-[var(--surface-subtle)]">
                <Image
                  src={getCommodityImage(request.commodity)}
                  alt={request.commodity}
                  fill
                  sizes="(min-width: 1024px) 760px, 100vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[rgba(3,8,31,0.72)] to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 text-white">
                  <StatusBadge label="Demand before escrow" tone="warning" />
                  <h2 className="mt-4 max-w-2xl text-3xl font-semibold">{request.variety}</h2>
                  <p className="mt-2 text-sm text-white/80">
                    This request starts with a submitted offer and recorded negotiation before the
                    Deal Room can open.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Request Requirements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-[var(--border-subtle)] p-4">
                  <Scale className="h-5 w-5 text-[var(--green-700)]" />
                  <AmountDisplay
                    label="Required volume"
                    value={`${request.requiredVolumeKg.toLocaleString('id-ID')} kg`}
                  />
                </div>
                <div className="rounded-lg border border-[var(--border-subtle)] p-4">
                  <Tag className="h-5 w-5 text-[var(--green-700)]" />
                  <AmountDisplay label="Target price" value={`${formatIdr(request.targetPricePerKgIdr)} /kg`} />
                </div>
                <div className="rounded-lg border border-[var(--border-subtle)] p-4">
                  <MapPin className="h-5 w-5 text-[var(--green-700)]" />
                  <AmountDisplay label="Delivery destination" value={request.deliveryLocation} />
                </div>
                <div className="rounded-lg border border-[var(--border-subtle)] p-4">
                  <CalendarDays className="h-5 w-5 text-[var(--green-700)]" />
                  <AmountDisplay label="Required date" value={formatDate(request.requiredDate)} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Notice title="Offer first, Deal Room later" tone="info">
            Submit Offer creates the commercial baseline and starts the recorded negotiation. The
            active escrow room opens only after the offer is accepted and both parties commit.
          </Notice>
        </section>

        <aside className="space-y-6">
          <Card className="border-[var(--green-700)]/25">
            <CardHeader>
              <CardTitle>Commercial Baseline</CardTitle>
            </CardHeader>
            <CardContent>
              <dl>
                <DataRow label="Volume" value={`${request.requiredVolumeKg.toLocaleString('id-ID')} kg`} />
                <DataRow label="Target price" value={`${formatIdr(request.targetPricePerKgIdr)} /kg`} />
                <DataRow
                  label="Indicative value"
                  value={<span className="text-[var(--green-700)]">{formatIdr(request.estimatedTotalIdr)}</span>}
                  emphasized
                />
              </dl>
              <Link
                href={`/offers/new?buyerRequestId=${request.id}`}
                className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] border border-[var(--green-700)] bg-[var(--green-700)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--green-800)]"
              >
                Submit Offer
                <ArrowRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Buyer Assurance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-[var(--navy-900)]">{buyer?.displayName}</h3>
                <p className="text-sm text-[var(--text-secondary)]">{buyer?.roleLabel}</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-[var(--text-muted)]">
                  <MapPin className="h-4 w-4" />
                  {buyer?.location}
                </p>
              </div>
              <div className="grid gap-3">
                <div className="flex items-center gap-3 rounded-md border border-[var(--border-subtle)] p-3">
                  <ShieldCheck className="h-5 w-5 text-[var(--green-700)]" />
                  <span className="text-sm">Reputation {buyer?.buyerScore ?? 0}/100</span>
                </div>
                <div className="flex items-center gap-3 rounded-md border border-[var(--border-subtle)] p-3">
                  <Handshake className="h-5 w-5 text-[var(--green-700)]" />
                  <span className="text-sm">{buyer?.buyerCompletedCount ?? 0} completed purchases</span>
                </div>
                <div className="flex items-center gap-3 rounded-md border border-[var(--border-subtle)] p-3">
                  <BadgeCheck className="h-5 w-5 text-[var(--green-700)]" />
                  <span className="text-sm">Verified buyer</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  );
}
