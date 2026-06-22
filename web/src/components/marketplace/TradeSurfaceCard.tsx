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
import { Card, CardContent } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

type SurfaceAudience = 'buy' | 'sell';
type BadgeTone = 'green' | 'blue' | 'emerald' | 'violet';

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

const badgeToneClasses: Record<BadgeTone, string> = {
  green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  blue: 'border-blue-200 bg-blue-50 text-blue-700',
  emerald: 'border-teal-200 bg-teal-50 text-teal-700',
  violet: 'border-violet-200 bg-violet-50 text-violet-700',
};

function formatIdr(value: number): string {
  return `Rp ${value.toLocaleString('id-ID')}`;
}

function getCommodityVisualTheme(commodity: string) {
  if (commodity.toLowerCase().includes('chili')) {
    return {
      eyebrow: 'Fresh harvest',
      backgroundImage: [
        'radial-gradient(circle at 18% 24%, rgba(255,255,255,0.18) 0, rgba(255,255,255,0) 24%)',
        'radial-gradient(circle at 76% 18%, rgba(253,224,71,0.20) 0, rgba(253,224,71,0) 20%)',
        'linear-gradient(135deg, rgba(69,10,10,0.96) 0%, rgba(185,28,28,0.96) 42%, rgba(249,115,22,0.88) 100%)',
      ].join(','),
      overlay:
        'repeating-linear-gradient(126deg, rgba(255,255,255,0.16) 0 10px, rgba(255,255,255,0) 10px 36px)',
      accent: 'from-red-950/70 via-red-800/0 to-transparent',
    };
  }

  if (commodity.toLowerCase().includes('coffee')) {
    return {
      eyebrow: 'Semi-washed lot',
      backgroundImage: [
        'radial-gradient(circle at 24% 28%, rgba(255,255,255,0.16) 0, rgba(255,255,255,0) 20%)',
        'radial-gradient(circle at 74% 32%, rgba(253,224,71,0.14) 0, rgba(253,224,71,0) 18%)',
        'linear-gradient(135deg, rgba(47,62,30,0.96) 0%, rgba(101,163,13,0.90) 48%, rgba(190,242,100,0.72) 100%)',
      ].join(','),
      overlay:
        'radial-gradient(circle at 12px 14px, rgba(39,52,25,0.42) 0 6px, rgba(255,255,255,0) 7px), radial-gradient(circle at 38px 34px, rgba(39,52,25,0.28) 0 5px, rgba(255,255,255,0) 6px)',
      accent: 'from-lime-950/70 via-lime-800/0 to-transparent',
    };
  }

  return {
    eyebrow: 'Warehouse ready',
    backgroundImage: [
      'radial-gradient(circle at 20% 22%, rgba(255,255,255,0.28) 0, rgba(255,255,255,0) 24%)',
      'radial-gradient(circle at 82% 26%, rgba(254,240,138,0.18) 0, rgba(254,240,138,0) 20%)',
      'linear-gradient(135deg, rgba(120,53,15,0.92) 0%, rgba(245,158,11,0.78) 50%, rgba(254,249,195,0.92) 100%)',
    ].join(','),
    overlay:
      'repeating-linear-gradient(146deg, rgba(255,255,255,0.16) 0 8px, rgba(255,255,255,0) 8px 28px)',
    accent: 'from-amber-950/70 via-amber-800/0 to-transparent',
  };
}

function MetricRow({
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
      <Icon className="mt-0.5 h-5 w-5 text-slate-400" />
      <div>
        <div className="text-sm text-slate-500">{label}</div>
        <div className="text-[1.35rem] font-semibold leading-8 text-slate-950">{value}</div>
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
    <div className="flex items-center gap-2.5 text-sm text-slate-600">
      <Icon className="h-[18px] w-[18px] text-emerald-600" />
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
  const theme = getCommodityVisualTheme(commodity);
  const counterpartyIcon = audience === 'buy' ? Store : UserRound;
  const CounterpartyIcon = counterpartyIcon;

  return (
    <Card className="overflow-hidden rounded-[28px] border-slate-200 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <CardContent className="p-6">
        <div className="mb-5">
          <span
            className={cn(
              'inline-flex rounded-full border px-4 py-1 text-sm font-semibold',
              badgeToneClasses[badgeTone],
            )}
          >
            {badgeLabel}
          </span>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(240px,0.72fr)]">
          <div>
            <div
              className="relative aspect-[16/9] overflow-hidden rounded-[24px] border border-white/60"
              style={{ backgroundImage: theme.backgroundImage }}
            >
              <div
                className="absolute inset-0 opacity-70"
                style={{
                  backgroundImage: theme.overlay,
                  backgroundSize: commodity.toLowerCase().includes('coffee') ? '56px 56px' : '100% 100%',
                }}
              />
              <div className={cn('absolute inset-0 bg-gradient-to-tr', theme.accent)} />
              <div className="absolute left-5 top-5 rounded-full bg-white/18 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white backdrop-blur-sm">
                {theme.eyebrow}
              </div>
            </div>

            <div className="mt-5">
              <h2 className="text-[2rem] font-semibold leading-tight text-slate-950">{commodity}</h2>
              <p className="mt-2 text-xl text-slate-500">{subtitle}</p>
            </div>
          </div>

          <div className="space-y-6 pt-1">
            <MetricRow icon={MapPin} label={locationLabel} value={locationValue} />
            <MetricRow icon={Scale} label="Volume" value={volumeValue} />
            <MetricRow
              icon={Tag}
              label="Price"
              value={`${formatIdr(pricePerKgIdr)} /kg`}
            />
            <MetricRow
              icon={Tag}
              label="Est. Value"
              value={formatIdr(estimatedValueIdr)}
            />
          </div>
        </div>

        <div className="mt-6 grid gap-4 border-y border-slate-200 py-4 lg:grid-cols-3">
          <TrustItem icon={ShieldCheck} label={`Reputation ${trustScore}/100`} />
          <TrustItem icon={BadgeCheck} label={verificationLabel} />
          <TrustItem icon={Handshake} label={activityLabel} />
        </div>

        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              <CounterpartyIcon className="h-5 w-5" />
            </div>
            <span className="text-[1.15rem] font-medium text-emerald-700">{counterpartyName}</span>
          </div>

          <Link
            href={detailHref}
            className="inline-flex h-12 min-w-[164px] items-center justify-center rounded-xl bg-emerald-600 px-6 text-base font-semibold text-white transition-colors hover:bg-emerald-700 sm:ml-auto"
          >
            {detailLabel}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
