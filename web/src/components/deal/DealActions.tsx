'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import type { DealStatus } from '@/lib/escrow/state-machine';
import type { CustodyV2ActionType, CustodyV2ContractState } from '@/lib/db/types';
import {
  isFundingWindowDealStatus,
} from '@/lib/escrow/state-machine';
import {
  getFreighterApi,
  isTestnetNetwork,
  readStringResult,
} from '@/lib/stellar/freighter-client';

interface DealActionsProps {
  dealId: string;
  status: DealStatus;
  viewerRole?: 'buyer' | 'seller' | null;
  connectedWalletAddress?: string | null;
  railVersion?: 'legacy_demo' | 'custody_v2_testnet';
  custodyV2State?: CustodyV2ContractState | null;
  custodyV2ConfirmedActions?: CustodyV2ActionType[];
  custodyV2EvidenceHash?: string | null;
}

function getActionLabel(action: string): string {
  switch (action) {
    case 'buyer-deposit':
      return 'Fund Buyer Commitment';
    case 'seller-deposit':
      return 'Fund Seller Commitment';
    case 'expire':
      return 'Expire Funding Window';
    case 'refund':
      return 'Record Pre-Lock Refund';
    case 'mark-delivered':
      return 'Confirm Delivery Milestone';
    case 'accept-delivery':
      return 'Confirm Receipt And Settle';
    default:
      return 'Run Action';
  }
}

function isFundingAction(action: string): action is 'buyer-deposit' | 'seller-deposit' {
  return action === 'buyer-deposit' || action === 'seller-deposit';
}

function toApiFundingAction(action: 'buyer-deposit' | 'seller-deposit') {
  return action === 'buyer-deposit' ? 'buyer_deposit' : 'seller_deposit';
}

export function getCustodyV2Action(input: {
  state: CustodyV2ContractState | null | undefined;
  viewerRole: 'buyer' | 'seller' | null | undefined;
  confirmedActions: CustodyV2ActionType[];
}): { actionType: CustodyV2ActionType; label: string } | null {
  const confirmed = new Set(input.confirmedActions);
  if (input.state === 'TermsPending') {
    if (input.viewerRole === 'buyer' && !confirmed.has('CREATE_DEAL')) {
      return { actionType: 'CREATE_DEAL', label: 'Create on Stellar' };
    }
    if (input.viewerRole === 'seller' && confirmed.has('CREATE_DEAL') && !confirmed.has('ACCEPT_TERMS')) {
      return { actionType: 'ACCEPT_TERMS', label: 'Accept terms on Stellar' };
    }
    return null;
  }
  if (input.state === 'AwaitingFunding') {
    if (input.viewerRole === 'buyer' && !confirmed.has('FUND_BUYER')) {
      return { actionType: 'FUND_BUYER', label: 'Fund principal + commitment bond' };
    }
    if (input.viewerRole === 'seller' && !confirmed.has('FUND_SELLER')) {
      return { actionType: 'FUND_SELLER', label: 'Fund performance bond' };
    }
    return { actionType: 'EXPIRE_FUNDING', label: 'Finalize funding expiry' };
  }
  if (input.state === 'Active' && input.viewerRole === 'seller' && !confirmed.has('SUBMIT_EVIDENCE')) {
    return { actionType: 'SUBMIT_EVIDENCE', label: 'Submit evidence on Stellar' };
  }
  if (input.state === 'EvidenceSubmitted' && input.viewerRole === 'buyer' && !confirmed.has('ACCEPT_DELIVERY')) {
    return { actionType: 'ACCEPT_DELIVERY', label: 'Accept delivery on Stellar' };
  }
  return null;
}

