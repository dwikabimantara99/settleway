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

  const handleAction = async (action: string) => {
    setLoading(action);
    try {
      const res = await fetch(`/api/deals/${dealId}/${action}`, { method: 'POST' });
      if (!res.ok) {
        const error = await res.json();
        alert(`Error: ${error.error?.message || 'Action failed'}`);
      } else {
        router.refresh();
      }
    } catch (err) {
      alert(`Network error: ${err}`);
    } finally {
      setLoading(null);
    }
  };

  const isProofAllowed = status === 'LOCKED';

  return (
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
      
      {isProofAllowed && (
        <Button 
          variant="primary" 
          onClick={() => handleAction('submit-proof')}
          disabled={loading !== null}
        >
          {loading === 'submit-proof' ? 'Processing...' : 'Simulate Submit Proof'}
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
  );
}
