'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

interface EvidenceSubmitterProps {
  dealId: string;
  sellerId: string;
}

export function EvidenceSubmitter({ dealId, sellerId }: EvidenceSubmitterProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Please select a file to upload.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("File exceeds the 10 MiB limit.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('actor_id', sellerId);
      formData.append('file', file);

      const res = await fetch(`/api/deals/${dealId}/submit-proof`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const errorData = await res.json();
        setError(`Submission failed: ${errorData.error?.message || 'Unknown error'}`);
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(`Network error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 p-5 border border-slate-200 rounded-lg bg-white shadow-sm">
      <h4 className="text-sm font-semibold text-slate-900 mb-2">Submit Delivery Evidence</h4>
      <p className="text-xs text-slate-500 mb-4">
        Settleway records an integrity fingerprint and metadata. The original file is not stored by this MVP.
      </p>
      
      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded border border-red-100">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <input 
          type="file" 
          ref={fileInputRef}
          disabled={loading}
          aria-label="Delivery Evidence File"
          className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
        />
        <Button 
          variant="primary" 
          onClick={handleSubmit}
          disabled={loading}
          className="w-full sm:w-auto"
        >
          {loading ? 'Submitting...' : 'Submit Proof'}
        </Button>
      </div>
    </div>
  );
}
