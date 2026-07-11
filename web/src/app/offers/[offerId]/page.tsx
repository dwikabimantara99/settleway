import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Banknote,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ClipboardCheck,
  Coins,
  FileText,
  Info,
  LockKeyhole,
  MessageSquareText,
  PackageCheck,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { NegotiationComposer } from '@/components/offers/NegotiationComposer';
import { DealTermsActionButton } from '@/components/offers/DealTermsActionButton';
import { ProfileWalletCard } from '@/components/profile/ProfileWalletCard';
import { getCurrentUser } from '@/lib/auth/server';
import { repository } from '@/lib/repositories';
import { demoProfiles, demoOffers, demoOfferMessages } from '@/lib/demo/demo-data';
import type { DbNegotiationMessage } from '@/lib/db/types';

function formatIdr(value: number) {
  return `Rp ${value.toLocaleString('id-ID')}`;
}

function formatPricePerKg(value: number | null) {
  return value ? `${formatIdr(value)} /kg` : 'Pending';
}

function formatMessageDay(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(value));
}

function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

function parseTermsNote(note: string | null) {
  if (!note) {
    return {
      deliveryDeadline: 'Pending agreement',
      cleanNote: '',
    };
  }

  const lines = note.split('\n');
  const deliveryLine = lines.find((line) => line.toLowerCase().startsWith('delivery deadline:'));

  return {
    deliveryDeadline: deliveryLine?.replace(/^delivery deadline:\s*/i, '').trim() || 'Pending agreement',
    cleanNote: lines
      .filter((line) => !line.toLowerCase().startsWith('delivery deadline:'))
      .join('\n')
      .trim(),
  };
}

