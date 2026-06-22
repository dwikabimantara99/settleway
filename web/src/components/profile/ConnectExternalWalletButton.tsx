'use client';

import { CheckCircle2, Link2, Loader2, Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  getFreighterApi,
  isTestnetNetwork,
  readStringResult,
  shortenStellarAddress,
} from '@/lib/stellar/freighter-client';

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
  const router = useRouter();
  const [address, setAddress] = useState(initialAddress);
  const [provider, setProvider] = useState(initialProvider ?? 'Freighter');
  const [network, setNetwork] = useState<'testnet' | null>(initialNetwork);
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleConnect = async () => {
    setIsConnecting(true);
    setErrorMessage(null);

    try {
      const freighter = await getFreighterApi();
      if (!freighter) {
        setErrorMessage('Settleway could not load the Freighter browser bridge. Refresh the page and confirm Freighter is enabled for this site.');
        return;
      }

      if (freighter.isConnected) {
        const connected = await freighter.isConnected();
        const connectedValue =
          typeof connected === 'object' && connected !== null
            ? connected.isConnected ?? connected.connected
            : connected;
        if (connectedValue === false) {
          setErrorMessage('Stellar wallet is not connected yet.');
          return;
        }
      }

      const accessResult = freighter.requestAccess ? await freighter.requestAccess() : null;
      const addressResult = freighter.getAddress
        ? await freighter.getAddress()
        : freighter.getPublicKey
          ? await freighter.getPublicKey()
          : accessResult;
      const nextAddress = readStringResult(addressResult, [
        'address',
        'publicKey',
        'public_key',
      ]);

      if (!nextAddress) {
        setErrorMessage('Unable to read a public Stellar address from the wallet.');
        return;
      }

      const networkResult = freighter.getNetworkDetails
        ? await freighter.getNetworkDetails()
        : freighter.getNetwork
          ? await freighter.getNetwork()
          : null;

      if (!isTestnetNetwork(networkResult)) {
        setErrorMessage('Switch your Stellar wallet to Testnet before linking it.');
        return;
      }

      const response = await fetch(`/api/profiles/${profileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connected_wallet_address: nextAddress,
          connected_wallet_network: 'testnet',
          connected_wallet_provider: 'Freighter',
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErrorMessage(payload?.error?.message ?? 'Unable to link wallet.');
        return;
      }

      setAddress(nextAddress);
      setProvider('Freighter');
      setNetwork('testnet');
      router.refresh();
    } catch {
      setErrorMessage('Unable to connect wallet right now.');
    } finally {
      setIsConnecting(false);
    }
  };

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

      {canConnect ? (
        <button
          type="button"
          onClick={handleConnect}
          disabled={isConnecting}
          className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isConnecting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Link2 className="mr-2 h-4 w-4" />
          )}
          {address ? 'Reconnect Wallet' : 'Connect Stellar Wallet'}
        </button>
      ) : null}

      {errorMessage ? (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
