'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import {
  getFreighterApi,
  readStringResult,
  type FreighterResult,
} from '@/lib/stellar/freighter-client';

interface ManagedCustodyActionPanelProps {
  dealId: string;
  expectedWalletAddress: string;
  disabled?: boolean;
  disabledReason?: string;
}

type ActionStage =
  | 'idle'
  | 'checking-wallet'
  | 'preparing'
  | 'signing'
  | 'submitting'
  | 'confirmed';

function extractSignedXdr(value: FreighterResult): string | null {
  return readStringResult(value, ['signedTxXdr', 'signed_xdr', 'xdr']) ??
    (typeof value === 'string' ? value : null);
}

export function ManagedCustodyActionPanel({
  dealId,
  expectedWalletAddress,
  disabled = false,
  disabledReason,
}: ManagedCustodyActionPanelProps) {
  const router = useRouter();
  const [stage, setStage] = useState<ActionStage>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const busy = stage !== 'idle' && stage !== 'confirmed';

  if (disabled) {
    return (
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-3 text-sm text-[var(--text-secondary)]">
        {disabledReason || 'Action not available at this time.'}
      </div>
    );
  }

  const runAction = async () => {
    try {
      setBusy(true);
      setError(null);
      setTxHash(null);

      if (!expectedWalletAddress) {
        throw new Error('Please connect your Freighter wallet to continue.');
      }

      setStage('checking-wallet');
      const freighter = await getFreighterApi();
      if (!freighter) {
        throw new Error('Freighter wallet extension not found.');
      }
      if (!freighter.isConnected || !(await freighter.isConnected())) {
        throw new Error('Freighter wallet is not connected.');
      }

      if (!freighter.getAddress) {
        throw new Error('Freighter wallet getAddress not available.');
      }
      const addressResult = await freighter.getAddress();
      const address = readStringResult(addressResult, ['address', 'publicKey']) ?? (typeof addressResult === 'string' ? addressResult : null);
      if (address !== expectedWalletAddress) {
        throw new Error(`Connected wallet address does not match the expected address.`);
      }

      setStage('preparing');
      const prepareResponse = await fetch(`/api/deals/${dealId}/managed-custody/fund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actor_address: expectedWalletAddress }),
      });
      const prepared = await prepareResponse.json();
      if (!prepareResponse.ok || !prepared.ok) {
        throw new Error(prepared.error?.message || 'Preparation failed.');
      }

      setStage('signing');
      if (!freighter.signTransaction) {
        throw new Error('Freighter wallet signTransaction not available.');
      }
      const signedResult = await freighter.signTransaction(prepared.data.unsigned_xdr, {
        networkPassphrase: prepared.data.network_passphrase,
        accountToSign: expectedWalletAddress,
        address: expectedWalletAddress,
      });
      const signedXdr = extractSignedXdr(signedResult);
      if (!signedXdr) {
        throw new Error('Freighter did not return a signed transaction.');
      }

      setStage('submitting');
      const submitResponse = await fetch(`/api/deals/${dealId}/managed-custody/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signed_xdr: signedXdr }),
      });
      const submitted = await submitResponse.json();
      if (!submitResponse.ok || !submitted.ok) {
        throw new Error(submitted.error?.message || 'Submission failed.');
      }
      
      setTxHash(submitted.data?.transaction_hash ?? null);
      setStage('confirmed');
      router.refresh();
    } catch (err: unknown) {
      setStage('idle');
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  function setBusy(isBusy: boolean) {
    if (!isBusy && busy) setStage('idle');
  }

  return (
    <div className="space-y-3">
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <span className="font-semibold">Error:</span> {error}
        </div>
      ) : null}
      {txHash ? (
        <details className="rounded-2xl border border-[var(--border-subtle)] bg-white px-4 py-3 text-xs text-[var(--text-secondary)] group cursor-pointer hover:bg-slate-50 transition-colors">
          <summary className="font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] outline-none">Transaction Audit Trail</summary>
          <div className="mt-2 pt-2 border-t border-[var(--border-subtle)] break-all">
            ID: <span className="font-mono text-slate-500">{txHash}</span>
          </div>
        </details>
      ) : null}
      <Button
        variant="primary"
        onClick={runAction}
        disabled={busy || stage === 'confirmed'}
        className="w-full"
      >
        {stage === 'confirmed' 
          ? 'Funding Confirmed' 
          : busy
          ? stage === 'checking-wallet'
            ? 'Checking wallet...'
            : stage === 'preparing'
              ? 'Preparing transaction...'
              : stage === 'signing'
                ? 'Waiting for Freighter...'
                : stage === 'submitting'
                  ? 'Submitting securely...'
                  : 'Processing...'
          : 'Fund & Lock Escrow'}
      </Button>
    </div>
  );
}
