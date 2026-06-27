import Link from 'next/link';
import { ArrowRight, Handshake, ShieldCheck } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/server';
import { repository } from '@/lib/repositories';
import type { DbDeal } from '@/lib/db/types';

function formatCurrency(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

function formatState(deal: DbDeal, custodyState: string | null): string {
  if (deal.rail_version === 'custody_v2_testnet') {
    if (custodyState === 'AwaitingFunding') return 'Awaiting funding';
    if (custodyState === 'TermsPending') return 'On-chain terms pending';
    return custodyState ?? 'Custody V2 setup';
  }
  return deal.status.replace(/_/g, ' ');
}

function nextAction(deal: DbDeal, custodyState: string | null, role: 'buyer' | 'seller'): string {
  if (deal.rail_version === 'custody_v2_testnet') {
    if (custodyState === 'TermsPending') {
      return role === 'buyer' ? 'Create on Stellar' : 'Wait for buyer creation';
    }
    if (custodyState === 'AwaitingFunding') return 'Funding opens in Milestone 2';
    return 'Review Deal Room';
  }

  return 'Review legacy demo room';
}

export default async function DealsIndexPage() {
  const currentUser = await getCurrentUser();
  const deals = currentUser ? await repository.listDealsForParticipant(currentUser.id) : [];
  const rows = await Promise.all(
    deals.map(async (deal) => ({
      deal,
      custodyLink: deal.rail_version === 'custody_v2_testnet'
        ? await repository.getCustodyDealLink(deal.id)
        : null,
      role: currentUser?.id === deal.buyer_id ? 'buyer' as const : 'seller' as const,
      counterparty: await repository.getProfile(
        currentUser?.id === deal.buyer_id ? deal.seller_id : deal.buyer_id,
      ),
    })),
  );

  return (
    <div className="min-h-screen bg-[var(--surface)] text-[var(--navy-900)]">
      <main className="field-container py-10">
        <div className="max-w-3xl">
          <p className="aurora-kicker">Deal discovery</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-[var(--navy-950)]">
            Deals
          </h1>
          <p className="mt-3 text-base leading-7 text-[var(--text-secondary)]">
            Reopen active trade rooms from one place. Custody V2 rooms are created only from
            accepted terms and keep one shared URL for buyer and seller.
          </p>
        </div>

        {rows.length === 0 ? (
          <section className="mt-8 rounded-3xl border border-[var(--border-subtle)] bg-white p-8 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--green-50)] text-[var(--green-700)]">
                <Handshake className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-[var(--navy-950)]">No deals yet</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
                  Start from Buy or Sell, submit an offer, agree the terms, and mutually open the
                  room. The resulting deal will appear here.
                </p>
              </div>
            </div>
          </section>
        ) : (
          <section className="mt-8 grid gap-4">
            {rows.map(({ deal, custodyLink, role, counterparty }) => (
              <Link
                key={deal.id}
                href={`/deals/${deal.id}`}
                className="group rounded-3xl border border-[var(--border-subtle)] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-[var(--green-200)] bg-[var(--green-50)] px-3 py-1 text-xs font-semibold text-[var(--green-800)]">
                        {deal.rail_version === 'custody_v2_testnet'
                          ? 'Custody V2 · Stellar Testnet'
                          : 'Legacy demo'}
                      </span>
                      <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                        {role === 'buyer' ? 'Buyer role' : 'Seller role'}
                      </span>
                    </div>
                    <h2 className="mt-3 text-xl font-semibold text-[var(--navy-950)]">
                      {deal.commodity}
                    </h2>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      Counterparty: {counterparty?.display_name ?? 'Counterparty'} ·{' '}
                      {deal.volume_kg?.toLocaleString('id-ID') ?? 'Pending'} kg ·{' '}
                      {formatCurrency(deal.principal_idr)}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[var(--navy-800)]">
                      {formatState(deal, custodyLink?.latest_contract_state ?? null)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-4 md:min-w-64">
                    <div>
                      <div className="text-xs font-semibold uppercase text-[var(--text-muted)]">
                        Next action
                      </div>
                      <div className="mt-1 text-sm font-semibold text-[var(--green-700)]">
                        {nextAction(deal, custodyLink?.latest_contract_state ?? null, role)}
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-[var(--green-700)] transition group-hover:translate-x-1" />
                  </div>
                </div>
                {custodyLink ? (
                  <div className="mt-4 flex items-center gap-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-3 text-xs text-[var(--text-secondary)]">
                    <ShieldCheck className="h-4 w-4 text-[var(--green-700)]" />
                    Contract deal ID: <span className="font-mono">{custodyLink.contract_deal_id}</span>
                  </div>
                ) : null}
              </Link>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
