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
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  const canTriggerProofMilestone = viewerRole === null || viewerRole === 'seller';
  const canTriggerAcceptance = viewerRole === null || viewerRole === 'buyer';

  const handleAction = async (action: string, payload?: object) => {
    setLoading(action);
    setError(null);
    try {
      const fetchOptions: RequestInit = {
        method: 'POST',
        headers: payload ? { 'Content-Type': 'application/json' } : undefined,
        body: payload ? JSON.stringify(payload) : undefined
      };
      const res = await fetch(`/api/deals/${dealId}/${action}`, fetchOptions);
      if (!res.ok) {
        const errorData = await res.json();
        setError(`Error: ${errorData.error?.message || 'Action failed'}`);
      } else {
        setShowRejectForm(false);
        setRejectionReason('');
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
          dealId={dealId}
          viewerRole={viewerRole}
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
          {status === 'REFUND_PENDING' && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Funding window closed before full lock. A local refund classification has been recorded, pending future withdrawal execution.
            </div>
          )}
          {status === 'DELIVERY_REJECTED' && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
              The buyer rejected the delivery proof. Settlement is paused pending manual review or deterministic arbitration.
            </div>
          )}
          {status === 'REVIEW_REQUIRED' && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
              An anomaly occurred or a deadline was missed. Settlement is paused for review.
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

          <div className="flex flex-col gap-3 mt-4">
            <div className="flex gap-3">
              {status === 'PROOF_SUBMITTED' && canTriggerProofMilestone && (
                <Button
                  variant="secondary"
                  onClick={() => handleAction('mark-delivered')}
                  disabled={loading !== null}
                >
                  {loading === 'mark-delivered' ? 'Processing...' : 'Confirm Delivery Milestone'}
                </Button>
              )}

              {['PROOF_SUBMITTED', 'DELIVERED'].includes(status) && canTriggerAcceptance && !showRejectForm && (
                <>
                  <Button
                    variant="primary"
                    onClick={() => handleAction('accept-delivery')}
                    disabled={loading !== null}
                  >
                    {loading === 'accept-delivery' ? 'Processing...' : 'Review Proof & Settle'}
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => setShowRejectForm(true)}
                    disabled={loading !== null}
                  >
                    Reject Delivery
                  </Button>
                </>
              )}
            </div>

            {showRejectForm && (
              <div className="mt-4 p-4 border border-red-200 rounded-lg bg-red-50 flex flex-col gap-3">
                <label className="text-sm font-medium text-red-900">Reason for rejection:</label>
                <textarea
                  className="w-full rounded-md border-red-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm p-2"
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why the delivery proof does not meet the agreed terms..."
                />
                <div className="flex gap-3 mt-2">
                  <Button
                    variant="danger"
                    onClick={() => handleAction('reject-delivery', { reason: rejectionReason })}
                    disabled={loading !== null || rejectionReason.trim().length === 0}
                  >
                    {loading === 'reject-delivery' ? 'Processing...' : 'Confirm Rejection'}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowRejectForm(false);
                      setRejectionReason('');
                    }}
                    disabled={loading !== null}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
