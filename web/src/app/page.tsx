import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  FileText,
  Handshake,
  Landmark,
  Lock,
  ShieldCheck,
  Store,
  Users,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

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
    title: 'Buyers fear sending money first',
    description:
      'A good listing is not enough when quality, delivery timing, and counterparty discipline are still uncertain.',
  },
  {
    title: 'Sellers fear bad-faith cancellation',
    description:
      'Suppliers can reserve inventory, prepare logistics, and still get exposed to weak commitment from the buyer side.',
  },
  {
    title: 'Reputation is usually too shallow',
    description:
      'Most trade conversations disappear into chat apps, so future counterparties cannot inspect how previous deals actually ended.',
  },
];

const workflowSteps = [
  {
    title: '1. Discover',
    description:
      'A buyer or seller starts from marketplace supply or buyer demand, not from an instant escrow popup.',
  },
  {
    title: '2. Review trust',
    description:
      'Profiles, verified volume, and proof visibility help both sides decide whether the trade looks credible.',
  },
  {
    title: '3. Submit offer',
    description:
      'Negotiation begins in a recorded thread so the product keeps context before money logic starts.',
  },
  {
    title: '4. Open Deal Room together',
    description:
      'Both sides must click Open Deal Room before deposits unlock the protected execution path.',
  },
  {
    title: '5. Fund and lock',
    description:
      'Buyer and seller fund their required obligations, then the escrow lock becomes part of the Stellar-backed trust trail.',
  },
  {
    title: '6. Prove, settle, and update reputation',
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

export default function LandingPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col bg-white">
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <p className="mb-5 text-sm font-semibold uppercase tracking-wide text-emerald-700">
              Agricultural trade infrastructure
            </p>

            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Settleway turns commodity trade from blind trust into disciplined execution.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Settleway is a marketplace and protected settlement corridor for high-value agricultural
              transactions. Buyers and sellers discover each other, negotiate in a recorded thread,
              commit together, fund escrow, prove delivery, and build reputation from real outcomes.
            </p>

            <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-700">
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1">
                <Users className="h-4 w-4 text-emerald-600" />
                Two-sided reputation
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1">
                <FileText className="h-4 w-4 text-emerald-600" />
                Recorded negotiation and evidence
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1">
                <BadgeCheck className="h-4 w-4 text-emerald-600" />
                Stellar-backed trust trail
              </span>
            </div>

            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/marketplace">
                <Button size="lg" className="gap-2">
                  View Marketplace
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/demo">
                <Button size="lg" variant="secondary" className="gap-2">
                  Explore Guided Flow
                </Button>
              </Link>
            </div>
          </div>

          <div className="border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Handshake className="h-4 w-4 text-emerald-600" />
              Protected trade flow
            </div>
            <ol className="space-y-4 text-sm text-slate-600">
              <li>
                <span className="block font-medium text-slate-900">Discovery and offer</span>
                Buyers and sellers begin with real trade intent before money moves.
              </li>
              <li>
                <span className="block font-medium text-slate-900">Recorded negotiation</span>
                Terms, expectations, and intent are captured before either side funds.
              </li>
              <li>
                <span className="block font-medium text-slate-900">Mutual deal activation</span>
                The protected room opens only after both counterparties commit.
              </li>
              <li>
                <span className="block font-medium text-slate-900">Settlement and reputation</span>
                Escrow milestones, delivery proof, and outcomes form one verifiable record.
              </li>
            </ol>

            <div className="mt-6 border-t border-slate-200 pt-4">
              <p className="text-sm font-medium leading-6 text-slate-900">
                Settleway transactions are protected by escrow logic and recorded on Stellar.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              The problem
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              High-value agricultural trade breaks when trust is still informal.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Commodity transactions need more than discovery. They need a structure for commitment,
              evidence, settlement, and reputational memory that both sides can inspect later.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {painPoints.map((item) => (
              <div key={item.title} className="border border-slate-200 bg-slate-50 p-6">
                <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50 py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              What Settleway makes possible
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              One disciplined workspace for serious commodity transactions.
            </h2>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {proofPoints.map(({ icon: Icon, title, description }) => (
              <div key={title} className="border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              The corridor
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              From discovery to verified settlement in six clear moves.
            </h2>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {workflowSteps.map((step) => (
              <div key={step.title} className="border border-slate-200 bg-slate-50 p-6">
                <h3 className="text-base font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50 py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              Why Stellar stays mostly invisible
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              Blockchain is the proof layer, not the user journey.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Settleway uses Stellar so the product can honestly say a protected transaction has a
              verifiable trust trail. Users should feel the safety without being forced through a
              crypto-heavy interface.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {stellarNotes.map(({ icon: Icon, title, description }) => (
              <div key={title} className="border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-emerald-700">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-4 text-sm text-slate-600">
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Escrow lock, proof, refund, and settlement references belong to one trust trail.
            </span>
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Simulated local-bank steps remain clearly labeled as simulated in MVP mode.
            </span>
          </div>
        </div>
      </section>

      <section className="bg-slate-900 py-16 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-300">
              One transaction workspace
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">
              Settleway brings negotiation, escrow protection, delivery proof, and reputation into one transaction workspace.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-300">
              Buyers and sellers move from first contact to aligned execution through recorded commitments,
              protected settlement milestones, and outcomes that remain verifiable.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/marketplace">
              <Button size="lg" className="gap-2">
                View Marketplace
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/demo">
              <Button size="lg" variant="secondary" className="gap-2">
                Explore Guided Flow
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
