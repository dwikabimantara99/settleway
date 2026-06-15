'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

interface DealActionsProps {
  dealId: string;
  status: string;
}

export function DealActions({ dealId, status }: DealActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (action: string) => {
    setLoading(action);
    setError(null);
    try {
      const fetchOptions: RequestInit = {
        method: 'POST', };



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
      <div className="flex flex-col sm:flex-row gap-3">
        {status === 'WAITING_DEPOSITS' && (
        <>
          <Button 
            variant="secondary" 
            onClick={() => handleAction('seller-deposit')}
            disabled={loading !== null}
          >
            {loading === 'seller-deposit' ? 'Processing...' : 'Simulate Seller Deposit'}
          </Button>
          <Button 
            variant="primary" 
            onClick={() => handleAction('buyer-deposit')}
            disabled={loading !== null}
          >
            {loading === 'buyer-deposit' ? 'Processing...' : 'Simulate Buyer Deposit'}
          </Button>
        </>
      )}

      {status === 'BUYER_FUNDED' && (
        <Button 
          variant="secondary" 
          onClick={() => handleAction('seller-deposit')}
          disabled={loading !== null}
        >
          {loading === 'seller-deposit' ? 'Processing...' : 'Simulate Seller Deposit'}
        </Button>
      )}

      {status === 'SELLER_FUNDED' && (
        <Button 
          variant="primary" 
          onClick={() => handleAction('buyer-deposit')}
          disabled={loading !== null}
        >
          {loading === 'buyer-deposit' ? 'Processing...' : 'Simulate Buyer Deposit'}
        </Button>
      )}


      {status === 'PROOF_SUBMITTED' && (
        <Button 
          variant="secondary" 
          onClick={() => handleAction('mark-delivered')}
          disabled={loading !== null}
        >
          {loading === 'mark-delivered' ? 'Processing...' : 'Simulate Mark Delivered'}
        </Button>
      )}

      {status === 'DELIVERED' && (
        <Button 
          variant="primary" 
          onClick={() => handleAction('accept-delivery')}
          disabled={loading !== null}
        >
          {loading === 'accept-delivery' ? 'Processing...' : 'Simulate Accept Delivery'}
        </Button>
      )}

        {status === 'COMPLETED' && (
          <div className="text-emerald-600 font-semibold px-4 py-2 bg-emerald-50 rounded border border-emerald-200">
            Deal Completed Successfully
          </div>
        )}
      </div>
    </div>
  );
}