function getInitials(value?: string) {
  return (value || 'SW')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function statusBadgeClass(active: boolean) {
  return active
    ? 'border-emerald-200 bg-emerald-100 text-emerald-800'
    : 'border-amber-200 bg-amber-50 text-amber-700';
}

function shortAddress(address: string | null | undefined) {
  if (!address) return 'Not connected';
  return `${address.slice(0, 7)}...${address.slice(-5)}`;
}

export default async function OfferDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ offerId: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { offerId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const isDemo = resolvedSearchParams.demo === '1';
  const role = typeof resolvedSearchParams.role === 'string' ? resolvedSearchParams.role : undefined;
  
  let stage = typeof resolvedSearchParams.stage === 'string' ? resolvedSearchParams.stage : undefined;
  if (isDemo && !stage) {
    stage = role === 'seller' ? 'review' : 'open';
  }

  let offer = await repository.getOffer(offerId);

  if (!offer && isDemo && offerId === 'offer-demo-cabai-001') {
    const baseOffer = demoOffers['offer-demo-cabai-001'];
    if (baseOffer) {
      offer = { ...baseOffer };
      if (stage === 'open' || stage === 'review') {
        offer.status = 'negotiating';
        offer.terms_accepted_at = null;
        offer.buyer_open_room_at = null;
        offer.seller_open_room_at = null;
        offer.active_deal_id = null;
      }
    }
  }

  if (!offer) {
    return notFound();
  }

  const user = await getCurrentUser();
  const actorId = user?.id || null;
  const isParticipant = actorId === offer.buyer_id || actorId === offer.seller_id;
  const buyer = demoProfiles[offer.buyer_id];
  const seller = demoProfiles[offer.seller_id];
  const [messages, buyerProfile, sellerProfile] = await Promise.all([
    isDemo && offerId === 'offer-demo-cabai-001' && !await repository.getOffer(offerId)
      ? Promise.resolve(demoOfferMessages['offer-demo-cabai-001'] || [])
      : repository.getOfferMessages(offer.id),
    repository.getProfile(offer.buyer_id),
    repository.getProfile(offer.seller_id),
  ]);
  const recentMessages = messages.slice(-3);

  const buyerOpened = Boolean(offer.buyer_open_room_at);
  const sellerOpened = Boolean(offer.seller_open_room_at);
  const bothOpened = buyerOpened && sellerOpened;
  const termsAccepted = Boolean(offer.terms_accepted_at);
  const hasOpened =
    actorId === offer.buyer_id ? buyerOpened : actorId === offer.seller_id ? sellerOpened : false;
  const counterpartOpened =
    actorId === offer.buyer_id ? sellerOpened : actorId === offer.seller_id ? buyerOpened : false;
  const canAcceptTerms = Boolean(
    isParticipant && actorId && actorId !== offer.initiated_by_id && !termsAccepted,
  );
  const { deliveryDeadline, cleanNote } = parseTermsNote(offer.terms_note);
  const sourceHref = offer.listing_id
    ? `/marketplace/${offer.listing_id}`
    : offer.buyer_request_id
      ? '/buyer-requests'
      : '/marketplace';
  const sourceLabel = offer.listing_id ? 'Back to source listing' : 'Back to source request';
  const statusLabel = termsAccepted ? 'Offer Agreed' : 'Waiting for Acceptance';
  const summaryIntro = termsAccepted
    ? `Both parties have aligned on the commercial terms for ${(offer.volume_kg ?? 0).toLocaleString(
        'id-ID',
      )} kg of ${offer.commodity} at ${formatPricePerKg(offer.price_per_kg_idr)}, with an indicative value of ${formatIdr(
        offer.principal_idr,
      )}. Delivery expectations and evidence requirements are now preserved before activation.`
    : `The submitted commercial terms for ${(offer.volume_kg ?? 0).toLocaleString(
        'id-ID',
      )} kg of ${offer.commodity} are waiting for counterparty acceptance. The Deal Room stays closed until the terms are accepted and both parties confirm Open Deal Room.`;
  const alertText = !termsAccepted
    ? 'Waiting for your counterparty to accept the commercial terms. The protected room is still closed.'
    : bothOpened
      ? 'Both parties confirmed Open Deal Room. The active escrow room is ready.'
      : counterpartOpened && !hasOpened
        ? 'Your counterparty already clicked Open Deal Room. Your confirmation will activate the escrow room.'
        : hasOpened
          ? 'You already clicked Open Deal Room. Waiting for your counterparty confirmation.'
          : 'Commercial terms are aligned. Both parties must still confirm Open Deal Room before deposits begin.';

  return (
    <div className="mx-auto max-w-7xl overflow-x-hidden px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center gap-4 text-sm">
        <Link
          href="/notifications"
          className="inline-flex items-center text-slate-500 hover:text-emerald-600"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to notifications
        </Link>
        <span className="text-slate-300">|</span>
        <Link
          href={sourceHref}
          className="inline-flex items-center text-slate-500 hover:text-emerald-600"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          {sourceLabel}
        </Link>
        <Badge className="border-emerald-200 bg-emerald-100 px-4 py-1 text-emerald-800">
          {statusLabel}
        </Badge>
      </div>

      <div className="mb-8 max-w-4xl">
        <h1 className="text-4xl font-bold tracking-tight text-slate-950">{offer.commodity}</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-700">
          {termsAccepted
            ? 'Commercial terms are aligned. Review the agreement summary below. The Deal Room becomes active only after both parties confirm Open Deal Room.'
            : actorId === offer.seller_id
              ? 'Review Buyer Offer. Please review the proposed terms below and use the chat to align before accepting.'
              : 'The offer has been submitted. Review the proposed terms while the counterparty accepts or continues the negotiation.'}
        </p>
        <p className="mt-3 text-base leading-7 text-slate-500">
          Indicative baseline: {(offer.volume_kg ?? 0).toLocaleString('id-ID')} kg at{' '}
          {formatPricePerKg(offer.price_per_kg_idr)}, with indicative value{' '}
          {formatIdr(offer.principal_idr)}.
        </p>
      </div>

      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-800">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{alertText}</span>
        </div>
      </div>

      <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_27rem]">
        <main className="min-w-0 space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_16px_45px_rgba(15,23,42,0.07)]">
            <div className="border-b border-slate-100 px-6 py-5">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-semibold text-slate-950">Negotiation Summary</h2>
                <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                  <LockKeyhole className="mr-1.5 h-3.5 w-3.5" />
                  {termsAccepted ? 'Conversation Locked' : 'Conversation Open'}
                </Badge>
              </div>
              <p className="mt-4 max-w-4xl text-base leading-8 text-slate-700">{summaryIntro}</p>
              {cleanNote ? (
                <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-500">{cleanNote}</p>
              ) : null}
            </div>

            <div className="px-6 py-5">
              <h3 className="text-base font-semibold text-slate-950">Agreed Points</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-4">
                  <div className="flex items-center gap-3 text-slate-600">
                    <PackageCheck className="h-5 w-5 text-emerald-600" />
                    <span>Quantity</span>
                  </div>
                  <span className="font-semibold text-slate-950">
                    {(offer.volume_kg ?? 0).toLocaleString('id-ID')} kg
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-4">
                  <div className="flex items-center gap-3 text-slate-600">
                    <CalendarDays className="h-5 w-5 text-slate-500" />
                    <span>Delivery deadline</span>
                  </div>
                  <span className="text-right font-semibold text-slate-950">{deliveryDeadline}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-4">
                  <div className="flex items-center gap-3 text-slate-600">
                    <Coins className="h-5 w-5 text-emerald-600" />
                    <span>Price per kg</span>
                  </div>
                  <span className="font-semibold text-slate-950">
                    {formatPricePerKg(offer.price_per_kg_idr)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-4">
                  <div className="flex items-center gap-3 text-slate-600">
                    <ShieldCheck className="h-5 w-5 text-emerald-600" />
                    <span>Product quality</span>
                  </div>
                  <span className="text-right font-semibold text-slate-950">
                    Grade A, minimum size 3 cm
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-4">
                  <div className="flex items-center gap-3 text-slate-600">
                    <FileText className="h-5 w-5 text-emerald-600" />
                    <span>Indicative value</span>
                  </div>
                  <span className="font-bold text-emerald-700">{formatIdr(offer.principal_idr)}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-4">
                  <div className="flex items-center gap-3 text-slate-600">
                    <Camera className="h-5 w-5 text-slate-500" />
                    <span>Evidence expectation</span>
                  </div>
                  <span className="max-w-52 text-right font-semibold text-slate-950">
                    Recent product photos and delivery proof
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section
            id="conversation-history"
            className="rounded-2xl border border-slate-200 bg-white shadow-[0_16px_45px_rgba(15,23,42,0.07)]"
          >
            <div className="border-b border-slate-100 px-6 py-5">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-semibold text-slate-950">Recorded Conversation History</h2>
                <Badge className="border-slate-200 bg-slate-100 text-slate-600">
                  <LockKeyhole className="mr-1.5 h-3.5 w-3.5" />
                  {termsAccepted ? 'Locked' : 'Open'}
                </Badge>
              </div>
            </div>
            <div className="p-6">
              <div className="flex gap-5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                  <MessageSquareText className="h-7 w-7" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-6 text-slate-600">
                    {termsAccepted
                      ? 'The negotiation is locked because the commercial terms have been agreed. You can review the latest conversation below for reference.'
                      : 'The negotiation is still open. Messages remain recorded as supporting context before the protected room opens.'}
                  </p>
                  {recentMessages.length > 0 ? (
                    <div className="mt-4 space-y-3">
                      {recentMessages.map((message: DbNegotiationMessage) => {
                        const author = demoProfiles[message.author_id];
                        const isCurrentActor = actorId === message.author_id;
                        return (
                          <div
                            key={message.id}
                            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                              <span className="font-semibold text-slate-700">
                                {isCurrentActor ? 'You' : author?.displayName || message.author_id}
                              </span>
                              <span>
                                {formatMessageDay(message.created_at)}, {formatMessageTime(message.created_at)}
                              </span>
                            </div>
                            <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-700">
                              {message.body}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                      No recorded messages yet.
                    </div>
                  )}
                  <Link
                    href="#conversation-history"
                    className="mt-5 inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm hover:border-emerald-200 hover:text-emerald-700"
                  >
                    View Full Conversation
                    <ChevronLeft className="ml-2 h-4 w-4 rotate-180" />
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {!termsAccepted && isParticipant ? <NegotiationComposer offerId={offer.id} /> : null}
        </main>

        <aside className="min-w-0 space-y-6">
          <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-[0_16px_45px_rgba(15,23,42,0.07)]">
            <header className="border-b border-emerald-100 bg-emerald-50 px-6 py-5">
              <div className="flex items-center gap-3">
                <ClipboardCheck className="h-6 w-6 text-emerald-700" />
                <h2 className="text-2xl font-semibold text-emerald-900">
                  {termsAccepted ? 'Agreed Deal Terms' : 'Submitted Deal Terms'}
                </h2>
              </div>
            </header>
            <div className="space-y-5 p-6 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Volume</span>
                <span className="font-semibold text-slate-950">
                  {(offer.volume_kg ?? 0).toLocaleString('id-ID')} kg
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Price</span>
                <span className="font-semibold text-slate-950">
                  {formatPricePerKg(offer.price_per_kg_idr)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Delivery deadline</span>
                <span className="font-semibold text-slate-950">{deliveryDeadline}</span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-5">
                <span className="font-semibold text-slate-950">Indicative value</span>
                <span className="text-2xl font-bold text-emerald-700">
                  {formatIdr(offer.principal_idr)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-5">
                <span className="text-slate-500">Offer status</span>
                <Badge
                  className={
                    termsAccepted
                      ? 'border-emerald-200 bg-emerald-100 text-emerald-800'
                      : 'border-amber-200 bg-amber-50 text-amber-700'
                  }
                >
                  {termsAccepted ? 'Accepted' : 'Pending'}
                </Badge>
              </div>
              {isParticipant ? (
                <DealTermsActionButton
                  offerId={offer.id}
                  canAcceptTerms={canAcceptTerms}
                  termsAccepted={termsAccepted}
                  hasOpened={hasOpened}
                  bothOpened={bothOpened}
                  activeDealId={offer.active_deal_id}
                  isDemo={isDemo}
                  role={role}
                />
              ) : null}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-[0_16px_45px_rgba(15,23,42,0.07)]">
            <header className="border-b border-emerald-100 bg-emerald-50 px-6 py-5">
              <div className="flex items-center gap-3">
                <UsersRound className="h-6 w-6 text-emerald-700" />
                <h2 className="text-2xl font-semibold text-emerald-900">Commitment Gate</h2>
              </div>
            </header>
            <div className="space-y-4 p-6">
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-50 text-sm font-bold text-amber-700">
                    {getInitials(buyer?.displayName)}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-950">
                      {buyer?.displayName}
                    </div>
                    <div className="text-xs text-slate-500">Buyer commitment</div>
                  </div>
                </div>
                <Badge className={statusBadgeClass(buyerOpened)}>
                  {buyerOpened ? 'Opened' : 'Pending confirmation'}
                </Badge>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-700">
                    {getInitials(seller?.displayName)}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-950">
                      {seller?.displayName}
                    </div>
                    <div className="text-xs text-slate-500">Seller commitment</div>
                  </div>
                </div>
                <Badge className={statusBadgeClass(sellerOpened)}>
                  {sellerOpened ? 'Opened' : 'Pending confirmation'}
                </Badge>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm leading-6 text-emerald-900">
                One commitment click is only a signal. After both parties confirm, Settleway checks
                the buyer and seller Testnet wallets before creating the Custody V2 Deal Room.
              </div>
            </div>
          </section>

          {termsAccepted ? (
            <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-[0_16px_45px_rgba(15,23,42,0.07)]">
              <header className="border-b border-emerald-100 bg-emerald-50 px-6 py-5">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-6 w-6 text-emerald-700" />
                  <h2 className="text-2xl font-semibold text-emerald-900">Wallet Binding</h2>
                </div>
                <p className="mt-2 text-sm leading-6 text-emerald-900">
                  Custody V2 uses the wallet addresses confirmed here. The later financial role is
                  derived from these immutable addresses, not from the Buy/Sell navigation mode.
                </p>
              </header>
              <div className="space-y-4 p-6">
                <div className="rounded-xl bg-white">
                  {actorId === offer.buyer_id ? (
                    <ProfileWalletCard userId={offer.buyer_id} />
                  ) : null}
                </div>

                <div className="rounded-xl bg-white">
                  {actorId === offer.seller_id ? (
                    <ProfileWalletCard userId={offer.seller_id} />
                  ) : null}
                </div>
              </div>
            </section>
          ) : null}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_16px_45px_rgba(15,23,42,0.07)]">
            <div className="mb-5 flex items-center gap-3">
              <ShieldCheck className="h-6 w-6 text-emerald-700" />
              <h2 className="text-lg font-semibold text-slate-950">Activation Reminder</h2>
            </div>
            <div className="space-y-4 text-sm leading-6 text-slate-600">
              <div className="flex gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <span>After the room activates, buyer deposits principal, bond, and fee.</span>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <span>Seller deposits performance bond and seller fee.</span>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <span>Stellar-backed proof trail begins from that active room.</span>
              </div>
              <div className="flex gap-3">
                <Banknote className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                <span>Deposits remain downstream; this page only controls mutual commitment.</span>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
