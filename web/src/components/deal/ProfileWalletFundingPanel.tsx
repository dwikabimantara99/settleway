'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldCheck, WalletCards, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { UserWallet } from '@/lib/types';

export function ProfileWalletFundingPanel({
  dealId,
  viewerRole,
  userId,
  requiredAmountIdr,
  isFunded,
}: {
  dealId: string;
  viewerRole: 'buyer' | 'seller';
  userId: string;
  requiredAmountIdr: number;
  isFunded: boolean;
}) {
  const [wallet, setWallet] = useState<UserWallet | null>(null);
  const [balanceStr, setBalanceStr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    async function loadWallet() {
      try {
        const res = await fetch(`/api/profiles/${userId}/wallet`);
        if (!res.ok) throw new Error('Failed to load wallet');
        const data: UserWallet = await res.json();
        if (mounted) setWallet(data);

        try {
          const horizonRes = await fetch(`https://horizon-testnet.stellar.org/accounts/${data.publicAddress}`);
          if (horizonRes.ok) {
            const accountData = await horizonRes.json();
            const xlmBalance = accountData.balances?.find((b: { asset_type: string; balance: string }) => b.asset_type === 'native');
            if (mounted && xlmBalance) {
              setBalanceStr(xlmBalance.balance);
            }
          } else {
            if (mounted) setBalanceStr('0.00');
          }
        } catch {
          if (mounted) setBalanceStr('0.00');
        }
      } catch {
        if (mounted) setError('Could not load Profile Wallet.');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadWallet();
    return () => { mounted = false; };
  }, [userId]);

  const handleSubmitDeposit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/deals/${dealId}/${viewerRole}-deposit`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Deposit failed');
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error || !wallet) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
        <p className="text-sm text-red-600">{error || 'Wallet not available'}</p>
      </div>
    );
  }

  const balanceNum = parseFloat(balanceStr || '0');
  // For demo purposes, we will assume 1 XLM = Rp 15,000 to determine if they have enough balance.
  // In a real app, we would have a reliable price feed or strictly use fiat/stablecoins.
  const estimatedBalanceIdr = balanceNum * 15000; 
  const isInsufficient = estimatedBalanceIdr < requiredAmountIdr;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-950">Deposit from Profile Wallet</h2>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
          <ShieldCheck className="h-4 w-4" />
          Settleway Managed
        </span>
      </div>

      <div className="space-y-6">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white border border-slate-200 shadow-sm">
              <WalletCards className="h-5 w-5 text-slate-500" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">Profile Wallet Balance</span>
                <span className="text-sm font-semibold text-slate-900">{balanceStr} XLM</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                <span className="truncate pr-4 font-mono">{wallet.publicAddress}</span>
                <span>≈ Rp {estimatedBalanceIdr.toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-6">
          <div>
            <div className="text-sm font-medium text-slate-500">Total Required</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">
              Rp {requiredAmountIdr.toLocaleString('id-ID')}
            </div>
          </div>

          <div className="text-right">
            {isFunded ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-sm font-semibold text-emerald-800">
                <CheckCircle2 className="h-4 w-4" />
                Deposit Completed
              </span>
            ) : isInsufficient ? (
              <div className="flex flex-col items-end gap-2">
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                  Insufficient balance
                </span>
                <span className="text-xs text-slate-500">Top up your Profile Wallet to fund this deal.</span>
              </div>
            ) : (
              <button
                onClick={handleSubmitDeposit}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Authorize Deposit
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
