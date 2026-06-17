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

  const buildSimulatedProofHash = async () => {
    const payload = `simulated-proof:${dealId}:${sellerId}:${new Date().toISOString()}`;
    const encoded = new TextEncoder().encode(payload);
    const digest = await crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(digest))
      .map((value) => value.toString(16).padStart(2, '0'))
      .join('');
  };

  const handleSubmit = async () => {
    const file = fileInputRef.current?.files?.[0];

    setLoading(true);
    setError(null);

    try {
      let res: Response;

      if (file) {
        if (file.size > 10 * 1024 * 1024) {
          setError('File exceeds the 10 MiB limit.');
          setLoading(false);
          return;
        }

        const formData = new FormData();
        formData.append('actor_id', sellerId);
        formData.append('file', file);

        res = await fetch(`/api/deals/${dealId}/submit-proof`, {
          method: 'POST',
          body: formData,
        });
      } else {
        const proofHash = await buildSimulatedProofHash();
        res = await fetch(`/api/deals/${dealId}/submit-proof`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            actor_id: sellerId,
            proof_hash: proofHash,
          }),
        });
      }

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
        Settleway records a SHA-256 integrity fingerprint and room metadata. The original file is not stored by this MVP.
      </p>

      <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
        <div className="mb-1 font-medium text-slate-900">Before you record proof</div>
        <ul className="list-disc space-y-1 pl-4">
          <li>Upload one delivery artifact or record a simulated proof hash for demo mode.</li>
          <li>The room records the file hash for integrity checking and keeps the raw file off-chain.</li>
          <li>Strong in-app capture is roadmap, so this MVP must stay honest about simulated evidence paths.</li>
        </ul>
      </div>
      
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
          {loading ? 'Submitting...' : 'Record Proof Hash'}
        </Button>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        No file selected? Demo mode records a simulated proof hash so the room can continue honestly.
      </p>
    </div>
  );
}
