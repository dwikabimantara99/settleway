'use client';

import NextImage from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BadgeCheck,
  CalendarDays,
  Camera,
  Check,
  CheckCheck,
  FileText,
  MapPin,
  MessageSquareText,
  Paperclip,
  SendHorizonal,
  ShieldCheck,
  Star,
  Video,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface CreateOfferComposerProps {
  listingId?: string;
  buyerRequestId?: string;
  initialVolumeKg: number;
  initialPricePerKgIdr: number;
  commodity: string;
  counterpartyName: string;
  counterpartyRoleLabel: string;
  counterpartyLocation: string;
  counterpartyScore: number;
  counterpartyKind: 'buyer' | 'seller';
  currentActorId: string | null;
}

interface DraftNegotiationMessage {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
  readBy: string[];
}

const quickPrompts = [
  {
    icon: Camera,
    label: 'Ask for recent photos',
    message: 'Please share recent product photos before we align on the final terms.',
  },
  {
    icon: CalendarDays,
    label: 'Confirm delivery schedule',
    message: 'Can we confirm the delivery schedule and pickup window for this order?',
  },
  {
    icon: BadgeCheck,
    label: 'Discuss product quality',
    message: 'Please confirm the grade, moisture, sorting, and any quality notes for this lot.',
  },
  {
    icon: FileText,
    label: 'Confirm required documents',
    message: 'Please confirm which documents or delivery receipts can be provided.',
  },
];

const negotiationAttachmentPreviews = [
  {
    type: 'photo',
    name: 'fresh-chili-lot.jpg',
    detail: 'Recent product photo',
    imageSrc: '/commodities/red-chili.png',
  },
  {
    type: 'photo',
    name: 'sorted-grade-a-batch.jpg',
    detail: 'Sorting evidence',
    imageSrc: '/commodities/red-chili.png',
  },
  {
    type: 'pdf',
    name: 'quality-check.pdf',
    detail: 'Moisture and grade notes',
  },
  {
    type: 'video',
    name: 'packing-walkthrough.mp4',
    detail: 'Short harvest proof video',
  },
];

