import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  CircleDollarSign,
  FileCheck2,
  Handshake,
  Landmark,
  MessageSquareText,
  PackageSearch,
  Scale,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Award,
  Building2,
  ChevronRight,
  Lock,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────────
   STEP DATA — 6-stage transaction lifecycle
───────────────────────────────────────────────────────────────────────────── */
const lifecycle = [
  {
    step: 1,
    label: 'Discover',
    icon: PackageSearch,
    description:
      'Buyers browse available agricultural supply. Sellers respond to posted demand. Each party evaluates the opportunity before any commitment is made.',
  },
  {
    step: 2,
    label: 'Negotiate',
    icon: MessageSquareText,
    description:
      'An offer is submitted and a recorded negotiation begins. Price, quantity, quality standards, deadlines, and delivery obligations are agreed in writing.',
  },
  {
    step: 3,
    label: 'Commit',
    icon: Handshake,
    description:
      'Accepted terms create one shared Deal Room. Both parties fund their required commitments — buyer principal and bilateral bonds — before execution proceeds.',
  },
  {
    step: 4,
    label: 'Protect',
    icon: Lock,
    description:
      'Soroban smart contract custody holds the committed amounts. Escrow becomes locked only after both parties have funded, preventing unilateral exposure.',
  },
  {
    step: 5,
    label: 'Deliver & Settle',
    icon: FileCheck2,
    description:
      'Seller submits delivery evidence with a verifiable proof hash. Buyer reviews and accepts. Settlement is executed and Stellar transaction references are recorded.',
  },
  {
    step: 6,
    label: 'Build Reputation',
    icon: BadgeCheck,
    description:
      'The completed transaction is added to each participant\'s verifiable commercial history — visible to future counterparties as evidence of past performance.',
  },
];

/* ─────────────────────────────────────────────────────────────────────────────
   GROWTH PILLARS — 3-column reputation-to-growth section
───────────────────────────────────────────────────────────────────────────── */
const growthPillars = [
  {
    icon: Scale,
    label: 'Trade',
    description:
      'Complete transactions through clear terms, protected commitments, and verifiable settlement.',
  },
  {
    icon: Award,
    label: 'Build Reputation',
    description:
      'Turn completed trades into a persistent and transparent commercial history.',
  },
  {
    icon: Building2,
    label: 'Strengthen Growth Potential',
    description:
      'Use a stronger track record to improve confidence among future financing and investment partners.',
  },
];

/* ─────────────────────────────────────────────────────────────────────────────
   DEAL ROOM FEATURES — four concise attributes of the shared workspace
───────────────────────────────────────────────────────────────────────────── */
const dealRoomFeatures = [
  { label: 'Agreed terms', description: 'Product, price, quantity, and delivery obligations are locked from the moment both parties accept.' },
  { label: 'Funding obligations', description: 'Buyer principal, buyer bond, and seller bond are tracked with clear status for each party.' },
  { label: 'Delivery evidence', description: 'Proof submissions, metadata hashes, and acceptance decisions are recorded to the Deal Room.' },
  { label: 'Settlement reference', description: 'Stellar transaction hashes for funding, escrow lock, and final settlement are preserved and inspectable.' },
];

