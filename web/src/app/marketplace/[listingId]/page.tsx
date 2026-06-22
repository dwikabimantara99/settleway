import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { demoListings, demoProfiles } from '@/lib/demo/demo-data';
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  ChevronLeft,
  FileText,
  Handshake,
  Info,
  MapPin,
  Package,
  ShieldCheck,
  Star,
  Tag,
} from 'lucide-react';
import { notFound } from 'next/navigation';

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ listingId: string }>;
}) {
  const resolvedParams = await params;
  const listing = demoListings.find((l) => l.id === resolvedParams.listingId);

  if (!listing) return notFound();

  const seller = demoProfiles[listing.sellerId];
  const isReadyStock = listing.status === 'ready_stock';

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Back */}
      <Link
        href="/marketplace"
        className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-emerald-600"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Marketplace
      </Link>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* ── LEFT COLUMN ── */}
        <div className="space-y-6 lg:col-span-2">

          {/* ── Hero Card ── */}
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            {/* Commodity visual banner */}
            <div
              className="relative flex h-48 items-end p-6"
              style={{
                backgroundImage: [
                  'radial-gradient(circle at 18% 24%, rgba(255,255,255,0.18) 0, rgba(255,255,255,0) 24%)',
                  'radial-gradient(circle at 76% 18%, rgba(253,224,71,0.20) 0, rgba(253,224,71,0) 20%)',
                  'linear-gradient(135deg, rgba(69,10,10,0.96) 0%, rgba(185,28,28,0.96) 42%, rgba(249,115,22,0.88) 100%)',
                ].join(','),
              }}
            >
              <div className="absolute left-5 top-5 flex items-center gap-2">
                <Badge
                  className={
                    isReadyStock
                      ? 'border-emerald-200 bg-emerald-100 text-emerald-800'
                      : 'border-blue-200 bg-blue-100 text-blue-800'
                  }
                >
                  {isReadyStock ? 'Ready Stock' : 'Pre-Harvest'}
                </Badge>
                {listing.harvestDate && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                    <CalendarDays className="h-3 w-3" />
                    Harvest: {listing.harvestDate}
                  </span>
                )}
              </div>
              <div>
                <h1 className="text-4xl font-extrabold text-white">{listing.commodity}</h1>
                <p className="mt-1 text-lg text-white/80">{listing.variety}</p>
              </div>
            </div>

            <div className="p-6">
              {/* Key metrics */}
              <div className="grid gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-5 md:grid-cols-3">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <Package className="h-3.5 w-3.5" />
                    Volume
                  </div>
                  <div className="mt-2 text-xl font-bold text-slate-950">
                    {listing.estimatedVolumeKg.toLocaleString('id-ID')} kg
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <MapPin className="h-3.5 w-3.5" />
                    Origin
                  </div>
                  <div className="mt-2 text-xl font-bold text-slate-950">{listing.location}</div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <Tag className="h-3.5 w-3.5" />
                    Est. Value
                  </div>
                  <div className="mt-2 text-xl font-bold text-emerald-700">
                    Rp {listing.estimatedValueIdr.toLocaleString('id-ID')}
                  </div>
                </div>
              </div>

              {/* Description */}
              {listing.description && (
                <div className="mt-6 border-t border-slate-100 pt-6">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
                    <Info className="h-4 w-4 text-slate-400" />
                    About this listing
                  </h3>
                  <p className="text-sm leading-7 text-slate-600">{listing.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Seller Credibility ── */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-base font-bold text-slate-900">Why this seller looks credible</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  icon: ShieldCheck,
                  label: 'Reputation',
                  value: `${seller?.sellerScore ?? 0}/100`,
                  detail: `${seller?.sellerCompletedCount ?? 0} verified completions`,
                  color: 'emerald',
                },
                {
                  icon: Star,
                  label: 'Protected volume',
                  value: `Rp ${((seller?.verifiedVolumeIdr ?? 0)).toLocaleString('id-ID')}`,
                  detail: 'Verified trade history',
                  color: 'amber',
                },
                {
                  icon: FileText,
                  label: 'Proof mode',
                  value: seller?.proofVisibility === 'public' ? 'Public' : 'Private',
                  detail: 'Visible before room opens',
                  color: 'blue',
                },
              ].map(({ icon: Icon, label, value, detail, color }) => (
                <div
                  key={label}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-5"
                >
                  <div
                    className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl ${
                      color === 'emerald'
                        ? 'bg-emerald-100 text-emerald-700'
                        : color === 'amber'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
                  <div
                    className={`mt-1 text-xl font-extrabold ${
                      color === 'emerald' ? 'text-emerald-700' : 'text-slate-900'
                    }`}
                  >
                    {value}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">{detail}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Proof requirements ── */}
          <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-emerald-900">Standard Escrow Evidence</h3>
                <p className="mt-2 text-sm leading-6 text-emerald-700">
                  This trade expects photo evidence of loaded goods and a signed delivery receipt.
                  Submit Offer starts recorded negotiation first, then the protected room carries
                  the proof and escrow chronology forward.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="space-y-5">

          {/* Deal terms card */}
          <div className="overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-[0_8px_32px_rgba(16,185,129,0.10)]">
            <div className="border-b border-emerald-100 bg-emerald-50 px-6 py-4">
              <div className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                Deal Terms
              </div>
              <div className="mt-1 text-2xl font-extrabold text-slate-950">
                Rp {listing.pricePerKgIdr.toLocaleString('id-ID')}
                <span className="text-base font-medium text-slate-500"> /kg</span>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Volume</span>
                  <span className="font-semibold text-slate-900">
                    {listing.estimatedVolumeKg.toLocaleString('id-ID')} kg
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="font-semibold text-slate-900">Estimated value</span>
                  <span className="text-xl font-extrabold text-emerald-700">
                    Rp {listing.estimatedValueIdr.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              <Link
                href={`/offers/new?listingId=${listing.id}`}
                className="group mt-6 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-base font-semibold text-white shadow-[0_8px_20px_rgba(16,185,129,0.28)] transition-all hover:bg-emerald-700 hover:shadow-[0_12px_28px_rgba(16,185,129,0.36)] hover:-translate-y-0.5"
              >
                Submit Offer
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <p className="mt-3 text-center text-xs text-slate-500">
                Recorded negotiation starts first. The protected room and funding window open only
                after both sides commit.
              </p>
            </div>
          </div>

          {/* Seller profile card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-bold text-slate-900">Seller Profile</h3>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-50 text-lg font-black text-emerald-700">
                {(seller?.displayName ?? 'S').charAt(0)}
              </div>
              <div>
                <Link
                  href={`/profiles/${seller?.id}`}
                  className="font-bold text-slate-950 transition-colors hover:text-emerald-600"
                >
                  {seller?.displayName}
                </Link>
                <p className="text-xs text-slate-500">{seller?.roleLabel}</p>
                <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                  <MapPin className="h-3 w-3" />
                  {seller?.location}
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              {[
                { label: 'Reputation', value: `${seller?.sellerScore ?? 0}/100`, icon: ShieldCheck, color: 'text-emerald-700' },
                { label: 'Completed', value: `${seller?.sellerCompletedCount ?? 0} deals`, icon: Handshake, color: 'text-slate-900' },
                { label: 'Volume', value: `Rp ${((seller?.verifiedVolumeIdr ?? 0) / 1_000_000).toFixed(0)}M`, icon: BadgeCheck, color: 'text-slate-900' },
                { label: 'Proof Mode', value: seller?.proofVisibility === 'public' ? 'Public' : 'Private', icon: FileText, color: 'text-slate-900' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <Icon className="h-3 w-3" />
                    {label}
                  </div>
                  <div className={`mt-1.5 text-sm font-bold ${color}`}>{value}</div>
                </div>
              ))}
            </div>

            <Link
              href={`/profiles/${seller?.id}`}
              className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              View Full Profile
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
