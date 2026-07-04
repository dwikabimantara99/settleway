'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import {
  getFreighterApi,
  isTestnetNetwork,
  readStringResult,
  type FreighterResult,
} from '@/lib/stellar/freighter-client';
import type { CustodyV2ActionType } from '@/lib/db/types';

interface CustodyV2ActionPanelProps {
  dealId: string;
  actionType: Extract<
    CustodyV2ActionType,
    'CREATE_DEAL' | 'ACCEPT_TERMS' | 'FUND_BUYER' | 'FUND_SELLER' | 'SUBMIT_EVIDENCE' | 'ACCEPT_DELIVERY'
  >;
  label: string;
  expectedWalletAddress: string;
  evidenceHash?: string;
  disabled?: boolean;
  disabledReason?: string;
}

type ActionStage =
  | 'idle'
  | 'checking-wallet'
  | 'preparing'
  | 'signing'
  | 'submitting'
  | 'confirming'
  | 'confirmed';

function extractSignedXdr(value: FreighterResult): string | null {
  return readStringResult(value, ['signedTxXdr', 'signed_xdr', 'xdr']) ??
    (typeof value === 'string' ? value : null);
}

export function CustodyV2ActionPanel({
  dealId,
  actionType,
  label,
  expectedWalletAddress,
  evidenceHash,
  disabled = false,
  disabledReason,
}: CustodyV2ActionPanelProps) {
  const router = useRouter();
  const [stage, setStage] = useState<ActionStage>('idle');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const busy = stage !== 'idle' && stage !== 'confirmed';

  if (disabled) {
    return (
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-3 text-sm text-[var(--text-secondary)]">
        {disabledReason ?? 'This Stellar action is not available for the connected wallet or current deal state.'}
      </div>
    );
  }

  const runAction = async () => {
    setError(null);
    setNotice(null);
    setTxHash(null);

    try {
      setStage('checking-wallet');
      const freighter = await getFreighterApi();
      if (!freighter?.signTransaction) {
        throw new Error('Freighter is required for this Stellar action.');
      }

      const accessResult = freighter.requestAccess ? await freighter.requestAccess() : null;
      const addressResult = freighter.getAddress
        ? await freighter.getAddress()
        : freighter.getPublicKey
          ? await freighter.getPublicKey()
          : accessResult;
      const activeAddress = readStringResult(addressResult, ['address', 'publicKey', 'public_key']);

      if (activeAddress !== expectedWalletAddress) {
        throw new Error('Switch Freighter to the wallet address bound to your role in this deal.');
      }

      const networkResult = freighter.getNetworkDetails
        ? await freighter.getNetworkDetails()
        : freighter.getNetwork
          ? await freighter.getNetwork()
          : null;

      if (networkResult && !isTestnetNetwork(networkResult)) {
        throw new Error('Switch Freighter to Stellar Testnet before signing.');
      }

      setStage('preparing');
      const prepareResponse = await fetch(`/api/deals/${dealId}/custody-v2/prepare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_type: actionType,
          actor_address: expectedWalletAddress,
          evidence_hash: evidenceHash,
        }),
      });
      const prepared = await prepareResponse.json();
      if (!prepareResponse.ok || !prepared.ok) {
        throw new Error(prepared.error?.message || 'Protected escrow preparation failed.');
      }

      setStage('signing');
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
      const submitResponse = await fetch(`/api/deals/${dealId}/custody-v2/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idempotency_key: prepared.data.operation.idempotency_key,
          signed_xdr: signedXdr,
        }),
      });
      const submitted = await submitResponse.json();
      if (!submitResponse.ok || !submitted.ok) {
        throw new Error(submitted.error?.message || 'Protected escrow submission failed.');
      }
      setTxHash(submitted.meta?.transaction_hash ?? submitted.data?.transaction_hash ?? null);

      setStage('confirming');
      let pendingMessage: string | null = null;
      for (let attempt = 0; attempt < 8; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, attempt === 0 ? 1200 : 2500));
        const confirmResponse = await fetch(`/api/deals/${dealId}/custody-v2/confirm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idempotency_key: prepared.data.operation.idempotency_key,
          }),
        });
        const confirmed = await confirmResponse.json();
        if (confirmResponse.status === 202) {
          pendingMessage = confirmed.meta?.message ??
            'Securing your transaction. Please wait while we sync the Deal Room.';
          router.refresh();
          continue;
        }
        if (!confirmResponse.ok || !confirmed.ok) {
          throw new Error(confirmed.error?.message || 'Protected escrow confirmation failed.');
        }
        setStage('confirmed');
        router.refresh();
        return;
      }

      setStage('idle');
      setNotice(pendingMessage ?? 'Transaction was submitted. Please wait while we sync the Deal Room.');
      router.refresh();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      setStage('idle');
      setError(message);
      if (message.includes('Local Deal Room state has been reconciled')) {
        router.refresh();
      }
    }
  };

  return (
    <div className="space-y-3">
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {notice}
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
        disabled={busy}
        className="w-full"
      >
        {busy
          ? stage === 'checking-wallet'
            ? 'Checking wallet...'
            : stage === 'preparing'
              ? 'Preparing transaction...'
              : stage === 'signing'
                ? 'Waiting for Freighter...'
                : stage === 'submitting'
                  ? 'Submitting securely...'
                  : 'Confirming transaction...'
          : label}
      </Button>
    </div>
  );
}
