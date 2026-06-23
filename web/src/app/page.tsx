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
} from 'lucide-react';

const capabilities = [
  {
    title: 'Discover Supply',
    description: 'Compare agricultural lots, origin, quantity, price, and seller confidence.',
    icon: PackageSearch,
    className: 'md:col-span-2 md:row-span-2',
  },
  {
    title: 'Post Buyer Demand',
    description: 'Signal verified purchasing intent before a protected room opens.',
    icon: Landmark,
    className: '',
  },
  {
    title: 'Negotiate Terms',
    description: 'Keep price, quantity, delivery, and evidence expectations in one recorded thread.',
    icon: MessageSquareText,
    className: '',
  },
  {
    title: 'Secure Commitments',
    description: 'Buyer principal and bilateral bonds create visible seriousness on both sides.',
    icon: Handshake,
    className: 'md:col-span-2',
  },
  {
    title: 'Verify Delivery',
    description: 'Evidence hashes and room milestones preserve the execution story.',
    icon: FileCheck2,
    className: '',
  },
  {
    title: 'Settle on Stellar',
    description: 'Testnet references support inspectable funding, lock, refund, and settlement proof.',
    icon: BadgeCheck,
    className: '',
  },
];

const workflow = ['Discover', 'Negotiate', 'Both Commit', 'Verify', 'Settle'];

