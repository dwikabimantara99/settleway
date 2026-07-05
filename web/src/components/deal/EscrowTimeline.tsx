'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Stepper, type Step } from '@/components/ui/Stepper';
import type { DealStatus } from '@/lib/escrow/state-machine';
import { ProfileWalletFundingPanel } from './ProfileWalletFundingPanel';

export function EscrowTimeline({
  dealId,
  status,
  viewerRole,
  userId,
  requiredAmountIdr,
  isFunded,
  steps,
}: {
  dealId: string;
  status: DealStatus;
  viewerRole: 'buyer' | 'seller' | null;
  userId: string | null;
  requiredAmountIdr: number;
  isFunded: boolean;
  steps: Step[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canTriggerProofMilestone = viewerRole === null || viewerRole === 'seller';
  const canTriggerAcceptance = viewerRole === null || viewerRole === 'buyer';

  const handleAction = async (action: string) => {
    setLoading(action);
    setError(null);
    try {
      const fetchOptions: RequestInit = { method: 'POST' };
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

  const isFundingPhase = 
    status === 'WAITING_DEPOSITS' || 
    status === 'BUYER_FUNDED' || 
    status === 'SELLER_FUNDED';

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-950 mb-5">Escrow Timeline</h2>
        <Stepper steps={steps} />
      </section>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {isFundingPhase && viewerRole && userId && (
        <ProfileWalletFundingPanel
          userId={userId}
          requiredAmountIdr={requiredAmountIdr}
          isFunded={isFunded}
        />
      )}

      {!isFundingPhase && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950 mb-4">Escrow Actions</h2>

          {status === 'CUSTODY_PENDING' && (
            <Button
              variant="primary"
              onClick={() => handleAction('custody-sweep')}
              disabled={loading !== null}
            >
              {loading === 'custody-sweep' ? 'Preparing Escrow...' : 'Refresh Escrow Status'}
            </Button>
          )}
          {status === 'LOCKED' && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 mb-4">
              {viewerRole === 'buyer'
                ? 'Escrow is locked. Wait for the seller to submit delivery proof.'
                : 'Escrow is locked. Submit your delivery proof and mark the milestone.'}
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
              This room closed before lock. Review the refund and reputation outcome in the room summary.
            </div>
          )}
          {status === 'EXPIRED' && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              The funding window ended without a protected lock. No further room action is available.
            </div>
          )}
          {status === 'COMPLETED' && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              Settlement completed. Final wallet routing and reputation updates are now recorded in this room.
            </div>
          )}

          <div className="flex gap-3 mt-4">
            {status === 'PROOF_SUBMITTED' && canTriggerProofMilestone && (
              <Button
                variant="secondary"
                onClick={() => handleAction('mark-delivered')}
                disabled={loading !== null}
              >
                {loading === 'mark-delivered' ? 'Processing...' : 'Confirm Delivery Milestone'}
              </Button>
            )}

            {status === 'DELIVERED' && canTriggerAcceptance && (
              <Button
                variant="primary"
                onClick={() => handleAction('accept-delivery')}
                disabled={loading !== null}
              >
                {loading === 'accept-delivery' ? 'Processing...' : 'Confirm Receipt And Settle'}
              </Button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