/* ─────────────────────────────────────────────────────────────────────────────
   PAGE COMPONENT
───────────────────────────────────────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div className="overflow-hidden bg-[var(--canvas)]">

      {/* ══════════════════════════════════════════════════════════════════
          1. HERO
      ══════════════════════════════════════════════════════════════════ */}
      <section className="aurora-canvas relative min-h-[calc(100vh-4.5rem)] border-b border-[var(--border-subtle)]">
        <div className="aurora-grid pointer-events-none absolute inset-0" />
        <div className="field-container relative grid gap-14 pb-16 pt-14 lg:grid-cols-[minmax(0,1.08fr)_minmax(390px,0.92fr)] lg:items-center lg:pb-24 lg:pt-20">

          {/* Left column — copy */}
          <div className="aurora-enter">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--azure-300)]/45 bg-white/78 px-3 py-1.5 text-xs font-semibold text-[var(--azure-700)] shadow-sm backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5" />
              Bilateral trade assurance on Stellar Testnet
            </div>

            <h1 className="display-balance mt-7 max-w-4xl text-[clamp(2.6rem,6.2vw,5.6rem)] font-semibold leading-[0.96] tracking-[-0.05em] text-[var(--navy-900)]">
              From Trade Opportunity to Verifiable Settlement.
            </h1>

            <p className="mt-7 max-w-2xl text-lg leading-8 text-[var(--text-secondary)] sm:text-xl">
              Settleway helps buyers and sellers discover opportunities, agree on clear terms, secure
              their commitments, document delivery, and complete transactions through a transparent
              Deal Room supported by Stellar Testnet.
            </p>

            <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--text-muted)]">
              From offer and negotiation to escrow, evidence, settlement, and reputation — each
              stage remains visible to both parties.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/marketplace"
                className="inline-flex min-h-13 items-center justify-center gap-3 rounded-2xl bg-[var(--green-700)] px-6 text-sm font-semibold text-white shadow-[0_16px_34px_rgb(23_102_59_/_0.22)] transition-all hover:-translate-y-0.5 hover:bg-[var(--green-800)]"
              >
                Explore Marketplace
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex min-h-13 items-center justify-center gap-3 rounded-2xl border border-[var(--border-strong)] bg-white/70 px-6 text-sm font-semibold text-[var(--navy-900)] backdrop-blur-md transition-colors hover:bg-white"
              >
                See How It Works
              </a>
            </div>
          </div>

          {/* Right column — visual composition */}
          <div className="relative min-h-[31rem] lg:min-h-[38rem]" aria-label="Bilateral trade composition">
            <div className="absolute inset-x-[9%] top-[4%] h-[86%] rounded-[3.5rem] bg-gradient-to-br from-[var(--azure-100)]/80 via-white/40 to-[var(--green-100)]/80 blur-2xl" />

            {/* Buyer assurance card */}
            <div className="aurora-feature-surface absolute left-0 top-[7%] w-[76%] overflow-hidden p-6 sm:w-[68%]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-[var(--text-muted)]">
                  Buyer assurance
                </span>
                <span className="rounded-full bg-[var(--azure-50)] px-2.5 py-1 text-xs font-semibold text-[var(--azure-700)]">
                  Pre-lock intent
                </span>
              </div>
              <div className="mt-8 text-2xl font-semibold text-[var(--navy-900)]">
                Principal + commitment bond
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                The buyer prepares purchase value and a seriousness bond before escrow can lock.
              </p>
              <div className="mt-7 grid grid-cols-2 gap-2 text-xs font-semibold text-[var(--navy-900)]">
                <span className="rounded-full bg-[var(--azure-50)] px-3 py-2 text-center text-[var(--azure-700)]">
                  Buyer principal
                </span>
                <span className="rounded-full bg-[var(--green-50)] px-3 py-2 text-center text-[var(--green-700)]">
                  Buyer bond
                </span>
              </div>
            </div>

            {/* Seller assurance card */}
            <div className="aurora-assurance absolute bottom-[7%] right-0 w-[82%] rounded-[2rem] p-6 sm:w-[72%]">
              <div className="flex items-center justify-between text-xs font-semibold uppercase text-slate-300">
                <span>Seller assurance</span>
                <ShieldCheck className="h-5 w-5 text-emerald-300" />
              </div>
              <div className="mt-8 flex items-end justify-between gap-4">
                <div>
                  <div className="text-2xl font-semibold">Performance bond</div>
                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    The seller commits delivery seriousness before protected execution begins.
                  </p>
                </div>
                <div className="flex h-16 w-16 items-center justify-center rounded-[1.4rem] border border-white/15 bg-white/10">
                  <Handshake className="h-8 w-8 text-emerald-200" />
                </div>
              </div>
            </div>

            {/* Mutual terms acrylic badge */}
            <div className="aurora-acrylic absolute left-[10%] top-[42%] z-10 flex max-w-[18rem] items-center gap-3 rounded-2xl px-4 py-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--green-700)] text-white">
                <Scale className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-xs text-[var(--text-muted)]">Mutual terms gate</span>
                <span className="block text-sm font-semibold text-[var(--navy-900)]">
                  Commercial terms locked by both sides
                </span>
              </span>
            </div>

            {/* Verification badge */}
            <div className="aurora-acrylic absolute right-[6%] top-[50%] z-10 grid gap-2 rounded-2xl px-4 py-3 text-xs font-semibold text-[var(--navy-900)] sm:right-[10%]">
              <span className="flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-[var(--green-700)]" />
                Evidence verification
              </span>
              <span className="flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-[var(--azure-700)]" />
                Stellar-backed settlement
              </span>
            </div>

            <div className="absolute bottom-[38%] left-[24%] right-[16%] h-px bg-gradient-to-r from-[var(--azure-500)] via-[var(--cyan-600)] to-[var(--green-500)]" />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          2. THE TRUST PROBLEM
      ══════════════════════════════════════════════════════════════════ */}
      <section className="bg-white py-16 sm:py-20">
        <div className="field-container">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--azure-700)]">
              The problem Settleway addresses
            </p>
            <h2 className="display-balance mt-4 text-2xl font-semibold tracking-tight text-[var(--navy-900)] sm:text-3xl">
              Commercial relationships depend on trust before a reliable record exists.
            </h2>
            <p className="mt-5 text-base leading-7 text-[var(--text-secondary)]">
              When agreements are scattered across messages, commitments are not secured, delivery
              evidence is fragmented, and transaction histories cannot be independently verified —
              both buyers and sellers carry unnecessary uncertainty.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Scattered agreements', description: 'Terms negotiated across email and messaging apps with no persistent record.' },
              { label: 'Unsecured commitments', description: 'Nothing enforces follow-through once informal terms are reached.' },
              { label: 'Fragmented evidence', description: 'Delivery proof and correspondence live in separate, unconnected places.' },
              { label: 'Unverifiable history', description: 'Smaller businesses cannot easily demonstrate past commercial performance.' },
            ].map(({ label, description }) => (
              <div
                key={label}
                className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5"
              >
                <div className="h-1.5 w-8 rounded-full bg-[var(--azure-300)]" />
                <h3 className="mt-4 text-sm font-semibold text-[var(--navy-900)]">{label}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-[var(--green-100)] bg-gradient-to-br from-[var(--green-50)] to-white p-6 sm:p-8">
            <p className="text-sm leading-7 text-[var(--navy-900)]">
              <span className="font-semibold">Settleway brings these elements into one shared and persistent transaction process.</span>{' '}
              Terms, commitments, evidence, and settlement references remain connected to a single
              Deal Room — visible to both parties from first contact to final outcome.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          3. COMPLETE TRANSACTION FLOW (How It Works)
      ══════════════════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="aurora-canvas border-y border-[var(--border-subtle)] py-20 sm:py-24">
        <div className="field-container">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--green-700)]">
              The complete transaction lifecycle
            </p>
            <h2 className="display-balance mt-4 text-3xl font-semibold tracking-tight text-[var(--navy-900)] sm:text-4xl">
              Every stage of the trade, connected in one place.
            </h2>
            <p className="mt-5 text-base leading-7 text-[var(--text-secondary)]">
              Settleway structures the journey from first discovery to verified settlement, ensuring
              no stage is skipped and every decision is on record.
            </p>
          </div>

          {/* 6-step grid */}
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {lifecycle.map(({ step, label, icon: Icon, description }) => (
              <div
                key={step}
                className="relative rounded-2xl border border-[var(--border-subtle)] bg-white/80 p-6 backdrop-blur-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--navy-900)] text-xs font-semibold text-white financial-figures">
                    {step}
                  </span>
                  <Icon className="h-5 w-5 text-[var(--green-700)]" />
                </div>
                <h3 className="mt-5 text-base font-semibold text-[var(--navy-900)]">{label}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
                {step < 6 && (
                  <ChevronRight className="absolute right-4 top-1/2 hidden -translate-y-1/2 text-[var(--border-default)] lg:block" aria-hidden="true" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          4. THE DEAL ROOM
      ══════════════════════════════════════════════════════════════════ */}
      <section className="bg-white py-20 sm:py-24">
        <div className="field-container">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-center">

            {/* Text column */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--azure-700)]">
                The shared workspace
              </p>
              <h2 className="display-balance mt-4 text-3xl font-semibold tracking-tight text-[var(--navy-900)] sm:text-4xl">
                One Shared Record for Every Transaction
              </h2>
              <p className="mt-5 text-base leading-7 text-[var(--text-secondary)]">
                Once terms are accepted, the Deal Room becomes the authoritative workspace for both
                parties. It keeps commitments, evidence, transaction states, and settlement
                references connected to one persistent agreement.
              </p>
              <p className="mt-4 text-base leading-7 text-[var(--text-secondary)]">
                Unlike an ordinary marketplace listing, the Deal Room does not close after a
                purchase. It remains the living record of every action taken by both buyer and
                seller — from first funding through to final settlement.
              </p>
              <Link
                href="/marketplace"
                className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[var(--green-700)] hover:text-[var(--green-800)]"
              >
                Explore the marketplace
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Feature cards column */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {dealRoomFeatures.map(({ label, description }) => (
                <div
                  key={label}
                  className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5"
                >
                  <div className="h-1 w-6 rounded-full bg-[var(--green-500)]" />
                  <h3 className="mt-4 text-sm font-semibold text-[var(--navy-900)]">{label}</h3>
                  <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">{description}</p>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          5. COMMITMENT, FUNDING & ESCROW  +  6. EVIDENCE & STELLAR PROOF
      ══════════════════════════════════════════════════════════════════ */}
      <section id="trust-settlement" className="aurora-canvas border-y border-[var(--border-subtle)] py-20 sm:py-24">
        <div className="field-container">

          {/* Section header */}
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--azure-700)]">
              Commitment, evidence, and settlement
            </p>
            <h2 className="display-balance mt-4 text-3xl font-semibold tracking-tight text-[var(--navy-900)] sm:text-4xl">
              Capital, commitment, evidence, and outcome remain legible.
            </h2>
            <p className="mt-5 text-base leading-7 text-[var(--text-secondary)]">
              The Settleway assurance mechanism requires both parties to fund before any custody
              action executes. Settlement follows the verified outcome — not an assumption.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1fr_1.05fr] lg:items-stretch">

            {/* Bilateral assurance card — dark */}
            <div className="aurora-assurance rounded-[2rem] p-7 sm:p-9">
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-200">
                Bilateral assurance structure
              </p>
              <h3 className="display-balance mt-4 text-2xl font-semibold tracking-tight">
                Both parties commit before execution begins.
              </h3>
              <p className="mt-4 text-sm leading-6 text-slate-300">
                Buyer principal represents the agreed transaction value. Buyer and seller bonds
                signal mutual seriousness. Escrow locks only after both parties have funded.
                Settlement distributes according to the verified outcome.
              </p>
              <div className="mt-8 space-y-4">
                {[
                  ['Buyer principal', '100% of agreed transaction value'],
                  ['Buyer commitment bond', '5% purchase-intent signal'],
                  ['Seller performance bond', '5% delivery-intent signal'],
                  ['Platform fee', '0.5% per party where applicable'],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-5 border-b border-white/10 pb-3">
                    <span className="text-sm text-slate-300">{label}</span>
                    <span className="text-right text-sm font-semibold text-white">{value}</span>
                  </div>
                ))}
              </div>
              <p className="mt-6 text-xs text-slate-400">
                Testnet custody only. No production banking infrastructure or Mainnet custody claim.
              </p>
            </div>

            {/* Right column — 3 feature cards */}
            <div className="grid gap-4 sm:grid-cols-2">

              {/* Deterministic settlement — spans full width */}
              <div className="aurora-feature-surface p-6 sm:col-span-2">
                <CircleDollarSign className="h-6 w-6 text-[var(--azure-600)]" />
                <h3 className="mt-10 text-xl font-semibold text-[var(--navy-900)]">
                  Deterministic Settlement
                </h3>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
                  Successful delivery acceptance returns both bonds, routes principal to the seller,
                  and records the outcome. The settlement path follows the agreed terms — no
                  manual override and no unresolved ambiguity.
                </p>
              </div>

              {/* Evidence record */}
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6">
                <FileCheck2 className="h-6 w-6 text-[var(--green-700)]" />
                <h3 className="mt-8 text-base font-semibold text-[var(--navy-900)]">
                  Delivery Evidence Record
                </h3>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  Negotiation records, delivery metadata, proof hashes, and transaction references
                  remain connected to the Deal Room for later review.
                </p>
              </div>

              {/* Stellar-verified execution */}
              <div className="rounded-2xl border border-[var(--azure-100)] bg-[var(--azure-50)] p-6">
                <BadgeCheck className="h-6 w-6 text-[var(--azure-700)]" />
                <h3 className="mt-8 text-base font-semibold text-[var(--navy-900)]">
                  Stellar-Verified Execution
                </h3>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  Stellar references appear only when a real Testnet transaction has been submitted
                  and confirmed. Application state does not replace blockchain evidence.
                </p>
              </div>

            </div>
          </div>

          {/* Stellar role clarification */}
          <div className="mt-8 rounded-2xl border border-[var(--azure-100)] bg-white p-6 sm:p-8">
            <div className="grid gap-6 sm:grid-cols-[auto_1fr] sm:items-start">
              <Landmark className="mt-0.5 h-6 w-6 flex-shrink-0 text-[var(--azure-600)]" />
              <div>
                <h3 className="text-sm font-semibold text-[var(--navy-900)]">
                  What Stellar and Soroban provide
                </h3>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  Stellar Testnet and Soroban smart contracts are the verifiable trust and settlement
                  layer — not a decorative component. They provide custody evidence, funding
                  transaction references, escrow-state confirmation, and settlement verification.
                  Individual messages and documents are not stored on-chain; only custody actions
                  produce Testnet evidence.
                </p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          7. VERIFIED REPUTATION
      ══════════════════════════════════════════════════════════════════ */}
      <section className="bg-white py-20 sm:py-24">
        <div className="field-container">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-center">

            {/* Feature cards */}
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { label: 'Completed Deal Rooms', description: 'Each closed transaction is the primary unit of reputation — not a rating or badge.' },
                { label: 'Buyer and Seller role', description: 'The record distinguishes whether a participant completed as a buyer, seller, or both.' },
                { label: 'Product and value', description: 'Commodity, quantity, and transaction value are part of the verifiable record.' },
                { label: 'Settlement reference', description: 'Stellar transaction hash links the reputation entry to a real Testnet settlement event.' },
              ].map(({ label, description }) => (
                <div
                  key={label}
                  className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5"
                >
                  <BadgeCheck className="h-5 w-5 text-[var(--green-600)]" />
                  <h3 className="mt-3 text-sm font-semibold text-[var(--navy-900)]">{label}</h3>
                  <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">{description}</p>
                </div>
              ))}
            </div>

            {/* Text column */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--green-700)]">
                Verified commercial history
              </p>
              <h2 className="display-balance mt-4 text-3xl font-semibold tracking-tight text-[var(--navy-900)] sm:text-4xl">
                Reputation Built Through Completed Trade
              </h2>
              <p className="mt-5 text-base leading-7 text-[var(--text-secondary)]">
                Reputation in Settleway is built from verified transaction history. Each completed
                trade contributes to a transparent record of commercial reliability — for both
                buyers and sellers.
              </p>
              <p className="mt-4 text-base leading-7 text-[var(--text-secondary)]">
                It is not based on self-declared claims, arbitrary points, or a generic score. It
                is derived from completed Deal Rooms — with the role, product, counterparty, and
                settlement reference attached to each entry.
              </p>
              <p className="mt-4 text-sm leading-6 text-[var(--text-muted)]">
                Future counterparties can evaluate this record before deciding to negotiate. A
                stronger history reduces the uncertainty that every first transaction carries.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          8. REPUTATION AS A FOUNDATION FOR GROWTH
      ══════════════════════════════════════════════════════════════════ */}
      <section className="aurora-canvas border-y border-[var(--border-subtle)] py-20 sm:py-24">
        <div className="field-container">

          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--azure-700)]">
              Beyond the transaction
            </p>
            <h2 className="display-balance mt-4 text-3xl font-semibold tracking-tight text-[var(--navy-900)] sm:text-4xl">
              Verified Reputation as a Foundation for Business Growth
            </h2>
            <p className="mt-5 text-base leading-7 text-[var(--text-secondary)]">
              A reliable transaction history can strengthen a business's credibility beyond the
              marketplace. As verified activity grows, it can provide prospective investors and
              financing partners with a clearer view of the business's commercial consistency and
              fulfillment performance.
            </p>
          </div>

          {/* Three-column growth pillars */}
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {growthPillars.map(({ icon: Icon, label, description }) => (
              <div
                key={label}
                className="rounded-2xl border border-[var(--border-subtle)] bg-white/80 p-7 backdrop-blur-sm"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-white">
                  <Icon className="h-5 w-5 text-[var(--navy-700)]" />
                </div>
                <h3 className="mt-5 text-base font-semibold text-[var(--navy-900)]">{label}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
              </div>
            ))}
          </div>

          {/* Growth detail — extended narrative */}
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-white/80 p-6 backdrop-blur-sm">
              <TrendingUp className="h-6 w-6 text-[var(--azure-600)]" />
              <h3 className="mt-4 text-sm font-semibold text-[var(--navy-900)]">
                What a verified track record demonstrates
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
                {[
                  'Consistent commercial activity over time',
                  'Fulfillment reliability and delivery performance',
                  'Transaction volume and counterparty confidence',
                  'Operational credibility supported by evidence',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--azure-400)]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-white/80 p-6 backdrop-blur-sm">
              <Building2 className="h-6 w-6 text-[var(--green-600)]" />
              <h3 className="mt-4 text-sm font-semibold text-[var(--navy-900)]">
                Who a stronger track record can reach
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
                {[
                  'Prospective trade counterparties and buyers',
                  'Financing and working-capital partners',
                  'Strategic investors and business collaborators',
                  'Institutions requiring demonstrated commercial history',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--green-400)]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
            Settleway does not currently provide financing, underwriting, or investor matching.
            Reputation represents verified commercial history. Its value to future growth partners
            is determined by those partners independently.
          </p>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          9. CLOSING STATEMENT
      ══════════════════════════════════════════════════════════════════ */}
      <section className="bg-white py-16 sm:py-20">
        <div className="field-container">
          <div className="aurora-assurance rounded-[2rem] p-8 text-center sm:p-12">
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-200">
              The complete story
            </p>
            <h2 className="display-balance mx-auto mt-5 max-w-3xl text-2xl font-semibold leading-snug tracking-tight sm:text-3xl">
              Settleway helps businesses move from first contact to verifiable settlement — and from
              verifiable settlement to long-term commercial trust.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-300">
              Every completed transaction strengthens the record that buyers, sellers, and future
              growth partners can evaluate.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/marketplace"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-7 text-sm font-semibold text-[var(--navy-900)] shadow-md transition-all hover:-translate-y-0.5 hover:bg-white/90"
              >
                Explore Marketplace
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
