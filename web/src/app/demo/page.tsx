'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  FileText,
  Flag,
  Layers,
  MapPin,
  Play,
  RefreshCcw,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { DemoResetController } from '@/lib/demo/reset-controller';

const presentationRoute = [
  {
    step: '01',
    title: 'Frame the trust problem',
    description:
      'Start on the landing page and explain why agricultural trade needs more than listings and chat screenshots.',
    color: 'emerald',
  },
  {
    step: '02',
    title: 'Prove discovery is real',
    description:
      'Open the marketplace, choose the chili listing, and show that counterparties can inspect credibility before they commit.',
    color: 'emerald',
  },
  {
    step: '03',
    title: 'Show negotiation before money',
    description:
      'Use Submit Offer to explain that negotiation becomes part of the evidence trail before the protected room opens.',
    color: 'emerald',
  },
  {
    step: '04',
    title: 'Activate the room together',
    description:
      'Switch roles and show that Open Deal Room is mutual commitment, not a one-sided shortcut into escrow.',
    color: 'amber',
  },
  {
    step: '05',
    title: 'Walk through funding and lock',
    description:
      'Show the buyer and seller obligations, the dual-rail story, and how the lock becomes part of the Stellar-backed trail.',
    color: 'amber',
  },
  {
    step: '06',
    title: 'Close with proof and reputation',
    description:
      'Finish with delivery evidence, settlement, and the reputation update that future counterparties can inspect.',
    color: 'blue',
  },
];

const talkTrackAnchors = [
  'Marketplace discovery alone does not solve payment trust.',
  'Negotiation is recorded before either side is asked to fund anything.',
  'The protected room only opens after both sides explicitly commit.',
  'Local bank and crypto wallet rails converge on the same trust layer.',
  'Reputation grows from verified outcomes, not empty review text.',
];

const honestyBoundaries = [
  { text: 'Local-bank funding remains simulated in this MVP.', icon: Layers },
  { text: 'Stellar is used as a trust layer and proof surface, not as a user-hostile crypto interface.', icon: ShieldCheck },
  { text: 'Dispute judgment is not fully automated; the product preserves evidence and chronology for review.', icon: FileText },
];

const quickJumpTargets = [
  { label: 'Landing Page', href: '/', icon: Flag },
  { label: 'Marketplace (Buy)', href: '/marketplace', icon: MapPin },
  { label: 'Chili Listing Detail', href: '/marketplace/listing-cabai-001', icon: BadgeCheck },
  { label: 'Notifications', href: '/notifications', icon: CheckCircle2 },
  { label: 'Negotiation Thread', href: '/offers/offer-demo-cabai-001', icon: FileText },
  { label: 'Active Deal Room', href: '/deals/demo-cabai-001', icon: ShieldCheck },
  { label: 'Seller Profile', href: '/profiles/seller-probolinggo-cabai', icon: Wallet },
];

const stepColorMap: Record<string, string> = {
  emerald: 'bg-emerald-600 text-white',
  amber: 'bg-amber-500 text-white',
  blue: 'bg-blue-600 text-white',
};

