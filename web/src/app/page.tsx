import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  CirclePlay,
  FileText,
  Landmark,
  Lock,
  ShieldCheck,
  Store,
  Users,
  Wallet,
  TrendingUp,
  Star,
} from 'lucide-react';

const trustHighlights = [
  {
    title: 'Protected Trade Flow',
    description: ['Escrow-backed and recorded', 'from intent to settlement.'],
    icon: ShieldCheck,
  },
  {
    title: 'Recorded & Verifiable',
    description: ['Every negotiation, milestone,', 'and outcome is verifiable.'],
    icon: FileText,
  },
  {
    title: 'Built on Trust',
    description: ['Reputation, transparency, and', 'real outcomes you can trust.'],
    icon: Users,
  },
];

const proofPoints = [
  {
    icon: Store,
    title: 'Real trade discovery',
    description:
      'Marketplace listings and buyer requests help serious commodity counterparties find each other before money moves.',
  },
  {
    icon: FileText,
    title: 'Recorded negotiation',
    description:
      'Offers and chat are preserved so the trade story exists before the escrow room ever opens.',
  },
  {
    icon: Lock,
    title: 'Mutual commitment gate',
    description:
      'The protected room opens only after both parties click Open Deal Room and accept the same seriousness.',
  },
  {
    icon: ShieldCheck,
    title: 'Verifiable outcome trail',
    description:
      'Lock, proof, refund, and settlement references support long-term reputation without making blockchain the main interface.',
  },
];

const painPoints = [
  {
    icon: TrendingUp,
    title: 'Buyers fear sending money first',
    description:
      'A good listing is not enough when quality, delivery timing, and counterparty discipline are still uncertain.',
  },
  {
    icon: Store,
    title: 'Sellers fear bad-faith cancellation',
    description:
      'Suppliers can reserve inventory, prepare logistics, and still get exposed to weak commitment from the buyer side.',
  },
  {
    icon: Star,
    title: 'Reputation is usually too shallow',
    description:
      'Most trade conversations disappear into chat apps, so future counterparties cannot inspect how previous deals actually ended.',
  },
];

const workflowSteps = [
  {
    step: '01',
    title: 'Discover',
    description:
      'A buyer or seller starts from marketplace supply or buyer demand, not from an instant escrow popup.',
  },
  {
    step: '02',
    title: 'Review trust',
    description:
      'Profiles, verified volume, and proof visibility help both sides decide whether the trade looks credible.',
  },
  {
    step: '03',
    title: 'Submit offer',
    description:
      'Negotiation begins in a recorded thread so the product keeps context before money logic starts.',
  },
  {
    step: '04',
    title: 'Open Deal Room',
    description:
      'Both sides must click Open Deal Room before deposits unlock the protected execution path.',
  },
  {
    step: '05',
    title: 'Fund and lock',
    description:
      'Buyer and seller fund their required obligations, then the escrow lock becomes part of the Stellar-backed trust trail.',
  },
  {
    step: '06',
    title: 'Prove, settle, and update reputation',
    description:
      'Evidence, delivery acceptance, refunds, or settlement outcomes feed a reputation system backed by verifiable transaction history.',
  },
];

const stellarNotes = [
  {
    icon: Wallet,
    title: 'Two user-facing rails',
    description:
      'Users can experience a local-bank-style flow or a crypto-wallet path while the protected trade logic still converges on one trust layer.',
  },
  {
    icon: BadgeCheck,
    title: 'Visible only when it matters',
    description:
      'Settleway surfaces Stellar as a proof layer through trust cues like Secured by Stellar Blockchain and View Transaction.',
  },
  {
    icon: Landmark,
    title: 'Reputation with evidence',
    description:
      'Transaction references, proof hashes, and room outcomes become a durable record that supports future credibility.',
  },
];

const stats = [
  { value: 'IDR 20M+', label: 'Per-deal protected value' },
  { value: '6-step', label: 'Trade corridor' },
  { value: 'Stellar', label: 'Blockchain trust layer' },
  { value: '100%', label: 'Outcome-backed reputation' },
];