export function DealActions({
  dealId,
  status,
  viewerRole = null,
  connectedWalletAddress = null,
  railVersion = 'legacy_demo',
  custodyV2State = null,
  custodyV2ConfirmedActions = [],
  custodyV2EvidenceHash = null,
}: DealActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canTriggerBuyerDeposit = viewerRole === null || viewerRole === 'buyer';
  const canTriggerSellerDeposit = viewerRole === null || viewerRole === 'seller';
  const canTriggerProofMilestone = viewerRole === null || viewerRole === 'seller';
  const canTriggerAcceptance = viewerRole === null || viewerRole === 'buyer';
  const custodyV2Action = railVersion === 'custody_v2_testnet'
    ? getCustodyV2Action({
      state: custodyV2State,
      viewerRole,
      confirmedActions: custodyV2ConfirmedActions,
    })
    : null;

  const handleCustodyV2Action = async (actionType: CustodyV2ActionType) => {
    if (actionType === 'SUBMIT_EVIDENCE' && !custodyV2EvidenceHash) {
      setError('Record delivery evidence first, then submit its hash on Stellar Testnet.');
      return;
    }
    if (!connectedWalletAddress) {
      setError('Connect a Stellar Testnet wallet on your profile before using the Custody V2 rail.');
      return;
    }
    const freighter = await getFreighterApi();
    if (!freighter?.signTransaction) {
      setError('A Stellar wallet with transaction signing is required for Custody V2.');
      return;
    }
    const accessResult = freighter.requestAccess ? await freighter.requestAccess() : null;
    const addressResult = freighter.getAddress
      ? await freighter.getAddress()
      : freighter.getPublicKey
        ? await freighter.getPublicKey()
        : accessResult;
    const walletAddress = readStringResult(addressResult, ['address', 'publicKey', 'public_key']);
    if (walletAddress !== connectedWalletAddress) {
      setError('The active wallet must match the wallet linked on this profile.');
      return;
    }
    const networkResult = freighter.getNetworkDetails
      ? await freighter.getNetworkDetails()
      : freighter.getNetwork
        ? await freighter.getNetwork()
        : null;
    if (networkResult && !isTestnetNetwork(networkResult)) {
      setError('Switch your Stellar wallet to Testnet before using Custody V2.');
      return;
    }
    const prepareResponse = await fetch(`/api/deals/${dealId}/custody-v2/prepare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action_type: actionType,
        actor_address: connectedWalletAddress,
        ...(actionType === 'SUBMIT_EVIDENCE' ? { evidence_hash: custodyV2EvidenceHash } : {}),
      }),
    });
    const prepared = await prepareResponse.json();
    if (!prepareResponse.ok) {
      setError(`Error: ${prepared.error?.message || 'Custody V2 preparation failed'}`);
      return;
    }
    const signedResult = await freighter.signTransaction(prepared.data.unsigned_xdr, {
      networkPassphrase: prepared.data.network_passphrase,
      accountToSign: connectedWalletAddress,
      address: connectedWalletAddress,
    });
    const signedXdr = readStringResult(signedResult, ['signedTxXdr', 'signed_xdr', 'xdr']) ?? (
      typeof signedResult === 'string' ? signedResult : null
    );
    if (!signedXdr) {
      setError('The wallet did not return a signed transaction.');
      return;
    }
    const submitResponse = await fetch(`/api/deals/${dealId}/custody-v2/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idempotency_key: prepared.data.operation.idempotency_key,
        signed_xdr: signedXdr,
      }),
    });
    const submitted = await submitResponse.json();
    if (!submitResponse.ok) {
      setError(`Error: ${submitted.error?.message || 'Custody V2 submission failed'}`);
      return;
    }
    await fetch(`/api/deals/${dealId}/custody-v2/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idempotency_key: prepared.data.operation.idempotency_key,
      }),
    });
    router.refresh();
  };

  const handleSignedFunding = async (action: 'buyer-deposit' | 'seller-deposit') => {
    if (!connectedWalletAddress) {
      setError('Connect a Stellar Testnet wallet on your profile before funding.');
      return;
    }

    const freighter = await getFreighterApi();
    if (!freighter?.signTransaction) {
      setError('A Stellar wallet with transaction signing is required before funding can continue.');
      return;
    }

    const accessResult = freighter.requestAccess ? await freighter.requestAccess() : null;
    const addressResult = freighter.getAddress
      ? await freighter.getAddress()
      : freighter.getPublicKey
        ? await freighter.getPublicKey()
        : accessResult;
    const walletAddress = readStringResult(addressResult, ['address', 'publicKey', 'public_key']);

    if (walletAddress !== connectedWalletAddress) {
      setError('The active wallet must match the wallet linked on this profile.');
      return;
    }

    const networkResult = freighter.getNetworkDetails
      ? await freighter.getNetworkDetails()
      : freighter.getNetwork
        ? await freighter.getNetwork()
        : null;
    if (networkResult && !isTestnetNetwork(networkResult)) {
      setError('Switch your Stellar wallet to Testnet before funding.');
      return;
    }

    const apiAction = toApiFundingAction(action);
    const reconcileResponse = await fetch(`/api/deals/${dealId}/signed-funding/reconcile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: apiAction,
        source_address: connectedWalletAddress,
      }),
    });
    const reconciliation = await reconcileResponse.json();
    if (!reconcileResponse.ok) {
      setError(`Error: ${reconciliation.error?.message || 'Funding reconciliation failed'}`);
      return;
    }
    if (reconciliation.meta?.reconciled === true) {
      router.refresh();
      return;
    }

    const prepareResponse = await fetch(`/api/deals/${dealId}/signed-funding/prepare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: apiAction,
        source_address: connectedWalletAddress,
      }),
    });
    const prepared = await prepareResponse.json();
    if (!prepareResponse.ok) {
      setError(`Error: ${prepared.error?.message || 'Funding preparation failed'}`);
      return;
    }

    const signedResult = await freighter.signTransaction(prepared.data.unsigned_xdr, {
      networkPassphrase: prepared.data.network_passphrase,
      accountToSign: connectedWalletAddress,
      address: connectedWalletAddress,
    });
    const signedXdr = readStringResult(signedResult, ['signedTxXdr', 'signed_xdr', 'xdr']) ?? (
      typeof signedResult === 'string' ? signedResult : null
    );

    if (!signedXdr) {
      setError('The wallet did not return a signed transaction.');
      return;
    }

    const submitResponse = await fetch(`/api/deals/${dealId}/signed-funding/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: apiAction,
        source_address: connectedWalletAddress,
        signed_xdr: signedXdr,
      }),
    });
    const submitted = await submitResponse.json();
    if (!submitResponse.ok) {
      setError(`Error: ${submitted.error?.message || 'Signed funding submission failed'}`);
      return;
    }

    router.refresh();
  };

  const handleAction = async (action: string) => {
    setLoading(action);
    setError(null);
    try {
      if (isFundingAction(action)) {
        await handleSignedFunding(action);
        return;
      }

      const fetchOptions: RequestInit = {
        method: 'POST',
      };

      const res = await fetch(`/api/deals/${dealId}/${action}`, fetchOptions);
      if (!res.ok) {
        const errorData = await res.json();
        setError(`Error: ${errorData.error?.message || 'Action failed'}`);
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(`Network error: ${err}`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-200">
          {error}
        </div>
      )}
      {isFundingWindowDealStatus(status) && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {status === 'WAITING_DEPOSITS'
            ? 'Record the first funding event to start the escrow lock gate.'
            : status === 'BUYER_FUNDED'
              ? 'Buyer is funded. Seller funding is now required before lock can begin.'
              : status === 'SELLER_FUNDED'
                ? 'Seller is funded. Buyer funding is now required before lock can begin.'
                : 'Both funding transfers are confirmed. Settleway is preparing the custody transfer before escrow lock.'}
        </div>
      )}
      {status === 'LOCKED' && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {viewerRole === 'buyer'
            ? 'Escrow is locked. Wait for the seller to submit delivery proof.'
            : 'Escrow is locked. The next step is recording delivery proof.'}
        </div>
      )}
      {status === 'CUSTODY_PENDING' && (
        <Button
          variant="primary"
          onClick={() => handleAction('custody-sweep')}
          disabled={loading !== null}
        >
          {loading === 'custody-sweep' ? 'Preparing Escrow...' : 'Refresh Escrow Status'}
        </Button>
      )}
      {status === 'PROOF_SUBMITTED' && viewerRole === 'buyer' && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Proof has been submitted. Wait for the seller to mark the delivery milestone.
        </div>
      )}
      {status === 'DELIVERED' && viewerRole === 'seller' && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Delivery has been marked. Wait for the buyer to confirm receipt and release settlement.
        </div>
      )}
      {status === 'REFUNDED' && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          This room closed before lock. Review the refund and reputation outcome in the room
          summary.
        </div>
      )}
      {status === 'EXPIRED' && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          The funding window ended without a protected lock. No further room action is available.
        </div>
      )}
      {status === 'COMPLETED' && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Settlement completed. Final wallet routing and reputation updates are now recorded in
          this room.
        </div>
      )}
      {railVersion === 'custody_v2_testnet' && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Custody V2 rail is active. Financial status is confirmed on Stellar Testnet before the
          room projection advances.
        </div>
      )}
      {custodyV2Action ? (
        <Button
          variant="primary"
          onClick={() => {
            setLoading(custodyV2Action.actionType);
            setError(null);
            handleCustodyV2Action(custodyV2Action.actionType).finally(() => setLoading(null));
          }}
          disabled={loading !== null}
        >
          {loading === custodyV2Action.actionType ? 'Processing...' : custodyV2Action.label}
        </Button>
      ) : null}
      {railVersion === 'custody_v2_testnet' && !custodyV2Action ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Waiting for the next confirmed Custody V2 state before another wallet action is available.
        </div>
      ) : null}
      {railVersion === 'custody_v2_testnet' ? null : (
      <div className="flex flex-col sm:flex-row gap-3">
        {status === 'WAITING_DEPOSITS' && (
          <>
            {canTriggerSellerDeposit ? (
              <Button
                variant="secondary"
                onClick={() => handleAction('seller-deposit')}
                disabled={loading !== null}
              >
                {loading === 'seller-deposit'
                  ? 'Processing...'
                  : getActionLabel('seller-deposit')}
              </Button>
            ) : null}
            {canTriggerBuyerDeposit ? (
              <Button
                variant="primary"
                onClick={() => handleAction('buyer-deposit')}
                disabled={loading !== null}
              >
                {loading === 'buyer-deposit' ? 'Processing...' : getActionLabel('buyer-deposit')}
              </Button>
            ) : null}
            {viewerRole === null ? (
              <Button
                variant="ghost"
                onClick={() => handleAction('expire')}
                disabled={loading !== null}
              >
                {loading === 'expire' ? 'Processing...' : getActionLabel('expire')}
              </Button>
            ) : null}
          </>
        )}

        {status === 'BUYER_FUNDED' && (
          <>
            {canTriggerSellerDeposit ? (
              <Button
                variant="secondary"
                onClick={() => handleAction('seller-deposit')}
                disabled={loading !== null}
              >
                {loading === 'seller-deposit'
                  ? 'Processing...'
                  : getActionLabel('seller-deposit')}
              </Button>
            ) : null}
            {viewerRole === null ? (
              <>
                <Button
                  variant="ghost"
                  onClick={() => handleAction('expire')}
                  disabled={loading !== null}
                >
                  {loading === 'expire' ? 'Processing...' : 'Expire And Refund Buyer'}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => handleAction('refund')}
                  disabled={loading !== null}
                >
                  {loading === 'refund' ? 'Processing...' : getActionLabel('refund')}
                </Button>
              </>
            ) : null}
          </>
        )}

        {status === 'SELLER_FUNDED' && (
          <>
            {canTriggerBuyerDeposit ? (
              <Button
                variant="primary"
                onClick={() => handleAction('buyer-deposit')}
                disabled={loading !== null}
              >
                {loading === 'buyer-deposit'
                  ? 'Processing...'
                  : getActionLabel('buyer-deposit')}
              </Button>
            ) : null}
            {viewerRole === null ? (
              <>
                <Button
                  variant="ghost"
                  onClick={() => handleAction('expire')}
                  disabled={loading !== null}
                >
                  {loading === 'expire' ? 'Processing...' : 'Expire And Refund Seller'}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => handleAction('refund')}
                  disabled={loading !== null}
                >
                  {loading === 'refund' ? 'Processing...' : getActionLabel('refund')}
                </Button>
              </>
            ) : null}
          </>
        )}

        {status === 'PROOF_SUBMITTED' && canTriggerProofMilestone && (
          <Button
            variant="secondary"
            onClick={() => handleAction('mark-delivered')}
            disabled={loading !== null}
          >
            {loading === 'mark-delivered' ? 'Processing...' : getActionLabel('mark-delivered')}
          </Button>
        )}

        {status === 'DELIVERED' && canTriggerAcceptance && (
          <Button
            variant="primary"
            onClick={() => handleAction('accept-delivery')}
            disabled={loading !== null}
          >
            {loading === 'accept-delivery' ? 'Processing...' : getActionLabel('accept-delivery')}
          </Button>
        )}

      </div>
      )}
    </div>
  );
}
