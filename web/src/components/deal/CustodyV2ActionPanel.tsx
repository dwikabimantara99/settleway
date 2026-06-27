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
  actionType: Extract<CustodyV2ActionType, 'CREATE_DEAL' | 'ACCEPT_TERMS'>;
  label: string;
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
  disabled = false,
  disabledReason,
}: CustodyV2ActionPanelProps) {
  const router = useRouter();
  const [stage, setStage] = useState<ActionStage>('idle');
  const [error, setError] = useState<string | null>(null);
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
        }),
      });
      const prepared = await prepareResponse.json();
      if (!prepareResponse.ok || !prepared.ok) {
        throw new Error(prepared.error?.message || 'Custody V2 preparation failed.');
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
        throw new Error(submitted.error?.message || 'Custody V2 submission failed.');
      }
      setTxHash(submitted.meta?.transaction_hash ?? submitted.data?.transaction_hash ?? null);

      setStage('confirming');
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
        if (confirmResponse.status === 202) continue;
        if (!confirmResponse.ok || !confirmed.ok) {
          throw new Error(confirmed.error?.message || 'Custody V2 confirmation failed.');
        }
        setStage('confirmed');
        router.refresh();
        return;
      }

      throw new Error('Transaction submitted but not confirmed yet. Refresh the Deal Room to check again.');
    } catch (caught) {
      setStage('idle');
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  };

  return (
    <div className="space-y-3">
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {txHash ? (
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-white px-4 py-3 text-xs text-[var(--text-secondary)]">
          Submitted transaction: <span className="font-mono">{txHash}</span>
        </div>
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
                  ? 'Submitting to Stellar...'
                  : 'Confirming on Stellar...'
          : label}
      </Button>
    </div>
  );
}
