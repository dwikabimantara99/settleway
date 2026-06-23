import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  Handshake,
  MapPin,
  Scale,
  ShieldCheck,
  Store,
  Tag,
  UserRound,
} from 'lucide-react';
import { CommodityImage } from './CommodityImage';
import { StatusBadge } from '@/components/field-ledger/primitives';

type SurfaceAudience = 'buy' | 'sell';
type BadgeTone = 'success' | 'info' | 'warning';

interface TradeSurfaceCardProps {
  audience: SurfaceAudience;
  commodity: string;
  subtitle: string;
  badgeLabel: string;
  badgeTone: BadgeTone;
  locationLabel: string;
  locationValue: string;
  volumeValue: string;
  pricePerKgIdr: number;
  estimatedValueIdr: number;
  trustScore: number;
  verificationLabel: string;
  activityLabel: string;
  counterpartyName: string;
  detailHref: string;
  detailLabel: string;
  featured?: boolean;
}

function formatIdr(value: number): string {
  return `Rp ${value.toLocaleString('id-ID')}`;
}

function TrustItem({
  icon: Icon,
  label,
}: {
  icon: typeof ShieldCheck;
  label: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 text-xs text-[var(--text-secondary)]">
      <Icon className="h-4 w-4 shrink-0 text-[var(--green-700)]" />
      <span>{label}</span>
    </div>
  );
}

export function TradeSurfaceCard({
  audience,
  commodity,
  subtitle,
  badgeLabel,
  badgeTone,
  locationValue,
  volumeValue,
  pricePerKgIdr,
  estimatedValueIdr,
  trustScore,
  verificationLabel,
  activityLabel,
  counterpartyName,
  detailHref,
  detailLabel,
  featured = false,
}: TradeSurfaceCardProps) {
  const CounterpartyIcon = audience === 'buy' ? Store : UserRound;

  if (featured) {
    return (
      <article className="aurora-feature-surface aurora-hover overflow-hidden">
        <div className="grid min-h-[31rem] lg:grid-cols-[1.15fr_0.85fr]">
          <div className="relative min-h-[19rem] overflow-hidden lg:min-h-full">
            <CommodityImage
              commodity={commodity}
              sizes="(min-width: 1280px) 760px, (min-width: 1024px) 58vw, 100vw"
              priority
              className="transition-transform duration-500 hover:scale-[1.025]"
            />
            <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[var(--navy-900)]/72 to-transparent" />
            <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4 text-white">
              <div>
                <div className="text-xs font-semibold uppercase text-white/75">Featured supply</div>
                <h2 className="mt-1 text-2xl font-semibold">{commodity}</h2>
              </div>
              <StatusBadge label={badgeLabel} tone={badgeTone} className="bg-white/90" />
            </div>
          </div>

          <div className="flex flex-col p-6 sm:p-8">
            <p className="text-sm text-[var(--text-secondary)]">{subtitle}</p>
            <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 text-[var(--azure-600)]" />
                <div>
                  <div className="text-xs text-[var(--text-muted)]">Origin</div>
                  <div className="mt-1 font-semibold text-[var(--navy-900)]">{locationValue}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Scale className="mt-0.5 h-5 w-5 text-[var(--azure-600)]" />
                <div>
                  <div className="text-xs text-[var(--text-muted)]">Available volume</div>
                  <div className="mt-1 font-semibold text-[var(--navy-900)]">{volumeValue}</div>
                </div>
              </div>
            </div>
            <div className="mt-7 border-y border-[var(--border-subtle)] py-5">
              <div className="text-xs text-[var(--text-muted)]">Price per kg</div>
              <div className="mt-1 text-3xl font-semibold financial-figures text-[var(--navy-900)]">
                {formatIdr(pricePerKgIdr)}
              </div>
              <div className="mt-2 text-sm text-[var(--text-secondary)]">
                Estimated value {formatIdr(estimatedValueIdr)}
              </div>
            </div>
            <div className="mt-5 grid gap-2">
              <TrustItem icon={ShieldCheck} label={`Reputation ${trustScore}/100`} />
              <TrustItem icon={BadgeCheck} label={verificationLabel} />
              <TrustItem icon={Handshake} label={activityLabel} />
            </div>
            <div className="mt-auto flex flex-col gap-4 pt-7 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--green-50)] text-[var(--green-700)]">
                  <CounterpartyIcon className="h-5 w-5" />
                </span>
                <span className="text-sm font-semibold text-[var(--green-700)]">{counterpartyName}</span>
              </div>
              <Link
                href={detailHref}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--green-700)] px-4 text-sm font-semibold text-white hover:bg-[var(--green-800)]"
              >
                {detailLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="aurora-surface aurora-hover overflow-hidden">
      <div className="grid sm:grid-cols-[13rem_minmax(0,1fr)]">
        <div className="relative min-h-52 overflow-hidden sm:min-h-full">
          <CommodityImage
            commodity={commodity}
            sizes="(min-width: 1280px) 260px, (min-width: 640px) 34vw, 100vw"
          />
        </div>
        <div className="flex min-w-0 flex-col p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <StatusBadge label={badgeLabel} tone={badgeTone} />
              <h2 className="mt-3 text-xl font-semibold text-[var(--navy-900)]">{commodity}</h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{subtitle}</p>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold financial-figures text-[var(--navy-900)]">
                {formatIdr(pricePerKgIdr)}
              </div>
              <div className="text-xs text-[var(--text-muted)]">per kg</div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
              <MapPin className="h-4 w-4 text-[var(--azure-600)]" />
              {locationValue}
            </div>
            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
              <Scale className="h-4 w-4 text-[var(--azure-600)]" />
              {volumeValue}
            </div>
            <div className="flex items-center gap-2 text-[var(--text-secondary)] sm:col-span-2">
              <Tag className="h-4 w-4 text-[var(--azure-600)]" />
              Estimated value {formatIdr(estimatedValueIdr)}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-[var(--border-subtle)] pt-4">
            <TrustItem icon={ShieldCheck} label={`${trustScore}/100 reputation`} />
            <TrustItem icon={BadgeCheck} label={verificationLabel} />
            <TrustItem icon={Handshake} label={activityLabel} />
          </div>

          <div className="mt-auto flex items-center justify-between gap-4 pt-5">
            <span className="truncate text-sm font-semibold text-[var(--green-700)]">
              {counterpartyName}
            </span>
            <Link
              href={detailHref}
              aria-label={`${detailLabel}: ${commodity}`}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--border-default)] text-[var(--navy-900)] hover:border-[var(--azure-300)] hover:bg-[var(--azure-50)]"
            >
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