export default function DemoPage() {
  const router = useRouter();
  const [, forceRender] = useState(0);

  const [controller] = useState(
    () =>
      new DemoResetController(() => {
        forceRender((prev) => prev + 1);
      }),
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 lg:px-8">

      {/* ── HEADER ── */}
      <div className="mb-10 grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_340px]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-800">
            <ShieldCheck className="h-4 w-4" />
            Guided founder demo corridor
          </div>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-950 lg:text-5xl">
            Run the Settleway story from trade discovery to verified reputation.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            This is the operator cockpit for the hackathon presentation. It keeps the narrative
            disciplined: show the trade problem, show negotiation before money, show mutual
            commitment, show protected settlement, then close with reputation.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            {[
              { icon: FileText, label: 'Recorded negotiation first' },
              { icon: Wallet, label: 'Two user-facing rails' },
              { icon: BadgeCheck, label: 'Stellar-backed trust references' },
            ].map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm"
              >
                <Icon className="h-4 w-4 text-emerald-600" />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Demo Controls Card */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 text-sm font-bold text-slate-900">Demo Controls</div>

          <Button
            onClick={() => controller.handleReset()}
            disabled={controller.loading}
            className="w-full justify-between rounded-2xl"
            variant="secondary"
            aria-label="Reset Demo State"
          >
            Reset Demo State
            <RefreshCcw
              className={`h-4 w-4 ${controller.loading ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
          </Button>

          {controller.status === 'success' && (
            <div className="mt-3 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Demo state reset successfully.
            </div>
          )}

          {controller.status === 'error' && (
            <div className="mt-3 flex flex-col gap-1 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
              <div className="flex items-center gap-2 font-semibold">
                <AlertCircle className="h-4 w-4" />
                Reset failed
              </div>
              <div className="text-xs text-red-600">{controller.errorMessage}</div>
            </div>
          )}

          <div className="mt-5 border-t border-slate-100 pt-5">
            <div className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Quick Jumps</div>
            <div className="space-y-1.5">
              {quickJumpTargets.map((target) => {
                const Icon = target.icon;
                return (
                  <button
                    key={target.href}
                    type="button"
                    onClick={() => router.push(target.href)}
                    className="flex w-full items-center justify-between rounded-xl border border-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700 transition-all hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className="h-3.5 w-3.5 text-emerald-600" />
                      {target.label}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-[0_8px_20px_rgba(16,185,129,0.25)] transition-all hover:bg-emerald-700 hover:-translate-y-0.5"
            >
              <Play className="h-4 w-4" />
              Start From Landing Page
            </button>
          </div>
        </div>
      </div>

      {/* ── INFO CARDS ── */}
      <div className="mb-8 grid gap-5 md:grid-cols-3">
        {/* Scenario */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Scenario</div>
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-semibold text-slate-900">Commodity: </span>
              <span className="text-slate-600">Red chili / bird&apos;s eye chili</span>
            </div>
            <div>
              <span className="font-semibold text-slate-900">Seller: </span>
              <span className="text-slate-600">Probolinggo Chili Supplier</span>
            </div>
            <div>
              <span className="font-semibold text-slate-900">Buyer: </span>
              <span className="text-slate-600">Surabaya Restaurant Group</span>
            </div>
            <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2">
              <span className="font-bold text-emerald-900">IDR 20,000,000 </span>
              <span className="text-emerald-700 text-xs">deal value</span>
            </div>
          </div>
        </div>

        {/* What It Proves */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">MVP Proves</div>
          <ul className="space-y-3">
            {[
              'Product does not jump from listing to escrow.',
              'Negotiation and mutual commitment happen before deposits.',
              'Settlement references and reputation belong to one trust story.',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-slate-600">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Honesty Boundaries */}
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
          <div className="mb-3 text-xs font-bold uppercase tracking-wider text-amber-700">Honesty Boundaries</div>
          <ul className="space-y-3">
            {honestyBoundaries.map(({ text, icon: Icon }) => (
              <li key={text} className="flex items-start gap-2.5 text-sm text-amber-800">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                {text}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── PRESENTATION ROUTE ── */}
      <div className="mb-8 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 text-sm font-bold text-slate-900">Presentation Route</div>
          <div className="space-y-4">
            {presentationRoute.map((step) => (
              <div key={step.step} className="flex items-start gap-4">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-black ${stepColorMap[step.color]}`}
                >
                  {step.step}
                </div>
                <div className="border-b border-slate-100 pb-4 last:border-b-0 last:pb-0">
                  <div className="text-sm font-bold text-slate-900">{step.title}</div>
                  <p className="mt-1 text-sm leading-6 text-slate-500">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          {/* Talk Track */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 text-sm font-bold text-slate-900">Talk Track Anchors</div>
            <ul className="space-y-3">
              {talkTrackAnchors.map((anchor) => (
                <li key={anchor} className="flex items-start gap-3 text-sm text-slate-600">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  {anchor}
                </li>
              ))}
            </ul>
          </div>

          {/* Trust Checkpoints */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 text-sm font-bold text-slate-900">Trust Checkpoints</div>
            <div className="space-y-3 text-sm text-slate-600">
              <p>Trust begins before money through recorded negotiation.</p>
              <p>The protected room opens only after both parties commit.</p>
              <p>Stellar stays visible as proof, not as interface complexity.</p>
              <p>Reputation changes because outcomes are recorded, not because someone typed a review.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── CLOSING LINE ── */}
      <div className="overflow-hidden rounded-3xl bg-slate-950 p-8 text-white">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl" />
        <div className="relative">
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">Closing Line</div>
          <blockquote className="mt-3 text-lg font-medium italic leading-8 text-slate-200">
            &quot;Settleway helps real commodity buyers and sellers move from discovery to settlement
            with negotiation, escrow, proof, and reputation that can actually be verified.&quot;
          </blockquote>
        </div>
      </div>
    </div>
  );
}
