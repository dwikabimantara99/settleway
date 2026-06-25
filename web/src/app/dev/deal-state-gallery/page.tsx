import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { AuthenticatedHeader } from '@/components/layout/AuthenticatedHeader';
import { StatusPill } from '@/components/ui/StatusPill';
import {
  DEAL_STATE_GALLERY_STATUSES,
  getDealStateGalleryFixtureId,
  isDealStateGalleryEnabled,
} from '@/lib/deal-state-gallery';

function formatStateLabel(status: string): string {
  return status
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function DealStateGalleryPage() {
  if (!isDealStateGalleryEnabled()) {
    notFound();
  }

  return (
    <div className="aurora-canvas min-h-screen pb-16">
      <AuthenticatedHeader />
      <main className="field-container pt-10">
        <div className="rounded-[2rem] border border-[var(--border-subtle)] bg-white p-6 shadow-[var(--shadow-soft)] sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--azure-200)] bg-[var(--azure-50)] px-3 py-1.5 text-xs font-semibold text-[var(--azure-700)]">
            <ShieldCheck className="h-4 w-4" />
            Development visual fixtures
          </div>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-[var(--navy-900)]">
            Aurora Deal Room State Gallery
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--text-secondary)]">
            Deterministic, development-only Deal Room fixtures for final visual acceptance. These
            links render through the normal production Deal Room route and are not live Testnet
            transactions.
          </p>
        </div>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {DEAL_STATE_GALLERY_STATUSES.map((status) => {
            const fixtureId = getDealStateGalleryFixtureId(status);
            return (
              <Link
                key={status}
                href={`/deals/${fixtureId}`}
                className="group rounded-[1.5rem] border border-[var(--border-subtle)] bg-white p-5 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:border-[var(--green-200)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <StatusPill status={status} />
                  <ArrowRight className="h-4 w-4 text-[var(--text-muted)] transition group-hover:translate-x-1 group-hover:text-[var(--green-700)]" />
                </div>
                <h2 className="mt-4 text-xl font-semibold text-[var(--navy-900)]">
                  {formatStateLabel(status)}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  Opens the deterministic fixture route for this exact Deal Room state.
                </p>
                <div className="mt-4 break-all rounded-xl bg-[var(--surface-subtle)] px-3 py-2 font-mono text-xs text-[var(--text-muted)]">
                  {fixtureId}
                </div>
              </Link>
            );
          })}
        </section>
      </main>
    </div>
  );
}
