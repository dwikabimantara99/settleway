import Image from 'next/image';
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
import { StatusBadge } from '@/components/field-ledger/primitives';
import { Card, CardContent } from '@/components/ui/Card';

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
}

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

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[var(--navy-400)]" />
      <div className="min-w-0">
        <div className="text-xs font-medium text-[var(--text-muted)]">{label}</div>
        <div className="mt-0.5 text-base font-semibold text-[var(--navy-900)] financial-figures">
          {value}
        </div>
      </div>
    </div>
  );
}

function TrustItem({
  icon: Icon,
  label,
}: {
  icon: typeof ShieldCheck;
  label: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 text-sm text-[var(--text-secondary)]">
      <Icon className="h-4 w-4 shrink-0 text-[var(--green-700)]" />
      <span className="truncate">{label}</span>
    </div>
  );
}

export function TradeSurfaceCard({
  audience,
  commodity,
  subtitle,
  badgeLabel,
  badgeTone,
  locationLabel,
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
}: TradeSurfaceCardProps) {
  const CounterpartyIcon = audience === 'buy' ? Store : UserRound;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1.04fr)_minmax(260px,0.86fr)]">
          <div className="p-6">
            <StatusBadge label={badgeLabel} tone={badgeTone} />
            <div className="relative mt-4 aspect-[16/9] overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-subtle)]">
              <Image
                src={getCommodityImage(commodity)}
                alt={commodity}
                fill
                sizes="(min-width: 1280px) 520px, (min-width: 1024px) 45vw, 100vw"
                className="object-cover"
              />
            </div>
            <h2 className="mt-5 text-2xl font-semibold tracking-tight text-[var(--navy-900)]">
              {commodity}
            </h2>
            <p className="mt-1 text-base text-[var(--text-secondary)]">{subtitle}</p>
          </div>

          <div className="flex flex-col border-t border-[var(--border-subtle)] p-6 lg:border-l lg:border-t-0">
            <div className="grid gap-5">
              <Metric icon={MapPin} label={locationLabel} value={locationValue} />
              <Metric icon={Scale} label="Volume" value={volumeValue} />
              <Metric icon={Tag} label="Price" value={`${formatIdr(pricePerKgIdr)} /kg`} />
              <Metric icon={Tag} label="Estimated value" value={formatIdr(estimatedValueIdr)} />
            </div>

            <div className="mt-6 grid gap-3 border-y border-[var(--border-subtle)] py-4">
              <TrustItem icon={ShieldCheck} label={`Reputation ${trustScore}/100`} />
              <TrustItem icon={BadgeCheck} label={verificationLabel} />
              <TrustItem icon={Handshake} label={activityLabel} />
            </div>

            <div className="mt-5 flex flex-1 flex-col justify-end gap-4 sm:flex-row sm:items-end sm:justify-between lg:flex-col lg:items-stretch">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--green-50)] text-[var(--green-700)]">
                  <CounterpartyIcon className="h-5 w-5" />
                </div>
                <span className="font-medium text-[var(--green-700)]">{counterpartyName}</span>
              </div>
              <Link
                href={detailHref}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-[var(--green-700)] bg-[var(--green-700)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--green-800)]"
              >
                {detailLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
