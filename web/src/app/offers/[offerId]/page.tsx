import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Check, CheckCheck, ChevronLeft, Clock3, Handshake, Mail, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { NegotiationComposer } from '@/components/offers/NegotiationComposer';
import { DealTermsActionButton } from '@/components/offers/DealTermsActionButton';
import { getCurrentUser } from '@/lib/auth/server';
import { repository } from '@/lib/repositories';
import { demoProfiles } from '@/lib/demo/demo-data';

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

export default async function OfferDetailPage({
  params,
}: {
  params: Promise<{ offerId: string }>;
}) {
  const { offerId } = await params;
  const offer = await repository.getOffer(offerId);

  if (!offer) {
    return notFound();
  }

  const user = await getCurrentUser();
  const actorId = user?.id || null;
  const isParticipant = actorId === offer.buyer_id || actorId === offer.seller_id;
  const buyer = demoProfiles[offer.buyer_id];
  const seller = demoProfiles[offer.seller_id];
  const messages = await repository.getOfferMessages(offer.id);

  const buyerOpened = Boolean(offer.buyer_open_room_at);
  const sellerOpened = Boolean(offer.seller_open_room_at);
  const bothOpened = buyerOpened && sellerOpened;
  const termsAccepted = Boolean(offer.terms_accepted_at);
  const hasOpened =
    actorId === offer.buyer_id ? buyerOpened : actorId === offer.seller_id ? sellerOpened : false;
  const counterpartOpened =
    actorId === offer.buyer_id ? sellerOpened : actorId === offer.seller_id ? buyerOpened : false;
  const canAcceptTerms = Boolean(isParticipant && actorId && actorId !== offer.initiated_by_id && !termsAccepted);

  const notifications = actorId ? await repository.getNotifications(actorId) : [];
  const relevantNotification = notifications.find(
    (notification) => notification.offer_id === offer.id && notification.read_at === null,
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Link href="/notifications" className="inline-flex items-center text-sm text-slate-500 hover:text-emerald-600">
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to notifications
        </Link>
        {offer.listing_id ? (
          <Link
            href={`/marketplace/${offer.listing_id}`}
            className="inline-flex items-center text-sm text-slate-500 hover:text-emerald-600"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back to source listing
          </Link>
        ) : null}
        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
          {offer.status === 'active_escrow'
            ? 'Active Deal Room Open'
            : termsAccepted
              ? 'Offer Agreed'
              : 'Pre-Deal Negotiation'}
        </Badge>
      </div>

      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{offer.commodity}</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Negotiate here first, then align on the deal terms. The active escrow room opens only
            after the offer is accepted and both parties click Open Deal Room.
          </p>
          <p className="mt-3 max-w-3xl text-sm text-slate-500">
            This thread is the last stop before the protected room. Terms must be accepted first,
            and the second confirmed Open Deal Room click starts the funding window.
          </p>
        </div>
      </div>

      {relevantNotification ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {relevantNotification.message}
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="border-b border-slate-100">
              <CardTitle>Negotiation Thread</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                Buyer and seller exchange messages here before either side opens the protected
                Deal Room. This shared conversation becomes the recorded negotiation history.
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Buyer</div>
                  <div className="mt-2 text-sm font-medium text-slate-900">{buyer?.displayName}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Seller</div>
                  <div className="mt-2 text-sm font-medium text-slate-900">{seller?.displayName}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Recorded messages</div>
                  <div className="mt-2 text-sm font-medium text-slate-900">
                    {messages.length.toLocaleString('id-ID')}
                  </div>
                </div>
              </div>

              {messages.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                  No messages yet. Use this thread to capture delivery terms, quality expectations, and intent before activation.
                </div>
              ) : (
                <div className="flex min-h-[28rem] flex-col justify-end rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="space-y-4">
                  {messages.map((message, index) => {
                    const author = demoProfiles[message.author_id];
                    const isCurrentActor = actorId === message.author_id;
                    const previousMessage = index > 0 ? messages[index - 1] : null;
                    const showDayLabel =
                      !previousMessage ||
                      formatMessageDay(previousMessage.created_at) !==
                        formatMessageDay(message.created_at);
                    const hasCounterpartyReplyAfter = messages.some(
                      (candidate) =>
                        candidate.created_at > message.created_at &&
                        candidate.author_id !== message.author_id,
                    );
                    return (
                      <div key={message.id} className="space-y-2">
                        {showDayLabel ? (
                          <div className="flex justify-center">
                            <span className="text-xs font-medium text-slate-400">
                              {formatMessageDay(message.created_at)}
                            </span>
                          </div>
                        ) : null}
                        <div
                          className={`flex ${isCurrentActor ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                              isCurrentActor
                                ? 'rounded-br-md border border-emerald-200 bg-emerald-50'
                                : 'rounded-bl-md border border-slate-200 bg-white'
                            }`}
                          >
                            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                              {message.body}
                            </p>
                            <div className="mt-2 flex items-center justify-end gap-1 text-[11px] text-slate-500">
                              <span>{formatMessageTime(message.created_at)}</span>
                              {isCurrentActor ? (
                                hasCounterpartyReplyAfter ? (
                                  <CheckCheck className="h-3.5 w-3.5 text-emerald-600" />
                                ) : (
                                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                                )
                              ) : null}
                            </div>
                        </div>
                        </div>
                        {!isCurrentActor ? (
                          <div className="px-1 text-xs text-slate-400">
                            {author?.displayName || message.author_id}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {isParticipant ? <NegotiationComposer offerId={offer.id} /> : null}
        </div>

        <div className="space-y-6">
          <Card className="border-emerald-200">
            <CardHeader className="border-b border-emerald-100 bg-emerald-50">
              <CardTitle className="text-emerald-900">Deal Terms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Volume</span>
                <span className="font-medium text-slate-900">
                  {(offer.volume_kg ?? 0).toLocaleString('id-ID')} kg
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Price</span>
                <span className="font-medium text-slate-900">
                  {offer.price_per_kg_idr
                    ? `Rp ${offer.price_per_kg_idr.toLocaleString('id-ID')} / kg`
                    : 'TBD'}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                <span className="font-medium text-slate-900">Indicative value</span>
                <span className="text-lg font-bold text-emerald-600">
                  Rp {offer.principal_idr.toLocaleString('id-ID')}
                </span>
              </div>
              {offer.terms_note ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  <div className="mb-2 font-medium text-slate-900">Terms note</div>
                  <p className="whitespace-pre-wrap leading-6">{offer.terms_note}</p>
                </div>
              ) : null}
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-slate-900">Offer status</div>
                    <div className="text-xs text-slate-500">
                      {termsAccepted
                        ? 'Both sides agreed the commercial baseline.'
                        : 'The counterparty must accept these terms before Open Deal Room is enabled.'}
                    </div>
                  </div>
                  <Badge className={termsAccepted ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200'}>
                    {termsAccepted ? 'Accepted' : 'Pending acceptance'}
                  </Badge>
                </div>
              </div>
              {isParticipant ? (
                <DealTermsActionButton
                  offerId={offer.id}
                  canAcceptTerms={canAcceptTerms}
                  termsAccepted={termsAccepted}
                  hasOpened={hasOpened}
                  activeDealId={offer.active_deal_id}
                />
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-emerald-200">
            <CardHeader className="border-b border-emerald-100 bg-emerald-50">
              <CardTitle className="text-emerald-900">Commitment Gate</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-slate-900">{buyer?.displayName}</div>
                    <div className="text-xs text-slate-500">Buyer commitment</div>
                  </div>
                  <Badge className={buyerOpened ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200'}>
                    {buyerOpened ? 'Opened' : 'Pending'}
                  </Badge>
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-slate-900">{seller?.displayName}</div>
                    <div className="text-xs text-slate-500">Seller commitment</div>
                  </div>
                  <Badge className={sellerOpened ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200'}>
                    {sellerOpened ? 'Opened' : 'Pending'}
                  </Badge>
                </div>
              </div>

              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                {termsAccepted
                  ? 'One commitment click is only a signal. The second confirmed click activates the active escrow room and opens the deposit window.'
                  : 'Open Deal Room stays locked until the submitted offer terms are accepted by both sides.'}
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                {!termsAccepted ? (
                  <div className="flex items-start gap-2">
                    <Clock3 className="mt-0.5 h-4 w-4 text-slate-500" />
                    <span>
                      Keep negotiating and finalize the deal terms first. Open Deal Room becomes
                      available only after the counterparty accepts the offer.
                    </span>
                  </div>
                ) : bothOpened ? (
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-600" />
                      <span>Both parties committed. The active escrow room is ready for the funding window.</span>
                    </div>
                    {offer.active_deal_id ? (
                      <Link href={`/deals/${offer.active_deal_id}`} className="font-medium text-emerald-700 hover:text-emerald-800">
                        Enter Active Escrow Room
                      </Link>
                    ) : null}
                  </div>
                ) : counterpartOpened ? (
                  <div className="flex items-start gap-2">
                    <Mail className="mt-0.5 h-4 w-4 text-amber-600" />
                    <span>Your counterpart has already clicked Open Deal Room. Your click will activate the escrow room.</span>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <Clock3 className="mt-0.5 h-4 w-4 text-slate-500" />
                    <span>This room is still in negotiation. Deposits stay locked until both sides commit.</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-slate-100">
              <CardTitle>Activation Reminder</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6 text-sm">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
                <div className="mb-2 flex items-center gap-2 font-medium text-slate-700">
                  <Handshake className="h-4 w-4 text-emerald-600" />
                  After the room activates
                </div>
                Buyer deposits principal, buyer bond, and buyer fee. Seller deposits performance
                bond and seller fee. Stellar-backed lock and proof start downstream from that
                active room.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
