import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  Clock3,
  Copy,
  FileText,
  ShieldCheck,
  WalletCards,
} from 'lucide-react';
import type {
  DbCustodyDealLink,
  DbCustodyOperation,
  DbDeal,
  DbProfile,
} from '@/lib/db/types';
import type { UserSession } from '@/lib/auth/server';
import { Stepper, type Step } from '@/components/ui/Stepper';
import { resolveCustodyV2WalletRole } from '@/lib/custody-v2/roles';
import { CustodyV2ActionPanel } from './CustodyV2ActionPanel';

interface CustodyV2DealRoomProps {
  deal: DbDeal;
  custodyLink: DbCustodyDealLink | null;
  operations: DbCustodyOperation[];
  buyerProfile: DbProfile | null;
  sellerProfile: DbProfile | null;
  currentUser: UserSession | null;
}

function formatIdr(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

function formatXlm(baseUnits: string): string {
  const padded = baseUnits.padStart(8, '0');
  const whole = padded.slice(0, -7) || '0';
  const fraction = padded.slice(-7).replace(/0+$/, '');
  return `${whole}${fraction ? `.${fraction}` : ''} XLM`;
}

function shortAddress(address: string | null | undefined): string {
  if (!address) return 'Not connected';
  return `${address.slice(0, 7)}...${address.slice(-5)}`;
}

function latestOperation(
  operations: DbCustodyOperation[],
  actionType: DbCustodyOperation['action_type'],
  status?: DbCustodyOperation['status'],
): DbCustodyOperation | null {
  return operations
    .filter((operation) => operation.action_type === actionType)
    .filter((operation) => (status ? operation.status === status : true))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0] ?? null;
}

function buildSteps(state: 'not_created' | 'create_pending' | 'awaiting_acceptance' | 'accept_pending' | 'awaiting_funding'): Step[] {
  return [
    { label: 'Terms agreed', status: 'complete' },
    {
      label: 'Create on Stellar',
      status:
        state === 'not_created'
          ? 'current'
          : state === 'create_pending'
            ? 'current'
            : 'complete',
    },
    {
      label: 'Seller accepts',
      status:
        state === 'awaiting_acceptance'
          ? 'current'
          : state === 'accept_pending'
            ? 'current'
            : state === 'awaiting_funding'
              ? 'complete'
              : 'upcoming',
    },
    {
      label: 'Awaiting funding',
      status: state === 'awaiting_funding' ? 'current' : 'upcoming',
    },
  ];
}

function resolveScreenState(link: DbCustodyDealLink, operations: DbCustodyOperation[]) {
  const createConfirmed = latestOperation(operations, 'CREATE_DEAL', 'confirmed');
  const createSubmitted = latestOperation(operations, 'CREATE_DEAL', 'submitted');
  const acceptConfirmed = latestOperation(operations, 'ACCEPT_TERMS', 'confirmed');
  const acceptSubmitted = latestOperation(operations, 'ACCEPT_TERMS', 'submitted');

  if (link.latest_contract_state === 'AwaitingFunding' || acceptConfirmed) {
    return { key: 'awaiting_funding' as const, createConfirmed, createSubmitted, acceptConfirmed, acceptSubmitted };
  }
  if (acceptSubmitted) {
    return { key: 'accept_pending' as const, createConfirmed, createSubmitted, acceptConfirmed, acceptSubmitted };
  }
  if (createConfirmed) {
    return { key: 'awaiting_acceptance' as const, createConfirmed, createSubmitted, acceptConfirmed, acceptSubmitted };
  }
  if (createSubmitted) {
    return { key: 'create_pending' as const, createConfirmed, createSubmitted, acceptConfirmed, acceptSubmitted };
  }
  return { key: 'not_created' as const, createConfirmed, createSubmitted, acceptConfirmed, acceptSubmitted };
}

function statusCopy(state: ReturnType<typeof resolveScreenState>['key']) {
  switch (state) {
    case 'not_created':
      return {
        title: 'Ready for buyer creation',
        body: 'The agreed commercial terms are frozen. The buyer must create the Custody V2 deal on Stellar before the seller can accept.',
      };
    case 'create_pending':
      return {
        title: 'Creation submitted',
        body: 'Buyer creation has been submitted to Stellar and is waiting for confirmation.',
      };
    case 'awaiting_acceptance':
      return {
        title: 'Waiting for seller acceptance',
        body: 'The buyer created the deal on Stellar. The seller must now accept the exact same immutable terms.',
      };
    case 'accept_pending':
      return {
        title: 'Seller acceptance submitted',
        body: 'Seller acceptance has been submitted to Stellar and is waiting for confirmation.',
      };
    case 'awaiting_funding':
      return {
        title: 'Awaiting funding',
        body: 'Buyer creation and seller acceptance are confirmed. Funding actions will be enabled in Recovery Milestone 2.',
      };
  }
}