export default function LandingPage() {
  return (
    <div className="overflow-hidden bg-[var(--canvas)]">
      <section className="aurora-canvas relative min-h-[calc(100vh-4.5rem)] border-b border-[var(--border-subtle)]">
        <div className="aurora-grid pointer-events-none absolute inset-0" />
        <div className="field-container relative grid gap-14 pb-16 pt-14 lg:grid-cols-[minmax(0,1.08fr)_minmax(390px,0.92fr)] lg:items-center lg:pb-24 lg:pt-20">
          <div className="aurora-enter">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--azure-300)]/45 bg-white/78 px-3 py-1.5 text-xs font-semibold text-[var(--azure-700)] shadow-sm backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5" />
              Bilateral trade assurance on Stellar Testnet
            </div>
            <h1 className="display-balance mt-7 max-w-4xl text-[clamp(3.15rem,7.4vw,6.8rem)] font-semibold leading-[0.94] tracking-[-0.055em] text-[var(--navy-900)]">
              Trade with commitment on both sides.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-[var(--text-secondary)] sm:text-xl">
              Discover supply and demand, negotiate commercial terms, secure buyer principal and
              bilateral bonds, verify delivery, and preserve settlement proof on Stellar.
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

          <div className="relative min-h-[31rem] lg:min-h-[38rem]" aria-label="Bilateral trade composition">
            <div className="absolute inset-x-[9%] top-[4%] h-[86%] rounded-[3.5rem] bg-gradient-to-br from-[var(--azure-100)]/80 via-white/40 to-[var(--green-100)]/80 blur-2xl" />
            <div className="aurora-feature-surface absolute left-0 top-[7%] w-[76%] overflow-hidden p-6 sm:w-[68%]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-[var(--text-muted)]">
                  Buyer intent
                </span>
                <span className="rounded-full bg-[var(--azure-50)] px-2.5 py-1 text-xs font-semibold text-[var(--azure-700)]">
                  Principal secured
                </span>
              </div>
              <div className="mt-8 text-3xl font-semibold financial-figures text-[var(--navy-900)]">
                Rp 19.950.000
              </div>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Purchase value plus buyer commitment bond.
              </p>
              <div className="mt-7 h-1.5 overflow-hidden rounded-full bg-[var(--surface-muted)]">
                <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-[var(--azure-500)] to-[var(--cyan-600)]" />
              </div>
            </div>

            <div className="aurora-assurance absolute bottom-[7%] right-0 w-[82%] rounded-[2rem] p-6 sm:w-[72%]">
              <div className="flex items-center justify-between text-xs font-semibold uppercase text-slate-300">
                <span>Seller commitment</span>
                <ShieldCheck className="h-5 w-5 text-emerald-300" />
              </div>
              <div className="mt-8 flex items-end justify-between gap-4">
                <div>
                  <div className="text-3xl font-semibold financial-figures">Rp 997.500</div>
                  <p className="mt-2 text-sm text-slate-300">Performance bond held before lock.</p>
                </div>
                <div className="flex h-16 w-16 items-center justify-center rounded-[1.4rem] border border-white/15 bg-white/10">
                  <Handshake className="h-8 w-8 text-emerald-200" />
                </div>
              </div>
            </div>

            <div className="aurora-acrylic absolute left-[10%] top-[45%] z-10 flex items-center gap-3 rounded-2xl px-4 py-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--green-700)] text-white">
                <Scale className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-xs text-[var(--text-muted)]">Mutual gate</span>
                <span className="block text-sm font-semibold text-[var(--navy-900)]">
                  Both parties commit
                </span>
              </span>
            </div>

            <div className="absolute bottom-[38%] left-[24%] right-[16%] h-px bg-gradient-to-r from-[var(--azure-500)] via-[var(--cyan-600)] to-[var(--green-500)]" />
          </div>
        </div>
      </section>

      <section id="capabilities" className="bg-white py-20 sm:py-24">
        <div className="field-container">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase text-[var(--azure-700)]">
              One connected trade workspace
            </p>
            <h2 className="display-balance mt-3 text-3xl font-semibold tracking-tight text-[var(--navy-900)] sm:text-5xl">
              Every serious step belongs to the same transaction story.
            </h2>
          </div>

          <div className="mt-12 grid auto-rows-[minmax(13rem,auto)] gap-4 md:grid-cols-4">
            {capabilities.map(({ title, description, icon: Icon, className }, index) => (
              <article
                key={title}
                className={`aurora-hover relative overflow-hidden rounded-[1.5rem] border p-6 ${
                  index === 0
                    ? 'border-[var(--navy-700)] bg-[var(--navy-900)] text-white'
                    : index === 4
                      ? 'border-[var(--green-100)] bg-gradient-to-br from-[var(--green-50)] to-white'
                      : 'border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--navy-900)]'
                } ${className}`}
              >
                <Icon
                  className={`h-6 w-6 ${index === 0 ? 'text-cyan-200' : 'text-[var(--green-700)]'}`}
                />
                <div className={index === 0 ? 'mt-24 md:mt-32' : 'mt-12'}>
                  <h3 className="text-xl font-semibold">{title}</h3>
                  <p
                    className={`mt-3 max-w-md text-sm leading-6 ${
                      index === 0 ? 'text-slate-300' : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    {description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="aurora-canvas border-y border-[var(--border-subtle)] py-20 sm:py-24">
        <div className="field-container">
          <div className="grid gap-12 lg:grid-cols-[0.72fr_1.28fr] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase text-[var(--green-700)]">
                The product mechanism
              </p>
              <h2 className="display-balance mt-3 text-3xl font-semibold tracking-tight text-[var(--navy-900)] sm:text-5xl">
                A corridor designed to slow down the risky moments.
              </h2>
              <p className="mt-5 text-base leading-7 text-[var(--text-secondary)]">
                Discovery stays open. Commercial terms become explicit. Funding begins only after
                mutual commitment. Evidence and settlement remain part of the same room.
              </p>
            </div>
            <ol className="relative grid gap-4 sm:grid-cols-5">
              <div className="aurora-hairline absolute left-[8%] right-[8%] top-7 hidden h-px sm:block" />
              {workflow.map((step, index) => (
                <li key={step} className="relative rounded-2xl border border-white/80 bg-white/78 p-4 shadow-sm backdrop-blur-md">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--navy-900)] text-xs font-semibold text-white financial-figures">
                    {index + 1}
                  </span>
                  <div className="mt-8 text-sm font-semibold text-[var(--navy-900)]">{step}</div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section id="trust-settlement" className="bg-white py-20 sm:py-24">
        <div className="field-container grid gap-8 lg:grid-cols-[1fr_1.05fr] lg:items-stretch">
          <div className="aurora-assurance rounded-[2rem] p-7 sm:p-9">
            <p className="text-xs font-semibold uppercase text-cyan-200">Bilateral assurance</p>
            <h2 className="display-balance mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              Capital, commitment, evidence, and outcome remain legible.
            </h2>
            <div className="mt-9 space-y-5">
              {[
                ['Buyer principal', '100% protected deal value'],
                ['Buyer commitment bond', '5% seriousness signal'],
                ['Seller performance bond', '5% delivery commitment'],
                ['Platform fee', '0.5% per party where applicable'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-5 border-b border-white/10 pb-4">
                  <span className="text-sm text-slate-300">{label}</span>
                  <span className="text-right text-sm font-semibold text-white">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="aurora-feature-surface p-6 sm:col-span-2">
              <CircleDollarSign className="h-6 w-6 text-[var(--azure-600)]" />
              <h3 className="mt-12 text-2xl font-semibold text-[var(--navy-900)]">
                Deterministic settlement
              </h3>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
                Successful completion returns both bonds, routes principal to the seller, and
                records the outcome without asking users to navigate a crypto-native interface.
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-[var(--border-subtle)] bg-[var(--surface)] p-6">
              <FileCheck2 className="h-6 w-6 text-[var(--green-700)]" />
              <h3 className="mt-10 text-lg font-semibold text-[var(--navy-900)]">Evidence commitment</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Negotiation, delivery metadata, and proof hashes support later review.
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-[var(--azure-100)] bg-[var(--azure-50)] p-6">
              <BadgeCheck className="h-6 w-6 text-[var(--azure-700)]" />
              <h3 className="mt-10 text-lg font-semibold text-[var(--navy-900)]">Stellar Testnet honesty</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                References appear only when real Testnet evidence exists. App state remains authoritative.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