export default function LandingPage() {
  return (
    <div className="bg-white overflow-hidden">

      {/* ── HERO ── */}
      <section id="home" className="hero-gradient relative">
        {/* Decorative orbs */}
        <div className="pointer-events-none absolute -top-24 right-0 h-96 w-96 rounded-full bg-emerald-100/60 blur-3xl" />
        <div className="pointer-events-none absolute top-32 -left-20 h-64 w-64 rounded-full bg-emerald-50 blur-3xl" />

        <div className="mx-auto flex max-w-7xl flex-col items-center px-6 pb-16 pt-14 text-center sm:pt-20 lg:px-8 lg:pb-24 lg:pt-24">
          {/* Badge */}
          <div className="animate-fade-in inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-semibold text-emerald-700 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Built on Stellar Blockchain · Hackathon MVP
          </div>

          {/* Headline */}
          <h1 className="animate-fade-in-up delay-75 mt-8 text-5xl font-extrabold leading-none tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
            Agricultural trade,{' '}
            <span className="text-gradient-emerald">protected</span>
            <br className="hidden sm:block" />
            from discovery to settlement.
          </h1>

          <p className="animate-fade-in-up delay-150 mt-6 max-w-3xl text-lg leading-8 text-slate-600 sm:text-xl">
            Settleway is a secure marketplace and settlement flow for agricultural commodity
            transactions — connecting buyers and sellers, securing intent, and proving outcomes.
          </p>

          {/* CTAs */}
          <div className="animate-fade-in-up delay-225 mt-10 flex w-full max-w-xl flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/marketplace"
              className="group inline-flex h-13 w-full items-center justify-center gap-3 rounded-2xl bg-emerald-600 px-8 text-base font-semibold text-white shadow-[0_12px_28px_rgba(16,185,129,0.30)] transition-all duration-200 hover:bg-emerald-700 hover:shadow-[0_16px_36px_rgba(16,185,129,0.38)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 sm:w-auto"
            >
              Explore Marketplace
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
            </Link>

            <Link
              href="/demo"
              className="inline-flex h-13 w-full items-center justify-center gap-3 rounded-2xl border-2 border-emerald-500/60 bg-white/80 px-8 text-base font-semibold text-emerald-700 backdrop-blur-sm transition-all duration-200 hover:border-emerald-500 hover:bg-emerald-50 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 sm:w-auto"
            >
              <CirclePlay className="h-5 w-5 fill-emerald-500 text-white" />
              Learn How It Works
            </Link>
          </div>

          {/* Stats bar */}
          <div className="animate-fade-in-up delay-300 mt-14 w-full max-w-4xl rounded-3xl border border-slate-200/80 bg-white/90 px-6 py-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-sm">
            <div className="grid grid-cols-2 divide-x divide-slate-200 lg:grid-cols-4">
              {stats.map(({ value, label }, i) => (
                <div key={label} className={`flex flex-col items-center px-6 py-3 ${i < 2 ? 'border-b border-slate-200 lg:border-b-0' : ''}`}>
                  <div className="text-2xl font-extrabold text-slate-950">{value}</div>
                  <div className="mt-1 text-center text-xs font-medium text-slate-500">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Trust highlights */}
          <div
            id="about"
            className="animate-fade-in-up delay-450 mt-10 w-full max-w-4xl rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-[0_16px_48px_rgba(15,23,42,0.06)] lg:px-8"
          >
            <div className="flex flex-col divide-y divide-slate-100 lg:flex-row lg:divide-x lg:divide-y-0">
              {trustHighlights.map(({ icon: Icon, title, description }) => (
                <div key={title} className="flex flex-1 items-start gap-4 py-5 text-left lg:px-7 lg:py-3">
                  <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-[0_6px_16px_rgba(16,185,129,0.25)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-950">{title}</h2>
                    <p className="mt-1.5 text-sm leading-6 text-slate-500">
                      {description[0]}
                      <br />
                      {description[1]}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PROBLEM ── */}
      <section className="border-y border-slate-100 bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">The Problem</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              High-value agricultural trade breaks when trust is still informal.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Commodity transactions need more than discovery. They need a structure for commitment,
              evidence, settlement, and reputational memory that both sides can inspect later.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {painPoints.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="card-hover group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
              >
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition-colors group-hover:bg-emerald-100 group-hover:text-emerald-700">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SOLUTION ── */}
      <section className="border-b border-slate-100 bg-white py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">What Settleway Makes Possible</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              One disciplined workspace for serious commodity transactions.
            </h2>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {proofPoints.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="card-hover group rounded-3xl border border-slate-200 bg-white p-7 shadow-sm"
              >
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 transition-all group-hover:bg-emerald-600 group-hover:text-white group-hover:shadow-[0_8px_20px_rgba(16,185,129,0.30)]">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WORKFLOW ── */}
      <section className="border-b border-slate-100 bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">The Corridor</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              From discovery to verified settlement in six clear moves.
            </h2>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {workflowSteps.map((step) => (
              <div
                key={step.step}
                className="card-hover group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
              >
                {/* Step number watermark */}
                <div className="absolute -right-3 -top-4 text-8xl font-black text-slate-50 select-none transition-colors group-hover:text-emerald-50">
                  {step.step}
                </div>
                <div className="relative">
                  <div className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-xs font-black text-white">
                    {step.step}
                  </div>
                  <h3 className="mt-4 text-base font-bold text-slate-900">{step.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-500">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STELLAR ── */}
      <section id="faq" className="border-b border-slate-100 bg-white py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Why Stellar Stays Mostly Invisible</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Blockchain is the proof layer, not the user journey.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Settleway uses Stellar so the product can honestly say a protected transaction has a
              verifiable trust trail. Users should feel the safety without being forced through a
              crypto-heavy interface.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {stellarNotes.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="card-hover rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
              >
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-4 text-sm text-slate-600">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Escrow lock, proof, refund, and settlement references belong to one trust trail.
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Simulated local-bank steps remain clearly labeled as simulated in MVP mode.
            </span>
          </div>
        </div>
      </section>

      {/* ── CTA FOOTER ── */}
      <section className="relative overflow-hidden bg-slate-950 py-20 text-white">
        {/* Decorative gradients */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-emerald-600/8 blur-3xl" />
        </div>

        <div className="relative mx-auto flex max-w-7xl flex-col gap-8 px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">One Transaction Workspace</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Settleway brings negotiation, escrow protection, delivery proof, and reputation into one workspace.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-300">
              Buyers and sellers move from first contact to aligned execution through recorded commitments,
              protected settlement milestones, and outcomes that remain verifiable.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
            <Link
              href="/marketplace"
              className="group inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-8 text-base font-semibold text-white shadow-[0_12px_28px_rgba(16,185,129,0.25)] transition-all duration-200 hover:bg-emerald-400 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(16,185,129,0.35)]"
            >
              View Marketplace
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/demo"
              className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-8 text-base font-semibold text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/20 hover:-translate-y-0.5"
            >
              Explore Guided Flow
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
