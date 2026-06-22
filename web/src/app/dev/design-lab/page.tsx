import { notFound } from 'next/navigation';
import { ArrowRight, Check, Copy, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  AmountDisplay,
  DataRow,
  DeadlineDisplay,
  EmptyState,
  HashDisplay,
  Notice,
  SectionHeader,
  Skeleton,
  StatusBadge,
  VerificationSurface,
} from '@/components/field-ledger/primitives';
import { FieldLabel, Select, Textarea, TextInput } from '@/components/field-ledger/forms';
import { Stepper } from '@/components/ui/Stepper';

export default function DesignLabPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  return (
    <div className="field-container py-10">
      <SectionHeader
        eyebrow="Development only"
        title="Field Ledger Design Lab"
        description="Owned tokens and primitives for Settleway's bilateral trade corridor."
      />

      <div className="mt-10 space-y-10">
        <section>
          <h2 className="mb-4 text-lg font-semibold text-[var(--navy-900)]">Semantic color</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['Canvas', 'bg-[var(--canvas)]'],
              ['Navy', 'bg-[var(--navy-800)] text-white'],
              ['Green', 'bg-[var(--green-700)] text-white'],
              ['Stellar', 'bg-[var(--stellar-50)] text-[var(--stellar-700)]'],
              ['Warning', 'bg-[var(--warning-50)] text-[var(--warning-600)]'],
              ['Danger', 'bg-[var(--danger-50)] text-[var(--danger-600)]'],
              ['Surface', 'bg-[var(--surface)]'],
              ['Subtle', 'bg-[var(--surface-subtle)]'],
            ].map(([label, className]) => (
              <div key={label} className={`min-h-20 rounded-md border p-4 text-sm font-semibold ${className}`}>
                {label}
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="field-surface p-5">
            <h2 className="text-lg font-semibold text-[var(--navy-900)]">Controls</h2>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button>Primary action</Button>
              <Button variant="secondary">Navy action</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
            </div>
            <div className="mt-6 grid gap-4">
              <div>
                <FieldLabel htmlFor="lab-input">Commodity</FieldLabel>
                <TextInput id="lab-input" className="mt-2" defaultValue="Red Curly Chili" />
              </div>
              <div>
                <FieldLabel htmlFor="lab-select">Role</FieldLabel>
                <Select id="lab-select" className="mt-2" defaultValue="buyer">
                  <option value="buyer">Buyer</option>
                  <option value="seller">Seller</option>
                </Select>
              </div>
              <div>
                <FieldLabel htmlFor="lab-textarea">Terms note</FieldLabel>
                <Textarea id="lab-textarea" className="mt-2" defaultValue="Grade A, delivery before 24 May." />
              </div>
            </div>
          </div>

          <div className="field-surface p-5">
            <h2 className="text-lg font-semibold text-[var(--navy-900)]">Transaction language</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              <StatusBadge label="Pending" tone="warning" />
              <StatusBadge label="Confirmed on Testnet" tone="info" />
              <StatusBadge label="Protected" tone="success" />
              <StatusBadge label="Dispute ready" tone="danger" />
            </div>
            <dl className="mt-5">
              <DataRow label="Principal" value="Rp 19.950.000" />
              <DataRow label="Buyer bond" value="Rp 997.500" />
              <DataRow label="Seller bond" value="Rp 997.500" />
              <DataRow label="Total secured" value="Rp 21.945.000" emphasized />
            </dl>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <AmountDisplay label="Protected value" value="Rp 19.950.000" size="lg" />
              <DeadlineDisplay label="Funding closes" value="23h 36m" />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <Notice title="Bilateral commitment" tone="info">
            Buyer principal and both commitment bonds remain visible before the room locks.
          </Notice>
          <Notice title="Funding deadline" tone="warning">
            The funded side is refunded in full if the counterparty misses the pre-lock deadline.
          </Notice>
          <Notice title="Settlement confirmed" tone="success">
            Settlement references and reputation outcomes belong to the same event trail.
          </Notice>
          <VerificationSurface
            status="Confirmed on Testnet"
            confirmed
            description="Escrow lock is recorded on Stellar Testnet. Product state remains authoritative in Settleway."
            reference="4b9d1c55e9d24ac87fa2183eab761ddf102ab71ce9d81ef99aa871ff90d2"
            href="https://stellar.expert/explorer/testnet"
          />
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold text-[var(--navy-900)]">Trade timeline</h2>
          <Stepper
            steps={[
              { label: 'Terms agreed', status: 'complete', actor: 'Buyer + seller' },
              { label: 'Funding', status: 'current', actor: 'Buyer action due' },
              { label: 'Escrow protected', status: 'upcoming', actor: 'Settleway' },
              { label: 'Delivery evidence', status: 'upcoming', actor: 'Seller' },
              { label: 'Buyer review', status: 'upcoming', actor: 'Buyer' },
              { label: 'Settled', status: 'upcoming', actor: 'Automatic' },
            ]}
          />
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <div className="field-surface p-5">
            <HashDisplay
              label="Transaction reference"
              value="9fd2ab784a0f9ce12bd781ab67fc21a9de8d33bc71e3f19ad12ce8712e"
              href="https://stellar.expert/explorer/testnet"
            />
            <button className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm font-semibold">
              <Copy className="h-4 w-4" /> Copy reference
            </button>
          </div>
          <EmptyState
            icon={<ShieldCheck className="h-8 w-8" />}
            title="No evidence recorded"
            description="Evidence becomes available after escrow protection is confirmed."
            action={<Button variant="outline">Review requirements <ArrowRight className="h-4 w-4" /></Button>}
          />
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold text-[var(--navy-900)]">Loading</h2>
          <div className="field-surface space-y-3 p-5">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <Check className="h-4 w-4" /> Reduced motion is respected.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
