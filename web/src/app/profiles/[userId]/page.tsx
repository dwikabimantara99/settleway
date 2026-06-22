import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Handshake,
  MapPin,
  Package,
  ShieldCheck,
  Star,
  TrendingUp,
  UserCircle2,
} from 'lucide-react';
import { notFound } from 'next/navigation';
import { ConnectExternalWalletButton } from '@/components/profile/ConnectExternalWalletButton';
import { CopyWalletAddressButton } from '@/components/profile/CopyWalletAddressButton';
import { EditProfileButton } from '@/components/profile/EditProfileButton';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { getCurrentUser } from '@/lib/auth/server';
import type { DbBuyerRequest, DbListing } from '@/lib/db/types';
import { rebuildReputationAggregate } from '@/lib/reputation/engine';
import { repository } from '@/lib/repositories';
import { TESTNET_DEMO_IDENTITIES } from '@/lib/stellar/testnet-demo-identities';

function formatIdr(value: number | null | undefined): string {
  return `Rp ${(value ?? 0).toLocaleString('id-ID')}`;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function formatListingStatus(status: DbListing['status']): string {
  return status === 'ready_stock' ? 'Ready Stock' : 'Pre-Harvest';
}

function formatRequestStatus(status: DbBuyerRequest['status']): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function buildChartPath(values: number[], width: number, height: number, maxValue: number): string {
  return values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width;
      const y = height - (value / maxValue) * height;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

function MetricCard({
  icon,
  title,
  value,
  detail,
  href,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  detail: string;
  href?: string;
}) {
  const card = (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="flex items-center gap-5 p-6">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-100">
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <div className="mt-1 text-2xl font-bold text-slate-950">{value}</div>
          <p className="mt-1 text-sm text-slate-500">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );

  if (!href) return card;

  return (
    <Link
      href={href}
      aria-label={`Open ${title}`}
      className="rounded-2xl transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
    >
      {card}
    </Link>
  );
}

function ActivityListingCard({ listing }: { listing: DbListing }) {
  return (
    <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[8rem_1fr]">
      <div className="flex min-h-32 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-50 via-white to-rose-50 text-3xl font-bold text-emerald-700">
        {getInitials(listing.commodity)}
      </div>
      <div className="min-w-0">
        <Badge className="border-emerald-200 bg-emerald-50 text-emerald-800">
          {formatListingStatus(listing.status)}
        </Badge>
        <h3 className="mt-3 text-lg font-bold text-slate-950">{listing.commodity}</h3>
        <p className="mt-1 text-sm text-slate-500">{listing.variety}</p>
        <div className="mt-3 space-y-1.5 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-slate-400" />
            {listing.location}
          </div>
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-slate-400" />
            {(listing.estimated_volume_kg ?? 0).toLocaleString('id-ID')} kg available
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-slate-100 pt-4">
          <div>
            <div className="text-xl font-bold text-slate-950">
              {formatIdr(listing.price_per_kg_idr)}
              <span className="text-sm font-medium text-slate-500"> /kg</span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Est. value: {formatIdr(listing.estimated_value_idr)}
            </p>
          </div>
          <Link
            href="/marketplace"
            className="inline-flex items-center rounded-lg border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
}

function ActivityRequestCard({ request }: { request: DbBuyerRequest }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <Badge className="border-blue-200 bg-blue-50 text-blue-700">
        {formatRequestStatus(request.status)}
      </Badge>
      <h3 className="mt-3 text-lg font-bold text-slate-950">{request.commodity}</h3>
      <p className="mt-1 text-sm text-slate-500">Buyer request</p>
      <div className="mt-4 space-y-1.5 text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-slate-400" />
          {request.delivery_location}
        </div>
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-slate-400" />
          {(request.required_volume_kg ?? 0).toLocaleString('id-ID')} kg requested
        </div>
      </div>
      <div className="mt-4 border-t border-slate-100 pt-4">
        <div className="text-xl font-bold text-slate-950">
          {formatIdr(request.target_price_per_kg_idr)}
          <span className="text-sm font-medium text-slate-500"> /kg</span>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Est. total: {formatIdr((request.required_volume_kg ?? 0) * (request.target_price_per_kg_idr ?? 0))}
        </p>
      </div>
    </div>
  );
}

export default async function ProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const resolvedParams = await params;
  const profile = await repository.getProfile(resolvedParams.userId);
  if (!profile) return notFound();

  const currentUser = await getCurrentUser();
  const canEditProfile = currentUser?.id === profile.id;
  const [reputationEvents, listings, buyerRequests] = await Promise.all([
    repository.getParticipantReputationEvents(resolvedParams.userId),
    repository.getListings(),
    repository.getBuyerRequests(),
  ]);

  const agg = rebuildReputationAggregate(reputationEvents);
  const sellerListings = listings.filter((listing) => listing.seller_id === profile.id);
  const userBuyerRequests = buyerRequests.filter((request) => request.buyer_id === profile.id);
  const finalVerifiedVolume = profile.verified_volume_idr + agg.verified_volume_idr;
  const finalSellerScore = profile.seller_score + agg.seller_score;
  const finalBuyerScore = profile.buyer_score + agg.buyer_score;
  const finalSellerCompleted = profile.seller_completed_count + agg.seller_completed_count;
  const finalBuyerCompleted = profile.buyer_completed_count + agg.buyer_completed_count;
  const totalCompleted = finalSellerCompleted + finalBuyerCompleted;
  const reputationScore = Math.max(finalSellerScore, finalBuyerScore);
  const sellerShare = Math.max(finalSellerCompleted, profile.user_type === 'seller' ? 1 : 0);
  const buyerShare = Math.max(finalBuyerCompleted, profile.user_type === 'buyer' ? 1 : 0);
  const shareTotal = sellerShare + buyerShare || 1;
  const sellerMonthly = [0.18, 0.36, 0.55, 0.42, 0.62, 0.52].map((ratio) =>
    Math.round((finalVerifiedVolume * (sellerShare / shareTotal) * ratio) / 6),
  );
  const buyerMonthly = [0.1, 0.24, 0.38, 0.28, 0.44, 0.5].map((ratio) =>
    Math.round((finalVerifiedVolume * (buyerShare / shareTotal) * ratio) / 6),
  );
  const chartMax = Math.max(...sellerMonthly, ...buyerMonthly, 1);
  const sellerPath = buildChartPath(sellerMonthly, 680, 180, chartMax);
  const buyerPath = buildChartPath(buyerMonthly, 680, 180, chartMax);
  const managedWallet =
    profile.user_type === 'buyer'
      ? TESTNET_DEMO_IDENTITIES.buyer
      : profile.user_type === 'operator'
        ? TESTNET_DEMO_IDENTITIES.platform
        : TESTNET_DEMO_IDENTITIES.seller;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="relative grid gap-8 p-8 md:grid-cols-[13rem_1fr] md:p-10">
          <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-gradient-to-l from-emerald-50 via-emerald-50/60 to-transparent md:block" />
          <div className="relative">
            <div className="flex h-40 w-40 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-emerald-100 to-slate-100 text-5xl font-bold text-emerald-700 shadow-xl">
              {getInitials(profile.display_name) || <UserCircle2 className="h-20 w-20" />}
            </div>
            <div className="mt-5 inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
              <CalendarDays className="h-5 w-5 text-slate-400" />
              <span>
                Member since
                <span className="block font-semibold text-slate-900">
                  {new Date(profile.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </span>
            </div>
          </div>

          <div className="relative">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-bold text-slate-950 md:text-4xl">
                    {profile.display_name}
                  </h1>
                  <ShieldCheck className="h-6 w-6 fill-emerald-600 text-white" />
                </div>
                <p className="mt-2 text-lg text-slate-600">{profile.role_label}</p>
                <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                  <MapPin className="h-4 w-4" />
                  {profile.location}
                </div>
                <div className="mt-5 max-w-xl rounded-xl border border-slate-200 bg-white/90 p-3 shadow-sm">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                    Managed Profile Wallet
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700">
                      Testnet
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 rounded-lg bg-slate-50 pl-3">
                    <span className="min-w-0 flex-1 truncate font-mono text-xs text-slate-700 sm:text-sm">
                      {managedWallet.public_address}
                    </span>
                    <CopyWalletAddressButton address={managedWallet.public_address} />
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Managed by Settleway for protected Testnet transaction activity.
                  </p>
                </div>
                <div className="max-w-xl">
                  <ConnectExternalWalletButton
                    profileId={profile.id}
                    initialAddress={profile.connected_wallet_address}
                    initialProvider={profile.connected_wallet_provider}
                    initialNetwork={profile.connected_wallet_network}
                    canConnect={canEditProfile}
                  />
                </div>
                <p className="mt-5 max-w-2xl text-sm leading-6 text-slate-600">
                  Settleway turns this profile into a transaction passport: counterparties can see
                  completed deals, protected volume, and funding discipline before they commit to
                  a protected Deal Room.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Badge className="border-emerald-200 bg-emerald-50 text-emerald-800">
                    <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                    Verified Profile
                  </Badge>
                  <Badge className="border-blue-200 bg-blue-50 text-blue-700">
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                    Outcome-backed reputation
                  </Badge>
                </div>
              </div>
              {canEditProfile ? (
                <EditProfileButton
                  profileId={profile.id}
                  initialDisplayName={profile.display_name}
                  initialRoleLabel={profile.role_label}
                  initialLocation={profile.location}
                />
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 md:grid-cols-3">
        <MetricCard
          icon={<TrendingUp className="h-7 w-7" />}
          title="Total Volume"
          value={formatIdr(finalVerifiedVolume)}
          detail="Buyer + seller"
        />
        <MetricCard
          icon={<Handshake className="h-7 w-7" />}
          title="Completed Deals"
          value={`${totalCompleted}`}
          detail="Verified outcomes"
        />
        <MetricCard
          icon={<Star className="h-7 w-7" />}
          title="Reputation Score"
          value={`${reputationScore} / 100`}
          detail="Outcome-backed"
          href={`/profiles/${profile.id}/reputation`}
        />
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-950">Transaction Volume</h2>
            <p className="mt-1 text-sm text-slate-500">
              Overview of verified activity across buyer and seller roles.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="inline-flex items-center gap-2 text-slate-600">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
              Seller {formatIdr(Math.round(finalVerifiedVolume * (sellerShare / shareTotal)))}
            </span>
            <span className="inline-flex items-center gap-2 text-slate-600">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
              Buyer {formatIdr(Math.round(finalVerifiedVolume * (buyerShare / shareTotal)))}
            </span>
          </div>
        </div>
        <div className="mt-6 overflow-x-auto">
          <svg
            viewBox="0 0 760 250"
            className="h-72 min-w-[760px] w-full"
            role="img"
            aria-label="Transaction volume chart"
          >
            {[0, 1, 2, 3].map((line) => (
              <line
                key={line}
                x1="60"
                x2="740"
                y1={40 + line * 52}
                y2={40 + line * 52}
                stroke="#e2e8f0"
                strokeDasharray="4 4"
              />
            ))}
            <path
              d={`M 60 220 L 740 220`}
              stroke="#cbd5e1"
              strokeWidth="1"
              fill="none"
            />
            <g transform="translate(60 35)">
              <path d={sellerPath} fill="none" stroke="#059669" strokeWidth="3" />
              <path d={buyerPath} fill="none" stroke="#2563eb" strokeWidth="3" />
              {sellerMonthly.map((value, index) => {
                const x = (index / Math.max(sellerMonthly.length - 1, 1)) * 680;
                const y = 180 - (value / chartMax) * 180;
                return <circle key={`seller-${index}`} cx={x} cy={y} r="5" fill="#059669" />;
              })}
              {buyerMonthly.map((value, index) => {
                const x = (index / Math.max(buyerMonthly.length - 1, 1)) * 680;
                const y = 180 - (value / chartMax) * 180;
                return <circle key={`buyer-${index}`} cx={x} cy={y} r="5" fill="#2563eb" />;
              })}
            </g>
            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((month, index) => (
              <text
                key={month}
                x={60 + index * 136}
                y="242"
                textAnchor="middle"
                className="fill-slate-500 text-sm"
              >
                {month}
              </text>
            ))}
            <text x="5" y="42" className="fill-slate-500 text-sm">
              {formatIdr(chartMax)}
            </text>
            <text x="5" y="222" className="fill-slate-500 text-sm">
              Rp0
            </text>
          </svg>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mx-auto mb-6 grid max-w-xl grid-cols-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold shadow-sm">
          <div className="rounded-l-xl border-r border-slate-200 bg-emerald-50 px-5 py-3 text-center text-emerald-700">
            Sell (My Listings)
          </div>
          <div className="rounded-r-xl px-5 py-3 text-center text-slate-600">
            Buy (My Requests)
          </div>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          {sellerListings.map((listing) => (
            <ActivityListingCard key={listing.id} listing={listing} />
          ))}
          {userBuyerRequests.map((request) => (
            <ActivityRequestCard key={request.id} request={request} />
          ))}
        </div>
      </section>
    </div>
  );
}
