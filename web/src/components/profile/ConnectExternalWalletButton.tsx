'use client';

import { CheckCircle2, Wallet } from 'lucide-react';
import { useState } from 'react';
import { shortenStellarAddress } from '@/lib/stellar/freighter-client';

interface ConnectExternalWalletButtonProps {
  profileId: string;
  initialAddress: string | null;
  initialProvider: string | null;
  initialNetwork: 'testnet' | null;
  canConnect: boolean;
}

export function ConnectExternalWalletButton({
  profileId,
  initialAddress,
  initialProvider,
  initialNetwork,
  canConnect,
}: ConnectExternalWalletButtonProps) {
  const [address, setAddress] = useState(initialAddress);
  const [provider, setProvider] = useState(initialProvider ?? 'Freighter');
  const [network, setNetwork] = useState<'testnet' | null>(initialNetwork);

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white/90 p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <Wallet className="h-4 w-4 text-emerald-600" />
            Connected Wallet
            {network === 'testnet' ? (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700">
                Testnet
              </span>
            ) : null}
          </div>
          <div className="mt-2 text-sm font-semibold text-slate-950">
            {address ? shortenStellarAddress(address) : 'No external wallet linked'}
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {address
              ? `${provider} is linked as this profile's external wallet.`
              : 'Link your personal Stellar Testnet wallet for the next funding phase.'}
          </p>
        </div>
        {address ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : null}
      </div>

      {!address && (
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Profile Wallets are generated and managed internally by Settleway. Manual external connections are not required.
        </div>
      )}
    </div>
  );
}
