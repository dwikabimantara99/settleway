'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  CalendarDays,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Copy,
  ExternalLink,
  FileCheck2,
  Search,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react';
import {
  filterReputationRecords,
  reputationRecords,
  type ReputationRecord,
  type ReputationRoleFilter,
  type ReputationStatusFilter,
} from './reputation-page-model';

function SummaryCard({
  icon,
  title,
  value,
  detail,
  tone = 'green',
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  detail: string;
  tone?: 'green' | 'red';
}) {
  const red = tone === 'red';

  return (
    <div className="flex min-h-32 items-center gap-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div
        className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full ${
          red ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'
        }`}
      >
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-600">{title}</p>
        <p className={`mt-1 text-3xl font-bold ${red ? 'text-red-600' : 'text-emerald-700'}`}>
          {value}
        </p>
        <p className="mt-1 text-sm text-slate-500">{detail}</p>
      </div>
    </div>
  );
}

function FilterButton({
  active,
  children,
  danger = false,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-11 rounded-lg border px-5 text-sm font-semibold transition-colors ${
        active
          ? danger
            ? 'border-red-300 bg-red-50 text-red-600'
            : 'border-emerald-400 bg-emerald-50 text-emerald-700'
          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  );
}

function CopyHashButton({ hash }: { hash: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(hash);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label="Copy Stellar transaction hash"
      title={copied ? 'Copied' : 'Copy transaction hash'}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-r-lg border-l border-slate-200 bg-white text-slate-500 hover:text-emerald-700"
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

function ReputationRecordCard({ record }: { record: ReputationRecord }) {
  const successful = record.status === 'successful';

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                record.role === 'buyer'
                  ? 'bg-blue-50 text-blue-700'
                  : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              {record.role === 'buyer' ? 'Buyer' : 'Seller'}
            </span>
            <h2 className="text-lg font-bold text-slate-950 sm:text-xl">
              {record.commodity} <span className="text-slate-400">|</span> {record.volume}
            </h2>
          </div>

          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-500">
            <span className="inline-flex items-center gap-2">
              <Users className="h-4 w-4" />
              Counterparty: <strong className="font-medium text-slate-700">{record.counterparty}</strong>
            </span>
            <span className="inline-flex items-center gap-2">
              <CircleDollarSign className="h-4 w-4" />
              Est. Value: <strong className="font-medium text-slate-700">{record.value}</strong>
            </span>
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Date: <strong className="font-medium text-slate-700">{record.date}</strong>
            </span>
          </div>

          {record.failureReason ? (
            <p className="mt-3 flex items-center gap-2 text-sm font-medium text-red-600">
              <XCircle className="h-4 w-4" />
              Reason: {record.failureReason}
            </p>
          ) : null}
        </div>

        <span
          className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
            successful ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
          }`}
        >
          {successful ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {successful ? 'Successful' : 'Failed'}
        </span>
      </div>

      <div className="mt-5 flex flex-col gap-3 xl:flex-row xl:items-center">
        <span className="shrink-0 text-sm font-medium text-slate-500">Testnet proof reference</span>
        <div className="flex min-w-0 flex-1 items-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          <span className="min-w-0 flex-1 truncate px-4 font-mono text-xs text-slate-600 sm:text-sm">
            {record.txHash}
          </span>
          <CopyHashButton hash={record.txHash} />
        </div>
        <a
          href={`https://stellar.expert/explorer/testnet/tx/${record.txHash}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-emerald-300 px-4 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
        >
          View Testnet reference
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </article>
  );
}

export function ReputationPageClient({ userId }: { userId: string }) {
  const [statusFilter, setStatusFilter] = useState<ReputationStatusFilter>('all');
  const [roleFilter, setRoleFilter] = useState<ReputationRoleFilter>('all');
  const [query, setQuery] = useState('');

  const filteredRecords = useMemo(() => {
    return filterReputationRecords({
      records: reputationRecords,
      statusFilter,
      roleFilter,
      query,
    });
  }, [query, roleFilter, statusFilter]);

  const successfulCount = reputationRecords.filter(
    (record) => record.status === 'successful',
  ).length;
  const failedCount = reputationRecords.length - successfulCount;
  const successRate = Math.round((successfulCount / reputationRecords.length) * 100);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-7">
        <Link
          href={`/profiles/${userId}`}
          className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
        >
          Back to profile
        </Link>
        <h1 className="mt-4 text-4xl font-bold text-slate-950 sm:text-5xl">Reputation</h1>
        <p className="mt-2 max-w-2xl text-base leading-7 text-slate-600">
          Review transaction outcomes, funding discipline, and Stellar Testnet proof references
          connected to this account.
        </p>
        <p className="mt-3 max-w-3xl rounded-2xl border border-[var(--azure-300)]/40 bg-white/70 px-4 py-3 text-sm leading-6 text-[var(--text-secondary)]">
          Reputation is presented as an outcome ledger. Testnet references are inspectable proof
          surfaces where available; they are not production custody or bank-settlement claims.
        </p>
      </div>

      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={<CheckCircle2 className="h-8 w-8" />}
          title="Successful Deals"
          value={`${successfulCount}`}
          detail="Completed verified outcomes"
        />
        <SummaryCard
          icon={<XCircle className="h-8 w-8" />}
          title="Failed Deals"
          value={`${failedCount}`}
          detail="Recorded failed outcomes"
          tone="red"
        />
        <SummaryCard
          icon={<TrendingUp className="h-8 w-8" />}
          title="Success Rate"
          value={`${successRate}%`}
          detail="Outcome-backed performance"
        />
        <SummaryCard
          icon={<FileCheck2 className="h-8 w-8" />}
          title="Total Verified Tx"
          value={`${reputationRecords.length}`}
          detail="Buyer + seller history"
        />
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-3">
            <FilterButton active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>
              All
            </FilterButton>
            <FilterButton
              active={statusFilter === 'successful'}
              onClick={() => setStatusFilter('successful')}
            >
              Successful
            </FilterButton>
            <FilterButton
              active={statusFilter === 'failed'}
              danger
              onClick={() => setStatusFilter('failed')}
            >
              Failed
            </FilterButton>
            <select
              value={roleFilter}
              onChange={(event) =>
                setRoleFilter(event.target.value as ReputationRoleFilter)
              }
              aria-label="Filter by role"
              className="h-11 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="all">All Roles</option>
              <option value="buyer">Buyer</option>
              <option value="seller">Seller</option>
            </select>
          </div>

          <label className="relative block w-full xl:max-w-lg">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search tx hash, product, or counterparty..."
              className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
          </label>
        </div>
      </section>

      <section className="mt-5 space-y-4" aria-live="polite">
        {filteredRecords.length > 0 ? (
          filteredRecords.map((record) => (
            <ReputationRecordCard key={record.id} record={record} />
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <p className="font-semibold text-slate-800">No matching reputation records</p>
            <p className="mt-1 text-sm text-slate-500">
              Adjust the filters or search term to review another outcome.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