function buildDraftThreadKey(input: {
  listingId?: string;
  buyerRequestId?: string;
}): string | null {
  if (input.listingId) return `settleway:draft-offer-thread:listing:${input.listingId}`;
  if (input.buyerRequestId) return `settleway:draft-offer-thread:buyer-request:${input.buyerRequestId}`;
  return null;
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

function readInitialDraftMessages(storageKey: string | null, actorId: string | null) {
  if (!storageKey) return [];

  const storedMessages = readDraftMessages(storageKey);
  if (!actorId) return storedMessages;

  const { messages, changed } = markMessagesAsRead(storedMessages, actorId);
  if (changed) {
    writeDraftMessages(storageKey, messages);
  }

  return messages;
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

function getDefaultDeliveryDeadline() {
  const date = new Date();
  date.setDate(date.getDate() + 4);
  return date.toISOString().slice(0, 10);
}

function formatDeliveryDate(value: string) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`));
}

function composeTermsNote(note: string, deliveryDeadline: string) {
  const parts = [];
  const formattedDeadline = formatDeliveryDate(deliveryDeadline);

  if (formattedDeadline) {
    parts.push(`Delivery deadline: ${formattedDeadline}`);
  }
  if (note.trim()) {
    parts.push(note.trim());
  }

  return parts.join('\n');
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function getActorLabel(actorId: string | null) {
  if (actorId === 'seller-probolinggo-cabai') return 'Seller';
  if (actorId === 'buyer-surabaya-restaurant') return 'Buyer';
  return 'You';
}

export function CreateOfferComposer({
  listingId,
  buyerRequestId,
  initialVolumeKg,
  initialPricePerKgIdr,
  commodity,
  counterpartyName,
  counterpartyRoleLabel,
  counterpartyLocation,
  counterpartyScore,
  counterpartyKind,
  currentActorId,
}: CreateOfferComposerProps) {
  const router = useRouter();
  const draftThreadKey = useMemo(
    () => buildDraftThreadKey({ listingId, buyerRequestId }),
    [buyerRequestId, listingId],
  );
  const [messageDraft, setMessageDraft] = useState('');
  const [draftMessages, setDraftMessages] = useState<DraftNegotiationMessage[]>([]);
  const [volumeKg, setVolumeKg] = useState(String(initialVolumeKg));
  const [pricePerKgIdr, setPricePerKgIdr] = useState(String(initialPricePerKgIdr));
  const [deliveryDeadline, setDeliveryDeadline] = useState(() => getDefaultDeliveryDeadline());
  const [termsNote, setTermsNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedVolumeKg = Math.max(0, Number(volumeKg) || 0);
  const parsedPricePerKgIdr = Math.max(0, Number(pricePerKgIdr) || 0);
  const indicativeValueIdr = parsedVolumeKg * parsedPricePerKgIdr;
  const verificationLabel = counterpartyKind === 'seller' ? 'Verified Seller' : 'Verified Buyer';
  const scoreLabel = counterpartyKind === 'seller' ? 'Seller reputation' : 'Buyer reputation';
  const counterpartyInitials = getInitials(counterpartyName) || 'SW';
  const currentActorInitials = getActorLabel(currentActorId).slice(0, 2).toUpperCase();

  useEffect(() => {
    const nextMessages = readInitialDraftMessages(draftThreadKey, currentActorId);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Draft chat is client-local and must load after SSR hydration.
    setDraftMessages(nextMessages);
  }, [currentActorId, draftThreadKey]);

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
          termsNote: composeTermsNote(termsNote, deliveryDeadline),
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
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : String(fetchError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] xl:grid-cols-[minmax(0,1fr)_27rem]">
      <section className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-[0_18px_54px_rgba(15,23,42,0.08)]">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <MessageSquareText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Recorded Negotiation</h2>
              <p className="text-sm text-slate-500">Messages and terms stay recorded together.</p>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            <ShieldCheck className="h-4 w-4" />
            Recorded thread
          </div>
        </header>

        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-4 border-white bg-emerald-700 text-xl font-bold text-white shadow-[0_10px_30px_rgba(16,185,129,0.22)]">
              {counterpartyInitials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-xl font-semibold text-slate-950">{counterpartyName}</h3>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
                  {verificationLabel}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">{counterpartyRoleLabel}</p>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <Star className="h-4 w-4 fill-emerald-500 text-emerald-500" />
                  <span className="font-semibold text-emerald-700">{counterpartyScore}/100</span>
                  {scoreLabel}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  {counterpartyLocation}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col bg-gradient-to-b from-slate-50 to-white">
          <div className="space-y-4 px-6 py-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700 shadow-sm">
                {counterpartyInitials}
              </div>
              <div className="max-w-[76%] rounded-2xl rounded-bl-md bg-white px-4 py-3 text-sm leading-6 text-slate-700 shadow-sm ring-1 ring-slate-200">
                <p>
                  Hello. We can discuss {parsedVolumeKg.toLocaleString('id-ID')} kg of {commodity}{' '}
                  here before either side opens the protected Deal Room.
                </p>
                <div className="mt-2 text-right text-[11px] text-slate-400">09:12</div>
              </div>
            </div>

            <div className="flex items-start justify-end gap-3">
              <div className="max-w-[76%] rounded-2xl rounded-br-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-slate-700 shadow-sm">
                <p>
                  Great. Please share recent product photos, delivery timing, quality terms, and
                  required documents.
                </p>
                <div className="mt-2 flex items-center justify-end gap-1 text-[11px] text-slate-500">
                  <span>09:18</span>
                  <CheckCheck className="h-3.5 w-3.5 text-emerald-600" />
                </div>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white shadow-sm">
                {currentActorInitials}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700 shadow-sm">
                {counterpartyInitials}
              </div>
              <div className="max-w-[82%]">
                <div className="rounded-2xl rounded-bl-md bg-white px-4 py-3 text-sm leading-6 text-slate-700 shadow-sm ring-1 ring-slate-200">
                  <p>Sure, here are the recent harvest references and quality files.</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {negotiationAttachmentPreviews.map((preview) => (
                      <div
                        key={preview.name}
                        className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm"
                      >
                        {preview.type === 'photo' && preview.imageSrc ? (
                          <div className="relative h-20">
                            <NextImage
                              src={preview.imageSrc}
                              alt={preview.detail}
                              fill
                              sizes="160px"
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex h-20 items-center justify-center bg-white">
                            <div
                              className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                                preview.type === 'pdf'
                                  ? 'bg-red-50 text-red-600'
                                  : 'bg-violet-50 text-violet-600'
                              }`}
                            >
                              {preview.type === 'pdf' ? (
                                <FileText className="h-5 w-5" />
                              ) : (
                                <Video className="h-5 w-5" />
                              )}
                            </div>
                          </div>
                        )}
                        <div className="px-3 py-2">
                          <div className="truncate text-xs font-semibold text-slate-800">
                            {preview.name}
                          </div>
                          <div className="truncate text-[11px] text-slate-500">
                            {preview.detail}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 text-[11px] text-slate-400">09:22</div>
                </div>
              </div>
            </div>

            {draftMessages.length > 0 ? (
              <div className="space-y-4 border-t border-slate-100 pt-4">
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
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-400 shadow-sm">
                            {formatMessageDay(message.createdAt)}
                          </span>
                        </div>
                      ) : null}
                      <div className={`flex items-start gap-3 ${isCurrentActor ? 'justify-end' : 'justify-start'}`}>
                        {!isCurrentActor ? (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
                            {counterpartyInitials}
                          </div>
                        ) : null}
                        <div
                          className={`max-w-[78%] rounded-2xl px-4 py-3 shadow-sm ${
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
                        {isCurrentActor ? (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white">
                            {getActorLabel(currentActorId).slice(0, 2).toUpperCase()}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div className="border-t border-slate-200 bg-white px-5 py-3">
            <div className="mb-3 flex flex-wrap gap-2">
              {quickPrompts.map(({ icon: Icon, label, message }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setMessageDraft(message)}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Attach evidence request"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:border-emerald-200 hover:text-emerald-700"
              >
                <Paperclip className="h-5 w-5" />
              </button>
              <div className="flex flex-1 items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 py-2">
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
              </div>
              <Button
                type="button"
                size="sm"
                className="h-12 w-12 rounded-full px-0"
                onClick={handleSendMessage}
                disabled={!messageDraft.trim() || !currentActorId}
                aria-label="Send message"
              >
                <SendHorizonal className="h-5 w-5" />
              </Button>
            </div>
            <p className="mt-3 pl-16 text-xs text-slate-500">
              You can attach photos, videos, and PDFs before the protected Deal Room opens.
            </p>
          </div>
        </div>
      </section>

      <aside className="overflow-hidden rounded-[1.5rem] border border-emerald-200 bg-white shadow-[0_18px_54px_rgba(15,23,42,0.08)]">
        <header className="border-b border-emerald-100 bg-emerald-50 px-6 py-6">
          <div className="flex items-start gap-3">
            <FileText className="mt-1 h-6 w-6 text-emerald-700" />
            <div>
              <h2 className="text-2xl font-semibold text-emerald-900">Deal Terms</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Adjust the commercial terms here before both parties move toward Open Deal Room.
              </p>
            </div>
          </div>
        </header>

        <div className="space-y-5 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="deal-volume" className="text-sm font-semibold text-slate-900">
                Volume (kg)
              </label>
              <input
                id="deal-volume"
                type="number"
                min="1"
                step="1"
                value={volumeKg}
                onChange={(event) => setVolumeKg(event.target.value)}
                className="h-12 w-full rounded-xl border border-slate-300 px-4 text-base text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="deal-price" className="text-sm font-semibold text-slate-900">
                Price per kg (IDR)
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500">
                  Rp
                </span>
                <input
                  id="deal-price"
                  type="number"
                  min="1"
                  step="100"
                  value={pricePerKgIdr}
                  onChange={(event) => setPricePerKgIdr(event.target.value)}
                  className="h-12 w-full rounded-xl border border-slate-300 pl-11 pr-4 text-base text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="delivery-deadline" className="text-sm font-semibold text-slate-900">
              Delivery deadline
            </label>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                id="delivery-deadline"
                type="date"
                value={deliveryDeadline}
                onChange={(event) => setDeliveryDeadline(event.target.value)}
                className="h-12 w-full rounded-xl border border-slate-300 pl-12 pr-4 text-base text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="deal-notes" className="text-sm font-semibold text-slate-900">
              Terms note
            </label>
            <textarea
              id="deal-notes"
              value={termsNote}
              onChange={(event) => setTermsNote(event.target.value)}
              placeholder="Add special terms, delivery expectations, or contract notes."
              className="min-h-28 w-full rounded-xl border border-slate-300 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Indicative deal value
            </div>
            <div className="mt-2 text-3xl font-bold text-emerald-700">
              Rp {indicativeValueIdr.toLocaleString('id-ID')}
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              This draft becomes the commercial baseline that the counterparty reviews before they
              can accept the offer.
            </p>
          </div>

          {!currentActorId ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 mb-4">
              <strong>Authentication Required:</strong> You must be logged in to submit an offer. In demo mode, select a Demo Persona (Buyer or Seller) from the navigation bar.
            </div>
          ) : null}

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <Button
            type="button"
            size="lg"
            className="h-14 w-full rounded-xl text-xl"
            onClick={handleSubmit}
            disabled={loading || !currentActorId}
          >
            {loading ? 'Submitting...' : !currentActorId ? 'Login to Submit Offer' : 'Submit Offer'}
          </Button>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
            <div className="mb-2 flex items-center gap-2 font-semibold text-slate-900">
              <MessageSquareText className="h-5 w-5 text-emerald-700" />
              Recorded Negotiation
            </div>
            <p className="text-sm leading-6 text-slate-600">
              Submitting an offer starts a recorded negotiation. Discuss price, quantity, quality,
              delivery, and documents carefully because this thread may support dispute evidence
              later.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
