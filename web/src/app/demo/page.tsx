'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  FileText,
  Play,
  RefreshCcw,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DemoResetController } from '@/lib/demo/reset-controller';

const presentationRoute = [
  {
    title: '1. Frame the trust problem',
    description:
      'Start on the landing page and explain why agricultural trade needs more than listings and chat screenshots.',
  },
  {
    title: '2. Prove discovery is real',
    description:
      'Open the marketplace, choose the chili listing, and show that counterparties can inspect credibility before they commit.',
  },
  {
    title: '3. Show negotiation before money',
    description:
      'Use Submit Offer to explain that negotiation becomes part of the evidence trail before the protected room opens.',
  },
  {
    title: '4. Activate the room together',
    description:
      'Switch roles and show that Open Deal Room is mutual commitment, not a one-sided shortcut into escrow.',
  },
  {
    title: '5. Walk through funding and lock',
    description:
      'Show the buyer and seller obligations, the dual-rail story, and how the lock becomes part of the Stellar-backed trail.',
  },
  {
    title: '6. Close with proof and reputation',
    description:
      'Finish with delivery evidence, settlement, and the reputation update that future counterparties can inspect.',
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
  'Local-bank funding remains simulated in this MVP.',
  'Stellar is used as a trust layer and proof surface, not as a user-hostile crypto interface.',
  'Dispute judgment is not fully automated; the product preserves evidence and chronology for review.',
];

const quickJumpTargets = [
  { label: 'Open Landing Page', href: '/' },
  { label: 'Open Marketplace', href: '/marketplace' },
  { label: 'Open Chili Listing', href: '/marketplace/listing-cabai-001' },
  { label: 'Open Notifications Inbox', href: '/notifications' },
  { label: 'Open Negotiation Thread', href: '/offers/offer-demo-cabai-001' },
  { label: 'Open Active Deal Room', href: '/deals/demo-cabai-001' },
  { label: 'Open Seller Profile', href: '/profiles/seller-probolinggo-cabai' },
];

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
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_360px]">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800">
            <ShieldCheck className="h-4 w-4" />
            Guided founder demo corridor
          </div>
          <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
            Run the Settleway story from trade discovery to verified reputation.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
            This dashboard is the operator cockpit for the hackathon presentation. It keeps the
            narrative disciplined: show the trade problem, show negotiation before money, show
            mutual commitment, show protected settlement, then close with reputation.
          </p>

          <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-700">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1">
              <FileText className="h-4 w-4 text-emerald-600" />
              Recorded negotiation first
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1">
              <Wallet className="h-4 w-4 text-emerald-600" />
              Two user-facing rails
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1">
              <BadgeCheck className="h-4 w-4 text-emerald-600" />
              Stellar-backed trust references
            </span>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Demo Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={() => controller.handleReset()}
              disabled={controller.loading}
              className="w-full justify-between"
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
              <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Demo state reset successfully.
              </div>
            )}

            {controller.status === 'error' && (
              <div className="flex flex-col gap-1 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <div className="flex items-center gap-2 font-medium">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  Reset failed
                </div>
                <div className="text-xs text-red-600">{controller.errorMessage}</div>
              </div>
            )}

            <div className="border-t border-slate-200 pt-4">
              <div className="mb-3 text-sm font-medium text-slate-900">Quick Demo Jumps</div>
              <p className="mb-3 text-xs leading-5 text-slate-500">
                Use these in corridor order when you need to skip ahead without breaking the story.
              </p>
              <div className="space-y-2">
                {quickJumpTargets.map((target) => (
                  <Button
                    key={target.href}
                    onClick={() => router.push(target.href)}
                    variant="ghost"
                    className="w-full justify-between border border-slate-200"
                  >
                    {target.label}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <Button onClick={() => router.push('/')} className="w-full justify-between">
                Start From Landing Page
                <Play className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Scenario Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            <p>
              <strong className="text-slate-900">Commodity:</strong> Red chili / bird&apos;s eye chili
            </p>
            <p>
              <strong className="text-slate-900">Seller:</strong> Probolinggo Chili Supplier
            </p>
            <p>
              <strong className="text-slate-900">Buyer:</strong> Surabaya Restaurant Group
            </p>
            <p>
              <strong className="text-slate-900">Deal value:</strong> IDR 20,000,000
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">What the MVP Proves</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            <p>The product does not jump from listing to escrow.</p>
            <p>Negotiation and mutual commitment happen before deposits.</p>
            <p>Settlement references and reputation belong to one trust story.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Honesty Boundaries</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            {honestyBoundaries.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Presentation Route</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4 text-sm text-slate-600">
              {presentationRoute.map((step) => (
                <li key={step.title} className="border-b border-slate-100 pb-4 last:border-b-0 last:pb-0">
                  <div className="font-semibold text-slate-900">{step.title}</div>
                  <p className="mt-1 leading-6">{step.description}</p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Talk Track Anchors</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-slate-600">
                {talkTrackAnchors.map((anchor) => (
                  <li key={anchor} className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-emerald-600" />
                    <span>{anchor}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Trust Checkpoints</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <p>Trust begins before money through recorded negotiation.</p>
              <p>The protected room opens only after both parties commit.</p>
              <p>Stellar stays visible as proof, not as interface complexity.</p>
              <p>Reputation changes because outcomes are recorded, not because someone typed a review.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg">Closing Line</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm italic leading-6 text-slate-700">
            &quot;Settleway helps real commodity buyers and sellers move from discovery to
            settlement with negotiation, escrow, proof, and reputation that can actually be
            verified.&quot;
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
