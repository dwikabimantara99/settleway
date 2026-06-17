'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SendHorizonal } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface NegotiationComposerProps {
  offerId: string;
}

export function NegotiationComposer({ offerId }: NegotiationComposerProps) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    const trimmed = body.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/offers/${offerId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: trimmed }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        setError(payload.error?.message || 'Failed to send message.');
        return;
      }

      setBody('');
      router.refresh();
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : String(fetchError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      {error ? <p className="px-1 text-sm text-red-600">{error}</p> : null}
      <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
        <input
          id="negotiation-body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void handleSend();
            }
          }}
          placeholder="Type a message..."
          className="h-10 flex-1 bg-transparent px-2 text-sm text-slate-900 outline-none placeholder:text-slate-400"
        />
        <Button
          type="button"
          size="sm"
          className="h-10 rounded-full px-4"
          onClick={handleSend}
          disabled={loading || !body.trim()}
          aria-label="Send message"
        >
          {loading ? '...' : <SendHorizonal className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
