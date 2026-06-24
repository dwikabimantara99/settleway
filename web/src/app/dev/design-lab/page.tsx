import { notFound } from 'next/navigation';
import {
  AlertTriangle,
  ArrowRight,
  FileCheck2,
  Search,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { PublicLandingHeader } from '@/components/landing/PublicLandingHeader';
import { AuthenticatedHeader } from '@/components/layout/AuthenticatedHeader';
import { AuroraAssuranceRail } from '@/components/deal/AuroraAssuranceRail';
import { AuroraCommitmentRow } from '@/components/deal/AuroraFundingDealRoom';
import { TradeSurfaceCard } from '@/components/marketplace/TradeSurfaceCard';
import { Button } from '@/components/ui/Button';
import {
  EmptyState,
  HashDisplay,
  Notice,
  Skeleton,
  StatusBadge,
  VerificationSurface,
} from '@/components/field-ledger/primitives';
import { FieldLabel, Select, Textarea, TextInput } from '@/components/field-ledger/forms';
import { isDesignLabEnabled } from '@/lib/design-lab';

export default function DesignLabPage() {
  if (!isDesignLabEnabled()) {
    notFound();
  }

  return (
    <div className="aurora-canvas min-h-screen pb-20">
      <div className="border-b border-[var(--border-subtle)] bg-white">
        <PublicLandingHeader />
      </div>
      <div className="border-b border-[var(--border-subtle)] bg-white">
        <AuthenticatedHeader />
      </div>

      <div className="field-container pt-10">
        <p className="text-xs font-semibold uppercase text-[var(--azure-700)]">Development only</p>
        <h1 className="mt-2 text-4xl font-semibold text-[var(--navy-900)]">
          Settleway Aurora Design Lab
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--text-secondary)]">
          Production components and state treatments for public entry, discovery, bilateral
          funding, evidence, verification, and resilient interface states.
        </p>

        <div className="mt-10 space-y-12">
          <section>
            <h2 className="text-xl font-semibold text-[var(--navy-900)]">Color and material</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['Deep navy', 'bg-[var(--navy-900)] text-white'],
                ['Settleway green', 'bg-[var(--green-700)] text-white'],
                ['Verification azure', 'bg-[var(--azure-600)] text-white'],
                ['Restrained cyan', 'bg-[var(--cyan-600)] text-white'],
                ['Premium canvas', 'bg-[var(--canvas)] text-[var(--navy-900)]'],
                ['Warm white surface', 'bg-[var(--surface)] text-[var(--navy-900)]'],
                ['Warning', 'bg-[var(--warning-50)] text-[var(--warning-600)]'],
                ['Danger', 'bg-[var(--danger-50)] text-[var(--danger-600)]'],
              ].map(([label, className]) => (
                <div
                  key={label}
                  className={`flex min-h-28 items-end rounded-[1.25rem] border p-4 text-sm font-semibold ${className}`}
                >
                  {label}
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="aurora-surface p-6">
              <h2 className="text-xl font-semibold text-[var(--navy-900)]">Controls and command surface</h2>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button>Primary action</Button>
                <Button variant="secondary">Navy action</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="danger">Danger</Button>
              </div>
              <div className="aurora-command mt-6 p-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                  <TextInput className="pl-10" placeholder="Search active supply..." />
                </div>
              </div>
              <div className="mt-6 grid gap-4">
                <div>
                  <FieldLabel htmlFor="lab-commodity">Commodity</FieldLabel>
                  <TextInput id="lab-commodity" className="mt-2" defaultValue="Red Curly Chili" />
                </div>
                <div>
                  <FieldLabel htmlFor="lab-role">Role</FieldLabel>
                  <Select id="lab-role" className="mt-2" defaultValue="buyer">
                    <option value="buyer">Buyer</option>
                    <option value="seller">Seller</option>
                  </Select>
                </div>
                <div>
                  <FieldLabel htmlFor="lab-note">Terms note</FieldLabel>
                  <Textarea id="lab-note" className="mt-2" defaultValue="Grade A, delivery before 24 May." />
                </div>
              </div>
            </div>

            <div className="aurora-surface overflow-hidden">
              <div className="border-b border-[var(--border-subtle)] p-6">
                <h2 className="text-xl font-semibold text-[var(--navy-900)]">Bilateral commitment rows</h2>
              </div>
              <AuroraCommitmentRow
                label="Buyer"
                name="Surabaya Spice Co."
                amount={21047250}
                status="Pending"
                statusClassName="border-[var(--warning-600)]/25 bg-[var(--warning-50)] text-[var(--warning-600)]"
                obligation="Principal + buyer commitment bond + platform fee"
                icon={UserRound}
              />
              <AuroraCommitmentRow
                label="Seller"
                name="Probolinggo Farmer Group"
                amount={1097250}
                status="Funded"
                statusClassName="border-[var(--green-700)]/25 bg-[var(--green-50)] text-[var(--green-700)]"
                obligation="Seller performance bond + platform fee"
                icon={ShieldCheck}
              />
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
            <TradeSurfaceCard
              audience="buy"
              commodity="Red Chili (Bird's Eye Chili)"
              subtitle="Bird's Eye Chili Grade A"
              badgeLabel="Ready stock"
              badgeTone="success"
              locationLabel="Origin"
              locationValue="Probolinggo"
              volumeValue="700 kg available"
              pricePerKgIdr={28500}
              estimatedValueIdr={19950000}
              trustScore={92}
              verificationLabel="Verified seller"
              activityLabel="15 completed deals"
              counterpartyName="Probolinggo Farmer Group"
              detailHref="/marketplace/listing-cabai-001"
              detailLabel="Review opportunity"
              featured
            />
            <AuroraAssuranceRail
              principal="Buyer principal"
              buyerBond="Buyer commitment bond"
              sellerBond="Seller performance bond"
              fees="Platform fee policy"
              totalExpected="Bilateral commitments"
              nextActor="Buyer"
              custodyState="One commitment held; escrow not locked"
              verificationLabel="Awaiting verified Testnet reference"
              dealId="demo-cabai-001"
              deliveryDeadline="24 May 2025"
              sticky={false}
            />
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="aurora-surface p-6">
              <h2 className="text-xl font-semibold text-[var(--navy-900)]">Status and evidence</h2>
              <div className="mt-5 flex flex-wrap gap-2">
                <StatusBadge label="Pending" tone="warning" />
                <StatusBadge label="Confirmed on Testnet" tone="info" />
                <StatusBadge label="Protected" tone="success" />
                <StatusBadge label="Failed" tone="danger" />
              </div>
              <div className="mt-6 flex items-center gap-4 rounded-2xl border border-[var(--border-subtle)] p-4">
                <FileCheck2 className="h-5 w-5 text-[var(--azure-600)]" />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-[var(--navy-900)]">delivery-receipt.pdf</div>
                  <div className="mt-1 text-xs text-[var(--text-muted)]">Evidence hash pending</div>
                </div>
                <StatusBadge label="Recorded" tone="neutral" />
              </div>
              <div className="mt-6">
                <HashDisplay
                  label="Transaction reference"
                  value="9fd2ab784a0f9ce12bd781ab67fc21a9de8d33bc71e3f19ad12ce8712e"
                  href="https://stellar.expert/explorer/testnet"
                />
              </div>
            </div>

            <div className="space-y-4">
              <VerificationSurface
                status="Awaiting verification"
                confirmed={false}
                description="No local or pending value is presented as confirmed on-chain."
              />
              <Notice title="Funding deadline" tone="warning">
                The funded side receives a full refund if the counterparty misses the pre-lock deadline.
              </Notice>
              <Notice title="Action failed" tone="danger">
                The current state does not allow this transaction. Refresh before trying again.
              </Notice>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--navy-900)]">Empty, loading, and error states</h2>
            <div className="mt-5 grid gap-5 lg:grid-cols-3">
              <EmptyState
                icon={<ShieldCheck className="h-8 w-8" />}
                title="No evidence recorded"
                description="Evidence becomes available after escrow protection is confirmed."
                action={
                  <Button variant="outline">
                    Review requirements <ArrowRight className="h-4 w-4" />
                  </Button>
                }
              />
              <div className="aurora-surface space-y-4 p-6" aria-label="Loading state">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-28 w-full" />
              </div>
              <div className="aurora-surface flex min-h-64 flex-col justify-center p-6">
                <AlertTriangle className="h-8 w-8 text-[var(--danger-600)]" />
                <h3 className="mt-4 text-lg font-semibold text-[var(--navy-900)]">
                  Marketplace unavailable
                </h3>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  The surface preserves a clear recovery message without implying that data loaded.
                </p>
                <Button className="mt-5 w-fit" variant="outline">
                  Retry
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
