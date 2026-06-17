'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import type { DealStatus } from '@/lib/escrow/state-machine';
import {
  isFundingWindowDealStatus,
} from '@/lib/escrow/state-machine';

interface DealActionsProps {
  dealId: string;
  status: DealStatus;
  viewerRole?: 'buyer' | 'seller' | null;
}

function getActionLabel(action: string): string {
  switch (action) {
    case 'buyer-deposit':
      return 'Record Buyer Funding';
    case 'seller-deposit':
      return 'Record Seller Funding';
    case 'expire':
      return 'Expire Funding Window';
    case 'refund':
      return 'Record Pre-Lock Refund';
    case 'mark-delivered':
      return 'Record Delivery Milestone';
    case 'accept-delivery':
      return 'Confirm Receipt And Release';
    default:
      return 'Run Action';
  }
}

export function DealActions({ dealId, status, viewerRole = null }: DealActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canTriggerBuyerDeposit = viewerRole === null || viewerRole === 'buyer';
  const canTriggerSellerDeposit = viewerRole === null || viewerRole === 'seller';
  const canTriggerProofMilestone = viewerRole === null || viewerRole === 'seller';
  const canTriggerAcceptance = viewerRole === null || viewerRole === 'buyer';

  const handleAction = async (action: string) => {
    setLoading(action);
    setError(null);
    try {
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
              : 'Seller is funded. Buyer funding is now required before lock can begin.'}
        </div>
      )}
      {status === 'LOCKED' && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {viewerRole === 'buyer'
            ? 'Escrow is locked. Wait for the seller to submit delivery proof.'
            : 'Escrow is locked. The next step is recording delivery proof.'}
        </div>
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
            <Button
              variant="ghost"
              onClick={() => handleAction('expire')}
              disabled={loading !== null}
            >
              {loading === 'expire' ? 'Processing...' : getActionLabel('expire')}
            </Button>
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
    </div>
  );
}
