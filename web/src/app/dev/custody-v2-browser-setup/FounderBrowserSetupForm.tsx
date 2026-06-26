'use client';

import { useState } from 'react';
import { ArrowRight, Copy, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface SetupResult {
  deal_id: string;
  deal_room_url: string;
  buyer_profile_id: string;
  seller_profile_id: string;
  buyer_address: string;
  seller_address: string;
  contract_id: string;
  settlement_asset: string;
  asset_contract_id: string;
  terms_hash: string;
  contract_deal_id: string;
}

export function FounderBrowserSetupForm() {
  const [buyerAddress, setBuyerAddress] = useState('');
  const [sellerAddress, setSellerAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SetupResult | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/dev/custody-v2-browser-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyer_address: buyerAddress, seller_address: sellerAddress }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setError(payload.error?.message ?? 'Founder browser setup failed.');
        return;
      }
      setResult(payload.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function copyUrl() {
    if (!result) return;
    await navigator.clipboard.writeText(result.deal_room_url);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <form onSubmit={handleSubmit} className="aurora-surface p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--green-50)] text-[var(--green-700)]">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-2xl font-semibold text-[var(--navy-900)]">
              Create Custody V2 browser-test deal
            </h2>
            <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
              Paste the public Testnet addresses from the buyer and seller Freighter profiles. The
              setup creates a new shared Deal Room; it never reuses the legacy demo room.
            </p>
          </div>
        </div>

        <div className="mt-7 grid gap-5">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-[var(--navy-900)]">
              Buyer public Stellar address
            </span>
            <input
              value={buyerAddress}
              onChange={(event) => setBuyerAddress(event.target.value)}
              placeholder="G..."
              className="min-h-12 rounded-[var(--radius-control)] border border-[var(--border-default)] bg-white px-4 font-mono text-sm text-[var(--navy-900)] outline-none transition focus:border-[var(--green-500)] focus:ring-2 focus:ring-[var(--green-100)]"
              autoComplete="off"
              spellCheck={false}
              required
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-[var(--navy-900)]">
              Seller public Stellar address
            </span>
            <input
              value={sellerAddress}
              onChange={(event) => setSellerAddress(event.target.value)}
              placeholder="G..."
              className="min-h-12 rounded-[var(--radius-control)] border border-[var(--border-default)] bg-white px-4 font-mono text-sm text-[var(--navy-900)] outline-none transition focus:border-[var(--green-500)] focus:ring-2 focus:ring-[var(--green-100)]"
              autoComplete="off"
              spellCheck={false}
              required
            />
          </label>
        </div>

        {error ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-7">
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Custody V2 Deal'}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </form>

      <aside className="aurora-command p-6">
        <div className="text-xs font-semibold uppercase text-[var(--green-700)]">
          Runtime target
        </div>
        <h3 className="mt-2 text-xl font-semibold text-[var(--navy-900)]">
          Custody V2 · Stellar Testnet
        </h3>
        <div className="mt-5 grid gap-3 text-sm">
          <div>
            <div className="text-xs font-semibold uppercase text-[var(--text-muted)]">Contract</div>
            <div className="mt-1 break-all font-mono text-xs text-[var(--text-secondary)]">
              CAFNVEVKN7QN5VHLOB6QPOZ66GHH5XINWM6PXOP7QJW5WUIYEJVQIVM4
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase text-[var(--text-muted)]">Asset</div>
            <div className="mt-1 text-[var(--text-secondary)]">XLM native SAC on Stellar Testnet</div>
          </div>
        </div>
      </aside>

      {result ? (
        <section className="aurora-feature-surface p-6 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase text-[var(--green-700)]">
                Browser corridor ready
              </div>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--navy-900)]">
                Open this same Deal Room URL in both Edge profiles
              </h2>
            </div>
            <Button type="button" variant="outline" onClick={copyUrl}>
              <Copy className="h-4 w-4" />
              Copy URL
            </Button>
          </div>
          <a
            href={result.deal_room_url}
            className="mt-5 block break-all rounded-2xl border border-[var(--border-default)] bg-white px-4 py-4 font-mono text-sm text-[var(--navy-900)] hover:border-[var(--green-300)]"
          >
            {result.deal_room_url}
          </a>
          <div className="mt-5 grid gap-3 text-xs text-[var(--text-secondary)] md:grid-cols-2">
            <div className="break-all">Terms hash: {result.terms_hash}</div>
            <div className="break-all">Contract deal ID: {result.contract_deal_id}</div>
            <div className="break-all">Buyer: {result.buyer_address}</div>
            <div className="break-all">Seller: {result.seller_address}</div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
