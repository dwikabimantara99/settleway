'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, CheckCheck, FileText, MessageSquareText, SendHorizonal } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface CreateOfferComposerProps {
  listingId?: string;
  buyerRequestId?: string;
  initialVolumeKg: number;
  initialPricePerKgIdr: number;
}

interface DraftNegotiationMessage {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
  readBy: string[];
}

function buildDraftThreadKey(input: {
  listingId?: string;
  buyerRequestId?: string;
}): string | null {
  if (input.listingId) return `settleway:draft-offer-thread:listing:${input.listingId}`;
  if (input.buyerRequestId) return `settleway:draft-offer-thread:buyer-request:${input.buyerRequestId}`;
  return null;
}

function readCurrentActorCookie() {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:(?:^|.*;\s*)mock_actor\s*\=\s*([^;]*).*$)|^.*$/);
  return match && match[1] ? decodeURIComponent(match[1]) : null;
}

function readDraftMessages(storageKey: string): DraftNegotiationMessage[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return [];

    const parsed = JSON.parse(stored) as { messages?: DraftNegotiationMessage[] };
    if (!Array.isArray(parsed.messages)) return [];

    return parsed.messages.filter(
      (message): message is DraftNegotiationMessage =>
        typeof message?.id === 'string' &&
        typeof message?.authorId === 'string' &&
        typeof message?.body === 'string' &&
        typeof message?.createdAt === 'string' &&
        Array.isArray(message?.readBy),
    );
  } catch {
    return [];
  }
}

function writeDraftMessages(storageKey: string, messages: DraftNegotiationMessage[]) {
  if (typeof window === 'undefined') return;

  if (messages.length === 0) {
    window.localStorage.removeItem(storageKey);
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify({ messages }));
}

function markMessagesAsRead(messages: DraftNegotiationMessage[], actorId: string) {
  let changed = false;

  const nextMessages = messages.map((message) => {
    if (message.authorId === actorId || message.readBy.includes(actorId)) {
      return message;
    }

    changed = true;
    return {
      ...message,
      readBy: [...message.readBy, actorId],
    };
  });

  return { messages: nextMessages, changed };
}

function formatMessageDay(value: string) {
  const date = new Date(value);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return 'Today';
  }

  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(date);
}

function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

