import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  ChevronLeft,
  Clock3,
  FileCheck2,
  Handshake,
  Landmark,
  UserRound,
  WalletCards,
} from 'lucide-react';
import { DealActions } from './DealActions';
import { AuroraAssuranceRail } from './AuroraAssuranceRail';
import { StatusPill } from '@/components/ui/StatusPill';
import { Stepper, type Step } from '@/components/ui/Stepper';
import type {
  DbDeal,
  DbCustodyDealLink,
  DbEscrowEvent,
  DbNegotiationMessage,
  CustodyV2ActionType,
  CustodyV2ContractState,
} from '@/lib/db/types';

type ViewerRole = 'buyer' | 'seller' | null;

function formatCurrency(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

function formatXlmBaseUnits(value: string): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return `${value} base units`;
  return `${(amount / 10_000_000).toLocaleString('en-US', {
    minimumFractionDigits: 7,
    maximumFractionDigits: 7,
  })} XLM`;
}

function shortenAddress(address: string | null | undefined): string {
  if (!address) return 'Not linked';
  if (address.length <= 16) return address;
  return `${address.slice(0, 8)}...${address.slice(-8)}`;
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  });
}

export function AuroraCommitmentRow({
  label,
  name,
  amount,
  status,
  statusClassName,
  obligation,
  icon: Icon,
}: {
  label: string;
  name: string;
  amount: number;
  status: string;
  statusClassName: string;
  obligation: string;
  icon: typeof UserRound;
}) {
  return (
    <div className="grid gap-4 border-b border-[var(--border-subtle)] px-5 py-5 last:border-b-0 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--navy-50)] text-[var(--navy-700)]">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase text-[var(--text-muted)]">{label}</span>
          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClassName}`}>
            {status}
          </span>
        </div>
        <div className="mt-1 font-semibold text-[var(--navy-900)]">{name}</div>
        <div className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{obligation}</div>
      </div>
      <div className="text-left sm:text-right">
        <div className="text-xs text-[var(--text-muted)]">Commitment</div>
        <div className="mt-1 font-semibold financial-figures text-[var(--navy-900)]">
          {formatCurrency(amount)}
        </div>
      </div>
    </div>
  );
}

export function AuroraFundingDealRoom({
  deal,
  buyerDisplayName,
  sellerDisplayName,
  viewerRole,
  connectedWallet,
  connectedWalletPreview,
  sourceOfferId,
  latestNegotiationMessages,
  recentRoomEvents,
  depositDeadlineAt,
  fundingWindowLabel,
  roomSubline,
  pricePerKg,
  deliveryDeadline,
  fundedCount,
  buyerFundingStatus,
  sellerFundingStatus,
  steps,
  custodyV2State,
  custodyV2ConfirmedActions,
  custodyV2EvidenceHash,
  custodyV2Link,
}: {
  deal: DbDeal;
  buyerDisplayName: string;
  sellerDisplayName: string;
  viewerRole: ViewerRole;
  connectedWallet: string | null | undefined;
  connectedWalletPreview: string;
  sourceOfferId: string | null;
  latestNegotiationMessages: DbNegotiationMessage[];
  recentRoomEvents: DbEscrowEvent[];
  depositDeadlineAt: string;
  fundingWindowLabel: string;
  roomSubline: string;
  pricePerKg: string;
  deliveryDeadline: string;
  fundedCount: number;
  buyerFundingStatus: { label: string; className: string };
  sellerFundingStatus: { label: string; className: string };
  steps: Step[];
  custodyV2State?: CustodyV2ContractState | null;
  custodyV2ConfirmedActions?: CustodyV2ActionType[];
  custodyV2EvidenceHash?: string | null;
  custodyV2Link?: DbCustodyDealLink | null;
}) {
  const platformFees = deal.buyer_fee_idr + deal.seller_fee_idr;
  const totalExpected = deal.buyer_total_idr + deal.seller_total_idr;
  const nextActor =
    deal.status === 'BUYER_FUNDED'
      ? 'Seller'
      : deal.status === 'SELLER_FUNDED'
        ? 'Buyer'
        : deal.status === 'CUSTODY_PENDING'
          ? 'Settleway custody'
          : viewerRole === 'seller'
            ? 'Seller'
            : viewerRole === 'buyer'
              ? 'Buyer'
              : 'Buyer or seller';
  const custodyState =
    deal.status === 'CUSTODY_PENDING'
      ? 'Both transfers confirmed; custody sweep pending'
      : fundedCount === 0
        ? 'No funds locked'
        : 'One commitment held; escrow not locked';
  const latestTxHref =
    deal.latest_stellar_tx_hash && deal.stellar_mode === 'testnet'
      ? `https://stellar.expert/explorer/testnet/tx/${deal.latest_stellar_tx_hash}`
      : null;
  const verificationLabel = latestTxHref
    ? 'Verified Testnet reference available'
    : deal.stellar_mode === 'testnet'
      ? 'Awaiting verified Testnet reference'
      : 'Demo mode; no confirmed chain reference';

  return (
    <div className="aurora-canvas min-h-screen pb-16 pt-7">
      <div className="field-container">
        <Link
          href={sourceOfferId ? `/offers/${sourceOfferId}` : '/marketplace'}
          className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--green-700)]"
        >
          <ChevronLeft className="h-4 w-4" />
          {sourceOfferId ? 'Back to recorded negotiation' : 'Back to marketplace'}
        </Link>

        <header className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="display-balance text-3xl font-semibold tracking-tight text-[var(--navy-900)] sm:text-5xl">
                {deal.commodity}
              </h1>
              <StatusPill status={deal.status} />
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm font-semibold text-[var(--text-secondary)]">
              <span className="inline-flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[var(--azure-600)]" />
                {buyerDisplayName}
              </span>
              <ArrowRight className="h-4 w-4 text-[var(--text-muted)]" />
              <span className="inline-flex items-center gap-2">
                <Landmark className="h-4 w-4 text-[var(--green-700)]" />
                {sellerDisplayName}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[var(--text-secondary)]">
              <span>{(deal.volume_kg ?? 0).toLocaleString('id-ID')} kg</span>
              <span>{pricePerKg}</span>
              <span>Protected value {formatCurrency(deal.principal_idr)}</span>
            </div>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">{roomSubline}</p>
          </div>

          <div className="aurora-command min-w-[18rem] p-4">
            <div className="flex items-start gap-3">
              <Clock3 className="mt-0.5 h-5 w-5 text-[var(--warning-600)]" />
              <div>
                <div className="text-xs font-semibold uppercase text-[var(--warning-600)]">
                  Funding deadline
                </div>
                <div className="mt-1 text-2xl font-semibold financial-figures text-[var(--navy-900)]">
                  {fundingWindowLabel}
                </div>
                <div className="mt-1 text-xs text-[var(--text-secondary)]">
                  {formatDateTime(depositDeadlineAt)}
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="mt-7">
          <Stepper steps={steps} />
        </section>

        <div className="mt-7 grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <main className="min-w-0 space-y-6">
            <section className="aurora-surface overflow-hidden">
              <div className="border-b border-[var(--border-subtle)] px-5 py-5 sm:px-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase text-[var(--green-700)]">
                      Funding Gate
                    </div>
                    <h2 className="mt-1 text-2xl font-semibold text-[var(--navy-900)]">
                      Bilateral commitments
                    </h2>
                  </div>
                  <span className="rounded-full bg-[var(--surface-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)]">
                    {fundedCount} of 2 funded
                  </span>
                </div>
              </div>

              <AuroraCommitmentRow
                label="Buyer"
                name={buyerDisplayName}
                amount={deal.buyer_total_idr}
                status={buyerFundingStatus.label}
                statusClassName={buyerFundingStatus.className}
                obligation={`Principal ${formatCurrency(deal.principal_idr)} + buyer bond ${formatCurrency(deal.buyer_bond_idr)} + fee ${formatCurrency(deal.buyer_fee_idr)}`}
                icon={Building2}
              />
              <AuroraCommitmentRow
                label="Seller"
                name={sellerDisplayName}
                amount={deal.seller_total_idr}
                status={sellerFundingStatus.label}
                statusClassName={sellerFundingStatus.className}
                obligation={`Performance bond ${formatCurrency(deal.seller_bond_idr)} + fee ${formatCurrency(deal.seller_fee_idr)}`}
                icon={UserRound}
              />
            </section>

            {custodyV2Link ? (
              <section className="aurora-surface p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-[var(--green-200)] bg-[var(--green-50)] px-3 py-1.5 text-xs font-semibold text-[var(--green-700)]">
                      Custody V2 · Stellar Testnet
                    </div>
                    <h2 className="mt-3 text-xl font-semibold text-[var(--navy-900)]">
                      Contract-backed room facts
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
                      This Deal Room is assigned directly to the Custody V2 Testnet rail. No
                      legacy demo fallback is available after this link is frozen.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-subtle)] px-4 py-3 text-sm">
                    <div className="text-xs font-semibold uppercase text-[var(--text-muted)]">
                      Connected wallet role
                    </div>
                    <div className="mt-1 font-semibold capitalize text-[var(--navy-900)]">
                      {viewerRole ?? 'No participant role'}
                    </div>
                    <div className="mt-1 font-mono text-xs text-[var(--text-secondary)]">
                      {shortenAddress(connectedWallet)}
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {[
                    ['Contract ID', custodyV2Link.contract_id],
                    ['XLM settlement asset', `${custodyV2Link.settlement_asset_label} native SAC on Stellar Testnet`],
                    ['Native XLM SAC contract', custodyV2Link.asset_contract_id],
                    ['Buyer wallet', custodyV2Link.buyer_address],
                    ['Seller wallet', custodyV2Link.seller_address],
                    ['Canonical terms hash', custodyV2Link.terms_hash],
                    ['Contract deal ID', custodyV2Link.contract_deal_id],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-2xl border border-[var(--border-subtle)] bg-white px-4 py-3"
                    >
                      <div className="text-xs font-semibold uppercase text-[var(--text-muted)]">
                        {label}
                      </div>
                      <div className="mt-1 break-all font-mono text-xs text-[var(--navy-900)]">
                        {value}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-[var(--green-100)] bg-[var(--green-50)] px-4 py-4">
                    <div className="text-xs font-semibold uppercase text-[var(--green-700)]">
                      Principal
                    </div>
                    <div className="mt-1 font-semibold financial-figures text-[var(--navy-900)]">
                      {formatXlmBaseUnits(custodyV2Link.principal_base_units)}
                    </div>
                    <div className="mt-1 text-xs text-[var(--text-secondary)]">
                      Display reference {formatCurrency(deal.principal_idr)}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[var(--azure-100)] bg-[var(--azure-50)] px-4 py-4">
                    <div className="text-xs font-semibold uppercase text-[var(--azure-700)]">
                      Buyer commitment bond
                    </div>
                    <div className="mt-1 font-semibold financial-figures text-[var(--navy-900)]">
                      {formatXlmBaseUnits(custodyV2Link.buyer_bond_base_units)}
                    </div>
                    <div className="mt-1 text-xs text-[var(--text-secondary)]">
                      Display reference {formatCurrency(deal.buyer_bond_idr)}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[var(--navy-100)] bg-[var(--navy-50)] px-4 py-4">
                    <div className="text-xs font-semibold uppercase text-[var(--navy-700)]">
                      Seller performance bond
                    </div>
                    <div className="mt-1 font-semibold financial-figures text-[var(--navy-900)]">
                      {formatXlmBaseUnits(custodyV2Link.seller_bond_base_units)}
                    </div>
                    <div className="mt-1 text-xs text-[var(--text-secondary)]">
                      Display reference {formatCurrency(deal.seller_bond_idr)}
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            <section className="aurora-feature-surface p-5 sm:p-6">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
                <div>
                  <div className="flex items-center gap-3">
                    <WalletCards className="h-5 w-5 text-[var(--azure-600)]" />
                    <div>
                      <div className="text-xs font-semibold uppercase text-[var(--text-muted)]">
                        Connected wallet
                      </div>
                      <div className="mt-1 font-semibold text-[var(--navy-900)]">
                        {connectedWalletPreview}
                      </div>
                    </div>
                  </div>
                  <p className="mt-5 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
                    Funding requires the active Testnet wallet to match the wallet linked to this
                    profile. The existing signed transaction flow remains unchanged.
                  </p>
                  <div className="mt-5 rounded-2xl border border-[var(--green-100)] bg-[var(--green-50)] p-4 text-sm leading-6 text-[var(--green-800)]">
                    If only one side funds before the deadline, that funded side is refunded in
                    full. The non-funding side receives the reputation consequence. No bond
                    slashing occurs before lock.
                  </div>
                </div>
                <DealActions
                  dealId={deal.id}
                  status={deal.status}
                  viewerRole={viewerRole}
                  connectedWalletAddress={connectedWallet}
                  railVersion={deal.rail_version ?? 'legacy_demo'}
                  custodyV2State={custodyV2State}
                  custodyV2ConfirmedActions={custodyV2ConfirmedActions}
                  custodyV2EvidenceHash={custodyV2EvidenceHash}
                />
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="aurora-surface p-5 sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold uppercase text-[var(--text-muted)]">
                      Recorded negotiation
                    </div>
                    <h2 className="mt-1 text-xl font-semibold text-[var(--navy-900)]">
                      Commercial context
                    </h2>
                  </div>
                  {sourceOfferId ? (
                    <Link
                      href={`/offers/${sourceOfferId}`}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border-default)] text-[var(--navy-900)] hover:bg-[var(--surface-subtle)]"
                      aria-label="Open recorded negotiation"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  ) : null}
                </div>
                <div className="mt-5 space-y-3">
                  {latestNegotiationMessages.length > 0 ? (
                    latestNegotiationMessages.map((message) => (
                      <div
                        key={message.id}
                        className="rounded-2xl bg-[var(--surface-subtle)] px-4 py-3 text-sm leading-6 text-[var(--text-secondary)]"
                      >
                        {message.body}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm leading-6 text-[var(--text-secondary)]">
                      This room was activated from agreed commercial terms. Open the recorded
                      thread to review the full context.
                    </p>
                  )}
                </div>
              </section>

              <section className="aurora-surface p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <FileCheck2 className="h-5 w-5 text-[var(--green-700)]" />
                  <div>
                    <div className="text-xs font-semibold uppercase text-[var(--text-muted)]">
                      Evidence expected
                    </div>
                    <h2 className="mt-1 text-xl font-semibold text-[var(--navy-900)]">
                      Delivery proof after lock
                    </h2>
                  </div>
                </div>
                <div className="mt-5 grid gap-3 text-sm text-[var(--text-secondary)]">
                  {['Recent product photos', 'Delivery proof', 'Signed receipt'].map((item) => (
                    <div key={item} className="flex items-center gap-3">
                      <BadgeCheck className="h-4 w-4 text-[var(--green-700)]" />
                      {item}
                    </div>
                  ))}
                </div>
                <div className="mt-5 text-xs leading-5 text-[var(--text-muted)]">
                  Evidence collection remains inactive until both commitments clear and escrow
                  lock is recorded.
                </div>
              </section>
            </div>

            <section className="aurora-surface p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <Handshake className="h-5 w-5 text-[var(--azure-600)]" />
                <h2 className="text-xl font-semibold text-[var(--navy-900)]">Recent room activity</h2>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {recentRoomEvents.length > 0 ? (
                  recentRoomEvents.slice(0, 4).map((event) => (
                    <div key={event.id} className="border-l-2 border-[var(--azure-300)] pl-4">
                      <div className="text-xs font-semibold text-[var(--text-muted)]">
                        {formatDateTime(event.created_at)}
                      </div>
                      <div className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                        {event.message ?? event.event_type}
                      </div>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="border-l-2 border-[var(--green-300)] pl-4">
                      <div className="text-xs font-semibold text-[var(--text-muted)]">Room activated</div>
                      <div className="mt-1 text-sm text-[var(--text-secondary)]">
                        Both parties agreed to open the protected Deal Room.
                      </div>
                    </div>
                    <div className="border-l-2 border-[var(--warning-600)]/40 pl-4">
                      <div className="text-xs font-semibold text-[var(--text-muted)]">Current</div>
                      <div className="mt-1 text-sm text-[var(--text-secondary)]">
                        Waiting for buyer and seller commitments.
                      </div>
                    </div>
                  </>
                )}
              </div>
            </section>
          </main>

          <aside className="min-w-0">
            {AuroraAssuranceRail({
              principal: formatCurrency(deal.principal_idr),
              buyerBond: formatCurrency(deal.buyer_bond_idr),
              sellerBond: formatCurrency(deal.seller_bond_idr),
              fees: formatCurrency(platformFees),
              totalExpected: formatCurrency(totalExpected),
              nextActor,
              custodyState,
              verificationLabel,
              latestTxHref,
              latestTxReference: deal.latest_stellar_tx_hash,
              dealId: deal.id,
              contractId: deal.stellar_contract_id,
              escrowId: deal.stellar_escrow_id,
              deliveryDeadline,
            })}
          </aside>
        </div>
      </div>
    </div>
  );
}
