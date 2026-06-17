'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { OpenDealRoomButton } from '@/components/offers/OpenDealRoomButton';

interface DealTermsActionButtonProps {
  offerId: string;
  canAcceptTerms: boolean;
  termsAccepted: boolean;
  hasOpened: boolean;
  activeDealId: string | null;
}

export function DealTermsActionButton({
  offerId,
  canAcceptTerms,
  termsAccepted,
  hasOpened,
  activeDealId,
}: DealTermsActionButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/offers/${offerId}`, {
        method: 'PATCH',
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        setError(payload.error?.message || 'Failed to accept the proposed deal terms.');
        return;
      }

      router.refresh();
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : String(fetchError));
    } finally {
      setLoading(false);
    }
  }

  if (!termsAccepted) {
    return (
      <div className="space-y-3">
        <Button type="button" size="lg" className="w-full" onClick={handleAccept} disabled={loading || !canAcceptTerms}>
          {loading
            ? 'Processing...'
            : canAcceptTerms
              ? 'Accept Offer'
              : 'Waiting for Counterparty Acceptance'}
        </Button>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    );
  }

  return (
    <OpenDealRoomButton offerId={offerId} hasOpened={hasOpened} activeDealId={activeDealId} />
  );
}