export function CreateOfferComposer({
  listingId,
  buyerRequestId,
  initialVolumeKg,
  initialPricePerKgIdr,
}: CreateOfferComposerProps) {
  const router = useRouter();
  const [messageDraft, setMessageDraft] = useState('');
  const [currentActorId, setCurrentActorId] = useState<string | null>(null);
  const [draftMessages, setDraftMessages] = useState<DraftNegotiationMessage[]>([]);
  const [volumeKg, setVolumeKg] = useState(String(initialVolumeKg));
  const [pricePerKgIdr, setPricePerKgIdr] = useState(String(initialPricePerKgIdr));
  const [termsNote, setTermsNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const draftThreadKey = useMemo(
    () => buildDraftThreadKey({ listingId, buyerRequestId }),
    [buyerRequestId, listingId],
  );

  const parsedVolumeKg = Math.max(0, Number(volumeKg) || 0);
  const parsedPricePerKgIdr = Math.max(0, Number(pricePerKgIdr) || 0);
  const indicativeValueIdr = parsedVolumeKg * parsedPricePerKgIdr;

  useEffect(() => {
    const actorId = readCurrentActorCookie();
    setCurrentActorId(actorId);

    if (!draftThreadKey) {
      setDraftMessages([]);
      return;
    }

    const storedMessages = readDraftMessages(draftThreadKey);
    if (!actorId) {
      setDraftMessages(storedMessages);
      return;
    }

    const { messages, changed } = markMessagesAsRead(storedMessages, actorId);
    if (changed) {
      writeDraftMessages(draftThreadKey, messages);
    }
    setDraftMessages(messages);
  }, [draftThreadKey]);

  function handleSendMessage() {
    const trimmed = messageDraft.trim();
    if (!trimmed || !currentActorId || !draftThreadKey) return;

    const nextMessages = [
      ...draftMessages,
      {
        id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        authorId: currentActorId,
        body: trimmed,
        createdAt: new Date().toISOString(),
        readBy: [currentActorId],
      },
    ];

    setDraftMessages(nextMessages);
    writeDraftMessages(draftThreadKey, nextMessages);
    setMessageDraft('');
  }

  async function handleSubmit() {
    setLoading(true);
    setError(null);

    const persistedDraftMessages = draftMessages
      .map((message) => ({
        authorId: message.authorId,
        body: message.body.trim(),
        createdAt: message.createdAt,
      }))
      .filter((message) => message.body.length > 0);

    try {
      const response = await fetch('/api/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId,
          buyerRequestId,
          openingMessage: persistedDraftMessages.at(-1)?.body || '',
          draftMessages: persistedDraftMessages,
          volumeKg: parsedVolumeKg,
          pricePerKgIdr: parsedPricePerKgIdr,
          termsNote,
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setError(payload.error?.message || 'Failed to create offer.');
        return;
      }

      if (draftThreadKey) {
        writeDraftMessages(draftThreadKey, []);
      }

      router.push(payload.data.redirect_to);
      router.refresh();
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : String(fetchError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="flex min-h-[42rem] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-4">
            <div className="flex items-start gap-3">
              <MessageSquareText className="mt-0.5 h-5 w-5 text-emerald-600" />
              <div className="font-medium text-slate-900">Recorded negotiation</div>
            </div>
          </div>

          <div className="flex flex-1 flex-col bg-slate-50">
            <div className="flex min-h-[26rem] flex-1 flex-col justify-end p-4 pb-6">
              {draftMessages.length > 0 ? (
                <div className="space-y-4">
                  {draftMessages.map((message, index) => {
                    const previousMessage = index > 0 ? draftMessages[index - 1] : null;
                    const isCurrentActor = currentActorId === message.authorId;
                    const showDayLabel =
                      !previousMessage ||
                      formatMessageDay(previousMessage.createdAt) !== formatMessageDay(message.createdAt);
                    const hasBeenReadByCounterparty = message.readBy.some(
                      (readerId) => readerId !== message.authorId,
                    );

                    return (
                      <div key={message.id} className="space-y-2">
                        {showDayLabel ? (
                          <div className="flex justify-center">
                            <span className="text-xs font-medium text-slate-400">
                              {formatMessageDay(message.createdAt)}
                            </span>
                          </div>
                        ) : null}
                        <div className={`flex ${isCurrentActor ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                              isCurrentActor
                                ? 'rounded-br-md border border-emerald-200 bg-emerald-50'
                                : 'rounded-bl-md border border-slate-200 bg-white'
                            }`}
                          >
                            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-800">
                              {message.body}
                            </p>
                            <div className="mt-2 flex items-center justify-end gap-1 text-[11px] text-slate-500">
                              <span>{formatMessageTime(message.createdAt)}</span>
                              {isCurrentActor ? (
                                hasBeenReadByCounterparty ? (
                                  <CheckCheck className="h-3.5 w-3.5 text-emerald-600" />
                                ) : (
                                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                                )
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-auto flex min-h-[18rem] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white px-6 text-center">
                  <p className="max-w-sm text-sm leading-6 text-slate-400">Start the conversation.</p>
                </div>
              )}
            </div>

            <div className="mt-auto border-t border-slate-200 bg-white p-3">
              <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
                <input
                  id="opening-message"
                  value={messageDraft}
                  onChange={(event) => setMessageDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Write a message..."
                  className="h-10 flex-1 bg-transparent px-2 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
                <Button
                  type="button"
                  size="sm"
                  className="h-10 rounded-full px-4"
                  onClick={handleSendMessage}
                  disabled={!messageDraft.trim() || !currentActorId}
                  aria-label="Send message"
                >
                  <SendHorizonal className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-emerald-200 bg-white shadow-sm">
          <div className="border-b border-emerald-100 bg-emerald-50 px-4 py-4">
            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 h-5 w-5 text-emerald-700" />
              <div>
                <div className="font-medium text-slate-900">Deal terms</div>
                <p className="mt-1 text-sm text-slate-600">
                  Adjust the commercial terms here before both parties move toward Open Deal Room.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="deal-volume" className="text-sm font-medium text-slate-900">
                  Volume (kg)
                </label>
                <input
                  id="deal-volume"
                  type="number"
                  min="1"
                  step="1"
                  value={volumeKg}
                  onChange={(event) => setVolumeKg(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="deal-price" className="text-sm font-medium text-slate-900">
                  Price per kg (IDR)
                </label>
                <input
                  id="deal-price"
                  type="number"
                  min="1"
                  step="100"
                  value={pricePerKgIdr}
                  onChange={(event) => setPricePerKgIdr(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="deal-notes" className="text-sm font-medium text-slate-900">
                Terms note
              </label>
              <textarea
                id="deal-notes"
                value={termsNote}
                onChange={(event) => setTermsNote(event.target.value)}
                placeholder="Add special terms, delivery expectations, or contract notes."
                className="min-h-28 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-xs uppercase tracking-wide text-slate-500">Indicative deal value</div>
              <div className="mt-2 text-2xl font-bold text-emerald-600">
                Rp {indicativeValueIdr.toLocaleString('id-ID')}
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                This draft becomes the commercial baseline that the counterparty reviews before they
                can accept the offer.
              </p>
            </div>

            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <Button type="button" size="lg" className="w-full" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Offer'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
