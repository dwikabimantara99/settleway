'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { CopyWalletAddressButton } from '@/components/profile/CopyWalletAddressButton';
import type { UserWallet } from '@/lib/types';

export function ProfileWalletCard({ userId }: { userId: string }) {
  const [wallet, setWallet] = useState<UserWallet | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [funding, setFunding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = async (publicAddress: string) => {
    try {
      const horizonRes = await fetch(`https://horizon-testnet.stellar.org/accounts/${publicAddress}`);
      if (horizonRes.ok) {
        const accountData = await horizonRes.json();
        const xlmBalance = accountData.balances?.find((b: { asset_type: string; balance: string }) => b.asset_type === 'native');
        if (xlmBalance) {
          setBalance(`${parseFloat(xlmBalance.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} XLM`);
        }
      } else {
        setBalance('0.00 XLM');
      }
    } catch (err) {
      console.error('Failed to fetch balance', err);
      setBalance('Unavailable');
    }
  };

  const fundWithFriendbot = async () => {
    if (!wallet) return;
    setFunding(true);
    try {
      const res = await fetch(`https://friendbot.stellar.org/?addr=${wallet.publicAddress}`);
      if (res.ok) {
        await fetchBalance(wallet.publicAddress);
      } else {
        setError('Friendbot funding failed. Please try again later.');
      }
    } catch {
      setError('Friendbot is currently unreachable.');
    } finally {
      setFunding(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    async function loadWallet() {
      try {
        const res = await fetch(`/api/profiles/${userId}/wallet`);
        if (!res.ok) {
          if (mounted) setError('Wallet is not initialized yet or configuration is missing.');
          if (mounted) setLoading(false);
          return;
        }
        const data: UserWallet = await res.json();
        if (mounted) setWallet(data);

        if (mounted) {
          await fetchBalance(data.publicAddress);
        }
      } catch (err) {
        console.error(err);
        if (mounted) setError('Failed to provision or load managed profile wallet.');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadWallet();
    return () => { mounted = false; };
  }, [userId]);

  if (loading) {
    return (
      <div className="mt-5 max-w-xl rounded-xl border border-slate-200 bg-white/90 p-5 shadow-sm flex items-center justify-center min-h-[120px]">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error || !wallet) {
    return (
      <div className="mt-5 max-w-xl rounded-xl border border-red-200 bg-red-50 p-5 shadow-sm">
        <p className="text-sm text-red-600">{error || 'Wallet not available'}</p>
      </div>
    );
  }

  return (
    <div className="mt-5 max-w-xl rounded-xl border border-slate-200 bg-white/90 p-5 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
        <ShieldCheck className="h-4 w-4 text-emerald-600" />
        Settleway Profile Wallet
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700 font-semibold">
          Testnet
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-lg bg-slate-50 pl-3 border border-slate-100">
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-slate-700 sm:text-sm py-2">
          {wallet.publicAddress}
        </span>
        <CopyWalletAddressButton address={wallet.publicAddress} />
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
        <div>
          <span className="block text-xs font-medium text-slate-500 uppercase tracking-wider">Balance</span>
          <span className={`block font-semibold ${balance === '0.00 XLM' ? 'text-amber-600' : 'text-slate-900'}`}>
            {balance || <Loader2 className="h-4 w-4 animate-spin mt-1 text-slate-400" />}
          </span>
        </div>

        {balance === '0.00 XLM' && (
          <div className="text-right max-w-[220px] flex flex-col items-end gap-2">
             <span className="block text-[11px] text-slate-500 leading-tight">
               No balance detected yet. Send testnet XLM to this address to fund your Settleway Profile Wallet.
             </span>
             <button
               onClick={fundWithFriendbot}
               disabled={funding}
               className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-md font-medium hover:bg-emerald-100 disabled:opacity-50 flex items-center gap-2 transition-colors"
             >
               {funding ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
               Fund via Friendbot (Testnet)
             </button>
          </div>
        )}
      </div>

      <p className="mt-3 text-[11px] leading-5 text-slate-400 bg-slate-50 p-2 rounded-md">
        Managed by Settleway for protected Testnet transaction activity. Deal Room deposits will be withdrawn from this Profile Wallet balance.
      </p>
    </div>
  );
}
