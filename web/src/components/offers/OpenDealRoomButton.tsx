'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

interface OpenDealRoomButtonProps {
  offerId: string;
  hasOpened: boolean;
  activeDealId: string | null;
}

export function OpenDealRoomButton({
  offerId,
  hasOpened,
  activeDealId,
}: OpenDealRoomButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleOpen() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/offers/${offerId}`, {
        method: 'POST',
      });
      const contentType = response.headers.get('content-type') ?? '';

      if (!contentType.includes('application/json')) {
        setError('Open Deal Room is temporarily unavailable. Refresh the page and try again.');
        return;
      }

      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        setError(payload.error?.message || 'Failed to update the Deal Room commitment.');
        return;
      }

      if (payload.data.redirect_to) {
        router.push(payload.data.redirect_to);
        return;
      }

      router.refresh();
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : String(fetchError));
    } finally {
      setLoading(false);
    }
  }

  if (activeDealId) {
    return (
      <div className="space-y-3">
        <Button
          type="button"
          size="lg"
          className="h-14 w-full rounded-xl"
          onClick={() => router.push(`/deals/${activeDealId}`)}
        >
          Enter Active Escrow Room
        </Button>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Button
        type="button"
        size="lg"
        className="h-14 w-full rounded-xl"
        onClick={handleOpen}
        disabled={loading || hasOpened}
      >
        {loading
          ? 'Processing...'
          : hasOpened
            ? 'Waiting for Counterparty Commitment'
            : 'Open Deal Room'}
      </Button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