export function CustodyV2DealRoom({
  deal,
  custodyLink,
  operations,
  buyerProfile,
  sellerProfile,
  currentUser,
}: CustodyV2DealRoomProps) {
  if (!custodyLink) {
    return (
      <div className="min-h-screen bg-[var(--surface)] text-[var(--navy-900)]">
        <main className="field-container py-10">
          <section className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-800">
            <h1 className="text-2xl font-semibold">Custody V2 deal link is missing</h1>
            <p className="mt-2 text-sm leading-6">
              This deal is assigned to the Custody V2 rail, but the canonical terms link was not
              found. Settleway will not fall back to the legacy demo room.
            </p>
          </section>
        </main>
      </div>
    );
  }

  const viewerProfile =
    currentUser?.id === deal.buyer_id
      ? buyerProfile
      : currentUser?.id === deal.seller_id
        ? sellerProfile
        : null;
  const roleResolution = resolveCustodyV2WalletRole({
    connectedWalletAddress: viewerProfile?.connected_wallet_address,
    buyerAddress: custodyLink.buyer_address,
    sellerAddress: custodyLink.seller_address,
  });
  const state = resolveScreenState(custodyLink, operations);
  const copy = statusCopy(state.key);
  const steps = buildSteps(state.key);
  const buyerDisplayName = buyerProfile?.display_name ?? 'Buyer';
  const sellerDisplayName = sellerProfile?.display_name ?? 'Seller';
  const isBuyerActionAvailable =
    state.key === 'not_created' && roleResolution.role === 'buyer';
  const isSellerActionAvailable =
    state.key === 'awaiting_acceptance' && roleResolution.role === 'seller';

  return (
    <div className="min-h-screen bg-[var(--surface)] text-[var(--navy-900)]">
      <main className="field-container py-8">
        <div className="mb-6 flex flex-wrap items-center gap-3 text-sm">
          <Link href="/deals" className="inline-flex items-center text-[var(--text-secondary)] hover:text-[var(--green-700)]">
            <ArrowRight className="mr-2 h-4 w-4 rotate-180" />
            Back to deals
          </Link>
          <span className="rounded-full border border-[var(--green-200)] bg-[var(--green-50)] px-3 py-1 text-xs font-semibold text-[var(--green-800)]">
            Custody V2 · Stellar Testnet
          </span>
          <span className="rounded-full border border-[var(--border-subtle)] bg-white px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
            XLM settlement asset
          </span>
        </div>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_26rem]">
          <div className="space-y-6">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-[var(--navy-950)]">
                {deal.commodity}
              </h1>
              <p className="mt-3 text-base text-[var(--text-secondary)]">
                {buyerDisplayName} ↔ {sellerDisplayName}
              </p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                {(deal.volume_kg ?? 0).toLocaleString('id-ID')} kg · Commercial reference{' '}
                {formatIdr(deal.principal_idr)}
              </p>
            </div>

            <section className="rounded-3xl border border-[var(--border-subtle)] bg-white p-5 shadow-sm">
              <Stepper steps={steps} />
            </section>

            <section className="rounded-3xl border border-[var(--border-subtle)] bg-white p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--green-50)] text-[var(--green-700)]">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-2xl font-semibold text-[var(--navy-950)]">{copy.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{copy.body}</p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="text-xs font-semibold uppercase text-[var(--text-muted)]">
                      Connected wallet role
                    </div>
                    <div className="mt-1 text-lg font-semibold capitalize text-[var(--navy-950)]">
                      {roleResolution.role.replace('_', ' ')}
                    </div>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">{roleResolution.explanation}</p>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase text-[var(--text-muted)]">
                      Connected wallet
                    </div>
                    <div className="mt-1 break-all font-mono text-sm text-[var(--navy-900)]">
                      {viewerProfile?.connected_wallet_address ?? 'No wallet linked on this profile'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                {state.key === 'not_created' ? (
                  <CustodyV2ActionPanel
                    dealId={deal.id}
                    actionType="CREATE_DEAL"
                    label="Create on Stellar"
                    expectedWalletAddress={custodyLink.buyer_address}
                    disabled={!isBuyerActionAvailable}
                    disabledReason={
                      roleResolution.role === 'seller'
                        ? 'Waiting for the buyer to create this deal on Stellar.'
                        : roleResolution.role === 'buyer'
                          ? undefined
                          : roleResolution.explanation
                    }
                  />
                ) : null}

                {state.key === 'create_pending' ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Buyer creation is pending confirmation.
                    {state.createSubmitted?.transaction_hash ? (
                      <span className="mt-2 block break-all font-mono text-xs">
                        {state.createSubmitted.transaction_hash}
                      </span>
                    ) : null}
                  </div>
                ) : null}

                {state.key === 'awaiting_acceptance' ? (
                  <CustodyV2ActionPanel
                    dealId={deal.id}
                    actionType="ACCEPT_TERMS"
                    label="Accept terms on Stellar"
                    expectedWalletAddress={custodyLink.seller_address}
                    disabled={!isSellerActionAvailable}
                    disabledReason={
                      roleResolution.role === 'buyer'
                        ? 'Waiting for the seller to accept the same terms on Stellar.'
                        : roleResolution.role === 'seller'
                          ? undefined
                          : roleResolution.explanation
                    }
                  />
                ) : null}

                {state.key === 'accept_pending' ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Seller acceptance is pending confirmation.
                    {state.acceptSubmitted?.transaction_hash ? (
                      <span className="mt-2 block break-all font-mono text-xs">
                        {state.acceptSubmitted.transaction_hash}
                      </span>
                    ) : null}
                  </div>
                ) : null}

                {state.key === 'awaiting_funding' ? (
                  <div className="rounded-2xl border border-[var(--green-200)] bg-[var(--green-50)] px-4 py-3 text-sm text-[var(--green-900)]">
                    Buyer creation and seller acceptance are confirmed. Funding actions are
                    intentionally not available in Recovery Milestone 1.
                  </div>
                ) : null}
              </div>
            </section>

            <section className="rounded-3xl border border-[var(--border-subtle)] bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <FileText className="h-5 w-5 text-[var(--green-700)]" />
                <h2 className="text-xl font-semibold text-[var(--navy-950)]">Commercial Terms</h2>
              </div>
              <div className="grid gap-3 text-sm md:grid-cols-2">
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-4">
                  <div className="text-[var(--text-muted)]">Product</div>
                  <div className="mt-1 font-semibold">{deal.commodity}</div>
                </div>
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-4">
                  <div className="text-[var(--text-muted)]">Quantity</div>
                  <div className="mt-1 font-semibold">{deal.volume_kg?.toLocaleString('id-ID') ?? 'Pending'} kg</div>
                </div>
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-4">
                  <div className="text-[var(--text-muted)]">Commercial IDR reference</div>
                  <div className="mt-1 font-semibold">{formatIdr(deal.principal_idr)}</div>
                </div>
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-4">
                  <div className="text-[var(--text-muted)]">Terms hash</div>
                  <div className="mt-1 break-all font-mono text-xs">{custodyLink.terms_hash}</div>
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-[var(--green-200)] bg-[var(--green-50)] p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <WalletCards className="h-6 w-6 text-[var(--green-700)]" />
                <h2 className="text-xl font-semibold text-[var(--navy-950)]">Aurora Assurance Rail</h2>
              </div>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-[var(--text-secondary)]">Principal</span>
                  <span className="font-semibold">{formatXlm(custodyLink.principal_base_units)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[var(--text-secondary)]">Buyer commitment bond</span>
                  <span className="font-semibold">{formatXlm(custodyLink.buyer_bond_base_units)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[var(--text-secondary)]">Seller performance bond</span>
                  <span className="font-semibold">{formatXlm(custodyLink.seller_bond_base_units)}</span>
                </div>
                <div className="border-t border-[var(--green-200)] pt-4">
                  <div className="flex justify-between gap-4">
                    <span className="text-[var(--text-secondary)]">Contract state</span>
                    <span className="font-semibold">{custodyLink.latest_contract_state}</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-[var(--border-subtle)] bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <BadgeCheck className="h-5 w-5 text-[var(--green-700)]" />
                <h2 className="text-xl font-semibold text-[var(--navy-950)]">Participants</h2>
              </div>
              <div className="space-y-3 text-sm">
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-4">
                  <div className="font-semibold">{buyerDisplayName}</div>
                  <div className="mt-1 text-xs text-[var(--text-muted)]">Buyer wallet</div>
                  <div className="mt-1 font-mono text-xs">{shortAddress(custodyLink.buyer_address)}</div>
                </div>
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-4">
                  <div className="font-semibold">{sellerDisplayName}</div>
                  <div className="mt-1 text-xs text-[var(--text-muted)]">Seller wallet</div>
                  <div className="mt-1 font-mono text-xs">{shortAddress(custodyLink.seller_address)}</div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-[var(--border-subtle)] bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <Copy className="h-5 w-5 text-[var(--green-700)]" />
                <h2 className="text-xl font-semibold text-[var(--navy-950)]">Stellar References</h2>
              </div>
              <div className="space-y-3 text-xs">
                <div>
                  <div className="font-semibold text-[var(--text-muted)]">Contract ID</div>
                  <div className="mt-1 break-all font-mono">{custodyLink.contract_id}</div>
                </div>
                <div>
                  <div className="font-semibold text-[var(--text-muted)]">Contract deal ID</div>
                  <div className="mt-1 break-all font-mono">{custodyLink.contract_deal_id}</div>
                </div>
                <div>
                  <div className="font-semibold text-[var(--text-muted)]">Asset</div>
                  <div className="mt-1 font-semibold">Native XLM SAC · Stellar Testnet</div>
                  <div className="mt-1 break-all font-mono">{custodyLink.asset_contract_id}</div>
                </div>
                {custodyLink.last_confirmed_ledger ? (
                  <div className="flex items-center gap-2 text-[var(--green-700)]">
                    <Clock3 className="h-4 w-4" />
                    Last confirmed ledger {custodyLink.last_confirmed_ledger}
                  </div>
                ) : null}
              </div>
            </section>
          </aside>
        </section>
      </main>
    </div>
  );
}
