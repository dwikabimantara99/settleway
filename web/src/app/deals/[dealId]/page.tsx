import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  Landmark,
  MessageSquareText,
  ShieldCheck,
  Upload,
  WalletCards,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { StatusPill } from '@/components/ui/StatusPill';
import { Stepper, Step } from '@/components/ui/Stepper';
import { DealActions } from '@/components/deal/DealActions';
import { EvidenceSubmitter } from '@/components/deal/EvidenceSubmitter';
import { getCurrentUser } from '@/lib/auth/server';
import { demoProfiles } from '@/lib/demo/demo-data';
import { getDeal } from '@/lib/db/deals';
import { getDealDepositDeadlineAt, getDealDepositWindowHours, getDealOfferId } from '@/lib/deals/terms';
import {
  isClosedDealStatus,
  isFundingWindowDealStatus,
  isPostLockDealStatus,
  isPostProofDealStatus,
  type DealStatus,
} from '@/lib/escrow/state-machine';
import { rebuildReputationAggregate } from '@/lib/reputation/engine';
import { buildDealRoomWalletCards } from '@/lib/stellar/demo-wallets';
import type { DbEscrowEvent, DbReputationEvent } from '@/lib/db/types';
import { repository } from '@/lib/repositories';

type ViewerRole = 'buyer' | 'seller' | null;

function formatCurrency(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  });
}

function formatCountdown(deadlineAt: string): string {
  const remainingMs = new Date(deadlineAt).getTime() - Date.now();
  if (remainingMs <= 0) {
    return 'Funding window expired';
  }

  const totalMinutes = Math.floor(remainingMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h ${minutes}m remaining`;
  }

  return `${hours}h ${minutes}m remaining`;
}

function getFundedCount(status: DealStatus): number {
  if (status === 'BUYER_FUNDED' || status === 'SELLER_FUNDED') {
    return 1;
  }

  if (isPostLockDealStatus(status)) {
    return 2;
  }

  return 0;
}

function getPartyFundingStatus(
  status: DealStatus,
  party: 'buyer' | 'seller',
  fundedHistorically: boolean,
): { label: string; className: string } {
  const fundedClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
  const pendingClass = 'bg-amber-100 text-amber-800 border-amber-200';
  const closedClass = 'bg-slate-100 text-slate-700 border-slate-200';

  if (status === 'REFUNDED') {
    return fundedHistorically
      ? { label: 'Refunded', className: closedClass }
      : { label: 'Not funded', className: closedClass };
  }

  if ((status === 'EXPIRED' || status === 'CANCELLED') && !fundedHistorically) {
    return { label: 'Not funded', className: closedClass };
  }

  if (isPostLockDealStatus(status)) {
    return { label: 'Funded', className: fundedClass };
  }

  if (status === 'BUYER_FUNDED' && party === 'buyer') {
    return { label: 'Funded', className: fundedClass };
  }

  if (status === 'SELLER_FUNDED' && party === 'seller') {
    return { label: 'Funded', className: fundedClass };
  }

  if (isClosedDealStatus(status)) {
    return { label: 'Closed', className: closedClass };
  }

  return { label: 'Pending', className: pendingClass };
}

function getLatestEvent(events: DbEscrowEvent[], eventTypes: string[]): DbEscrowEvent | null {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const current = events[index];
    if (eventTypes.includes(current.event_type)) {
      return current;
    }
  }

  return null;
}

function eventState(currentStatus: DealStatus, target: DealStatus): 'complete' | 'current' | 'upcoming' {
  const order = ['LOCKED', 'PROOF_SUBMITTED', 'DELIVERED', 'COMPLETED'];
  const currentIndex = order.indexOf(currentStatus);
  const targetIndex = order.indexOf(target);

  if (currentIndex === -1 || targetIndex === -1) {
    return 'upcoming';
  }

  if (currentIndex > targetIndex) {
    return 'complete';
  }

  if (currentIndex === targetIndex) {
    return 'current';
  }

  return 'upcoming';
}

function milestoneStyles(state: 'complete' | 'current' | 'upcoming'): string {
  if (state === 'complete') {
    return 'border-emerald-200 bg-emerald-50';
  }

  if (state === 'current') {
    return 'border-amber-200 bg-amber-50';
  }

  return 'border-slate-200 bg-white';
}

function milestoneBadgeStyles(state: 'complete' | 'current' | 'upcoming'): string {
  if (state === 'complete') {
    return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  }

  if (state === 'current') {
    return 'bg-amber-100 text-amber-800 border-amber-200';
  }

  return 'bg-slate-100 text-slate-700 border-slate-200';
}

function formatEventType(eventType: string): string {
  return eventType
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildEventDetail(event: DbEscrowEvent): string | null {
  const metadata = event.metadata ?? {};

  if (
    typeof metadata.refund_to_party === 'string' &&
    typeof metadata.penalized_party === 'string'
  ) {
    return `Refund ${metadata.refund_to_party} in full before lock. ${metadata.penalized_party} takes the reputation penalty.`;
  }

  if (typeof metadata.refund_to_party === 'string' && metadata.neutral_outcome === true) {
    return `Refund ${metadata.refund_to_party} in full before lock. No reputation penalty applies.`;
  }

  if (metadata.no_slashing_before_lock === true) {
    return 'No slashing applies before lock.';
  }

  if (typeof metadata.original_filename === 'string') {
    return metadata.original_filename;
  }

  if (typeof metadata.protected_value_idr === 'number') {
    return `Protected value ${formatCurrency(metadata.protected_value_idr)}`;
  }

  if (typeof metadata.principal_to_seller_idr === 'number') {
    return `Principal ${formatCurrency(metadata.principal_to_seller_idr)} to seller`;
  }

  if (typeof metadata.deposit_total_idr === 'number') {
    return `Recorded ${formatCurrency(metadata.deposit_total_idr)}`;
  }

  if (typeof event.proof_hash === 'string' && event.proof_hash.length > 0) {
    return `Proof hash ${event.proof_hash.slice(0, 12)}...`;
  }

  return null;
}

function formatOutcomeLabel(outcome: DbReputationEvent['reputation_outcome']): string {
  switch (outcome) {
    case 'transaction_completed':
      return 'Settlement Completed';
    case 'buyer_failed_deposit':
      return 'Buyer Failed Deposit';
    case 'seller_failed_deposit':
      return 'Seller Failed Deposit';
    case 'refunded_before_locked':
      return 'Refunded Before Lock';
    case 'verified_harvest_failure':
      return 'Verified Harvest Failure';
    default:
      return outcome;
  }
}

function formatScoreDelta(scoreDelta: number): string {
  if (scoreDelta > 0) {
    return `+${scoreDelta}`;
  }

  return `${scoreDelta}`;
}

function formatEvidenceVisibility(value: string): string {
  switch (value) {
    case 'deal_only':
      return 'Deal-only';
    case 'public':
      return 'Public';
    case 'private':
      return 'Private';
    default:
      return value;
  }
}

export default async function DealRoomPage({ params }: { params: Promise<{ dealId: string }> }) {
  const resolvedParams = await params;
  const deal = await getDeal(resolvedParams.dealId);

  if (!deal) return notFound();

  const currentUser = await getCurrentUser();
  const viewerRole: ViewerRole =
    currentUser?.id === deal.buyer_id
      ? 'buyer'
      : currentUser?.id === deal.seller_id
        ? 'seller'
        : null;

  const buyer = demoProfiles[deal.buyer_id];
  const seller = demoProfiles[deal.seller_id];
  const evidenceList = await repository.getDealEvidence(deal.id);
  const dealEvents = await repository.getDealEvents(deal.id);
  const dealReputationEvents = await repository.getDealReputationEvents(deal.id);
  const buyerReputationEvents = await repository.getParticipantReputationEvents(deal.buyer_id);
  const sellerReputationEvents = await repository.getParticipantReputationEvents(deal.seller_id);

  const offerId = getDealOfferId(deal.terms);
  const sourceOffer = offerId ? await repository.getOffer(offerId) : null;
  const negotiationMessages = offerId ? await repository.getOfferMessages(offerId) : [];
  const latestNegotiationMessages = negotiationMessages.slice(-2).reverse();

  const latestLockEvent = getLatestEvent(dealEvents, ['escrow_locked']);
  const latestProofEvent = getLatestEvent(dealEvents, ['submit_proof']);
  const latestDeliveryEvent = getLatestEvent(dealEvents, ['mark_delivered']);
  const latestCompletionEvent = getLatestEvent(dealEvents, ['accept_delivery']);
  const latestBuyerFundingEvent = getLatestEvent(dealEvents, ['buyer_deposit']);
  const latestSellerFundingEvent = getLatestEvent(dealEvents, ['seller_deposit']);
  const recentRoomEvents = dealEvents.slice(-6).reverse();
  const sortedDealReputationEvents = [...dealReputationEvents].sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  );
  const buyerOutcomeEvent =
    sortedDealReputationEvents.find((event) => event.participant_role === 'buyer') ?? null;
  const sellerOutcomeEvent =
    sortedDealReputationEvents.find((event) => event.participant_role === 'seller') ?? null;
  const buyerAggregate = rebuildReputationAggregate(buyerReputationEvents);
  const sellerAggregate = rebuildReputationAggregate(sellerReputationEvents);
  const buyerCurrentScore = (buyer?.buyerScore ?? 0) + buyerAggregate.buyer_score;
  const sellerCurrentScore = (seller?.sellerScore ?? 0) + sellerAggregate.seller_score;
  const platformFeeTotalIdr = deal.buyer_fee_idr + deal.seller_fee_idr;
  const anchoredEvidenceCount = evidenceList.filter(
    (evidence) => evidence.chain_operation_reference !== null,
  ).length;
  const status = deal.status;
  const isPostProof = isPostProofDealStatus(status);
  const isPostLock = isPostLockDealStatus(status);
  const isClosed = isClosedDealStatus(status);
  const depositDeadlineAt = getDealDepositDeadlineAt({
    createdAt: deal.created_at,
    terms: deal.terms,
  });
  const depositWindowHours = getDealDepositWindowHours(deal.terms);
  const buyerFundedHistorically =
    isPostLock || status === 'BUYER_FUNDED' || (isClosed && latestBuyerFundingEvent !== null);
  const sellerFundedHistorically =
    isPostLock || status === 'SELLER_FUNDED' || (isClosed && latestSellerFundingEvent !== null);
  const fundedCount =
    Number(buyerFundedHistorically) + Number(sellerFundedHistorically);
  const buyerFundingStatus = getPartyFundingStatus(status, 'buyer', buyerFundedHistorically);
  const sellerFundingStatus = getPartyFundingStatus(status, 'seller', sellerFundedHistorically);
  const fundingSummaryTitle =
    isFundingWindowDealStatus(status) ? 'Funding gate' : 'Funding record';
  const fundingSectionTitle =
    isFundingWindowDealStatus(status) ? 'Funding Gate' : 'Funding Record';
  const walletCards = buildDealRoomWalletCards({
    buyer_label: buyer?.displayName ?? 'Buyer',
    seller_label: seller?.displayName ?? 'Seller',
    buyer_commitment_idr: deal.buyer_total_idr,
    seller_commitment_idr: deal.seller_total_idr,
    platform_fee_target_idr: platformFeeTotalIdr,
    buyer_funding_tx_hash: latestBuyerFundingEvent?.tx_hash ?? null,
    seller_funding_tx_hash: latestSellerFundingEvent?.tx_hash ?? null,
    platform_reference_hash: status === 'COMPLETED' ? deal.latest_stellar_tx_hash : null,
  });

  const steps: Step[] = [
    {
      label: 'Funding Window',
      status: isFundingWindowDealStatus(status) ? 'current' : 'complete',
    },
    {
      label: 'Escrow Locked',
      status:
        status === 'LOCKED'
          ? 'current'
          : status === 'PROOF_SUBMITTED' || status === 'DELIVERED' || status === 'COMPLETED'
            ? 'complete'
            : 'upcoming',
    },
    {
      label: 'Proof Submitted',
      status:
        status === 'PROOF_SUBMITTED'
          ? 'current'
          : status === 'DELIVERED' || status === 'COMPLETED'
            ? 'complete'
            : 'upcoming',
    },
    {
      label: 'Delivered',
      status:
        status === 'DELIVERED'
          ? 'current'
          : status === 'COMPLETED'
            ? 'complete'
            : 'upcoming',
    },
    { label: 'Settled', status: status === 'COMPLETED' ? 'current' : 'upcoming' },
  ];

  let protectedValueText = formatCurrency(deal.principal_idr);
  let helperText = 'Escrow locks on Stellar immediately after both required deposits clear.';
  let roomHeadline = 'Deposit window is live';
  let roomSubline =
    'Buyer and seller have both committed to open this room. Funding is now the only gate before escrow locks.';
  let fundingWindowLabel = formatCountdown(depositDeadlineAt);

  if (status === 'COMPLETED') {
    protectedValueText = 'Settled';
    helperText = 'Settlement has been completed and the protected transaction is closed.';
    roomHeadline = 'Settlement completed';
    roomSubline =
      'Escrow was locked, proof was recorded, and the transaction has reached its end state.';
    fundingWindowLabel = 'Deposits complete';
  } else if (isClosed) {
    protectedValueText = status === 'REFUNDED' ? 'Closed before lock' : 'No lock reached';
    helperText =
      status === 'REFUNDED'
        ? 'This room closed before successful settlement. Any funded side should route back in full according to the pre-lock refund rules.'
        : 'This room closed before successful settlement and never reached the protected lock corridor. No protected payout or slashing path started.';
    roomHeadline = status === 'REFUNDED' ? 'Refund outcome recorded' : 'Funding window expired';
    roomSubline =
      status === 'REFUNDED'
        ? 'This room is closed. Review who was refunded, whether any penalty applied, and how the outcome affects reputation.'
        : 'This room is no longer waiting for new deposits. Review whether anyone funded before expiry and what that means for trust and reputation.';
    fundingWindowLabel = 'Funding window closed';
  } else if (isPostLock) {
    const lockedTotal = deal.principal_idr + deal.buyer_bond_idr + deal.seller_bond_idr;
    protectedValueText = formatCurrency(lockedTotal);
    helperText = 'Escrow is locked and the downstream proof corridor is now active.';
    roomHeadline = 'Escrow locked';
    roomSubline =
      'Both deposits cleared and this transaction has moved into the protected execution corridor.';
    fundingWindowLabel = 'Deposits complete';
  }

  const canViewTransaction =
    Boolean(deal.latest_stellar_tx_hash) && deal.stellar_mode === 'testnet';
  const txHref = canViewTransaction
    ? `https://stellar.expert/explorer/testnet/tx/${deal.latest_stellar_tx_hash}`
    : null;
  const completionMetadata = latestCompletionEvent?.metadata ?? {};
  const settlementReference =
    buyerOutcomeEvent?.settlement_reference ??
    sellerOutcomeEvent?.settlement_reference ??
    (typeof completionMetadata.settlement_reference === 'string'
      ? completionMetadata.settlement_reference
      : null);
  const settledAt =
    buyerOutcomeEvent?.settled_at ??
    sellerOutcomeEvent?.settled_at ??
    (typeof completionMetadata.settled_at === 'string' ? completionMetadata.settled_at : null);

  const postLockMilestones = [
    {
      key: 'locked',
      title: 'Escrow Locked',
      state: eventState(status, 'LOCKED'),
      detail: 'Both deposits are confirmed and the protected execution corridor is active.',
      meta:
        latestLockEvent !== null
          ? formatDateTime(latestLockEvent.created_at)
          : status === 'LOCKED' || status === 'PROOF_SUBMITTED' || status === 'DELIVERED' || status === 'COMPLETED'
            ? 'Locked state reached'
            : 'Waiting for both deposits',
    },
    {
      key: 'proof',
      title: 'Proof Submitted',
      state: eventState(status, 'PROOF_SUBMITTED'),
      detail: deal.proof_hash
        ? `Proof hash ${deal.proof_hash.slice(0, 16)}... recorded in the room`
        : 'Seller records delivery evidence and proof hash',
      meta:
        latestProofEvent !== null
          ? formatDateTime(latestProofEvent.created_at)
          : 'Pending proof submission',
    },
    {
      key: 'delivered',
      title: 'Delivery Marked',
      state: eventState(status, 'DELIVERED'),
      detail: 'Seller marks the shipment milestone after submitting proof.',
      meta:
        latestDeliveryEvent !== null
          ? formatDateTime(latestDeliveryEvent.created_at)
          : 'Pending delivery milestone',
    },
    {
      key: 'completed',
      title: 'Buyer Accepted',
      state: eventState(status, 'COMPLETED'),
      detail: 'Buyer confirms receipt and the success settlement path closes.',
      meta:
        latestCompletionEvent !== null
          ? formatDateTime(latestCompletionEvent.created_at)
          : 'Pending buyer confirmation',
    },
  ] as const;

  let outcomeCardTitle = 'Outcome & Reputation Consequences';
  let outcomeSummary =
    'Before lock, full refunds and missed-deposit penalties should stay legible inside this room.';
  let buyerOutcomeSummary = 'Waiting for a terminal outcome.';
  let sellerOutcomeSummary = 'Waiting for a terminal outcome.';
  let trustContinuityNote =
    'Room events, escrow references, and reputation updates should remain part of one continuous trust story.';

  if (status === 'COMPLETED') {
    outcomeSummary =
      'Both parties completed the protected path. Reputation gains come from this verified transaction outcome rather than private reviews alone.';
    buyerOutcomeSummary = 'Buyer fulfilled the flow and gains verified reputation from completion.';
    sellerOutcomeSummary =
      'Seller fulfilled the flow and gains verified reputation from completion.';
    trustContinuityNote =
      'Completion, settlement references, and reputation gains all belong to the same protected event trail.';
  } else if (status === 'REFUNDED' && buyerOutcomeEvent?.reputation_outcome === 'seller_failed_deposit') {
    outcomeSummary =
      'The seller missed the deposit commitment before lock. Buyer funding should return in full and the seller absorbs the reputation penalty.';
    buyerOutcomeSummary = 'Buyer: full pre-lock refund, no score loss.';
    sellerOutcomeSummary = 'Seller: missed deposit commitment, reputation reduced.';
    trustContinuityNote =
      'This room keeps the refund story tied to the funding history and the same escrow-linked event trail.';
  } else if (status === 'REFUNDED' && buyerOutcomeEvent?.reputation_outcome === 'buyer_failed_deposit') {
    outcomeSummary =
      'The buyer missed the deposit commitment before lock. Seller funding should return in full and the buyer absorbs the reputation penalty.';
    buyerOutcomeSummary = 'Buyer: missed deposit commitment, reputation reduced.';
    sellerOutcomeSummary = 'Seller: full pre-lock refund, no score loss.';
    trustContinuityNote =
      'The failed funding corridor remains visible through room events and the resulting reputation consequences.';
  } else if (
    status === 'REFUNDED' &&
    buyerOutcomeEvent?.reputation_outcome === 'refunded_before_locked'
  ) {
    outcomeSummary =
      'The room closed before lock without assigning fault. Any funded side should be refunded in full and no party is penalized.';
    buyerOutcomeSummary = 'Buyer: neutral refund outcome before lock.';
    sellerOutcomeSummary = 'Seller: neutral refund outcome before lock.';
    trustContinuityNote =
      'This is an honest pre-lock cancellation path, not a slashing or dispute outcome.';
  } else if (status === 'EXPIRED') {
    outcomeSummary =
      buyerOutcomeEvent === null && sellerOutcomeEvent === null
        ? 'The funding window expired before either side funded. No refund movement, reputation penalty, or post-lock execution was triggered.'
        : 'The funding window expired before both sides completed the gate. No slashing applies before lock and no post-lock execution started.';
    buyerOutcomeSummary =
      buyerOutcomeEvent === null ? 'Buyer: no deposit was recorded before expiry.' : 'Buyer: expiry outcome recorded before lock.';
    sellerOutcomeSummary =
      sellerOutcomeEvent === null ? 'Seller: no deposit was recorded before expiry.' : 'Seller: expiry outcome recorded before lock.';
    trustContinuityNote =
      buyerOutcomeEvent === null && sellerOutcomeEvent === null
        ? 'The room still preserves the failed commitment history even when no party reached the funding threshold.'
        : 'The room still preserves the commitment history even when the transaction never reaches lock.';
  } else if (isPostLock) {
    outcomeCardTitle = 'Dispute Handling Placeholder';
    outcomeSummary =
      'After lock, any dispute must be reviewed through recorded negotiation chat, uploaded evidence, and escrow-linked room events. This MVP does not auto-decide fault.';
    buyerOutcomeSummary =
      'Buyer can point to room evidence, proof milestones, and the escrow history if delivery is contested.';
    sellerOutcomeSummary =
      'Seller can point to room evidence, proof milestones, and the escrow history if performance is contested.';
    trustContinuityNote =
      'Post-lock disputes are framed honestly here: strong evidence continuity, no fake automated judgment claims.';
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        {sourceOffer ? (
          <Link
            href={`/offers/${sourceOffer.id}`}
            className="inline-flex items-center text-sm text-slate-500 hover:text-emerald-600"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back to recorded negotiation
          </Link>
        ) : null}
        <Link
          href="/marketplace"
          className="inline-flex items-center text-sm text-slate-500 hover:text-emerald-600"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to Marketplace
        </Link>
      </div>

      <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold text-slate-900">{deal.commodity}</h1>
              <StatusPill status={deal.status} />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <span>Deal ID</span>
              <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs text-slate-700">
                {deal.id}
              </span>
              {sourceOffer ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-900">
                  Activated from recorded negotiation
                  <Link
                    href={`/offers/${sourceOffer.id}`}
                    className="text-emerald-700 underline decoration-emerald-400 underline-offset-2 hover:text-emerald-800"
                  >
                    Open thread
                  </Link>
                </span>
              ) : null}
            </div>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">{roomSubline}</p>
          </div>

          <div className="min-w-[18rem] rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-700" />
              <div>
                <div className="text-sm font-semibold text-emerald-900">
                  Protected by escrow logic and recorded on Stellar
                </div>
                <div className="mt-1 text-xs leading-5 text-emerald-900">
                  Funding, lock, proof, refund, and settlement remain part of one trust trail.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr_0.9fr]">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-amber-900">
              <Clock3 className="h-4 w-4" />
              {roomHeadline}
            </div>
            <div className="text-2xl font-semibold text-slate-900">{fundingWindowLabel}</div>
            <div className="mt-2 text-xs text-slate-600">
              Deposit deadline: {formatDateTime(depositDeadlineAt)}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-2 text-sm font-medium text-slate-900">{fundingSummaryTitle}</div>
            <div className="text-2xl font-semibold text-slate-900">{fundedCount} of 2 funded</div>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
                <span className="text-sm text-slate-600">Buyer</span>
                <Badge className={buyerFundingStatus.className}>{buyerFundingStatus.label}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
                <span className="text-sm text-slate-600">Seller</span>
                <Badge className={sellerFundingStatus.className}>{sellerFundingStatus.label}</Badge>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-2 text-sm font-medium text-slate-900">Trust layer</div>
            <div className="text-sm leading-6 text-slate-600">{helperText}</div>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span>Protected value {protectedValueText}</span>
              {txHref ? (
                <a
                  href={txHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-emerald-700 hover:text-emerald-800"
                >
                  View Transaction
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
              ) : (
                <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 font-medium text-slate-500">
                  View Transaction
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-7 border-t border-slate-100 pt-5">
          <Stepper steps={steps} className="w-full px-1" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.45fr_0.85fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="border-b border-slate-100">
              <CardTitle>{fundingSectionTitle}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{buyer?.displayName}</div>
                      <div className="text-xs text-slate-500">Buyer deposit obligation</div>
                    </div>
                    <Badge className={buyerFundingStatus.className}>{buyerFundingStatus.label}</Badge>
                  </div>
                  <div className="space-y-2 text-sm text-slate-600">
                    <div className="flex items-center justify-between">
                      <span>Principal</span>
                      <span>{formatCurrency(deal.principal_idr)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Bond (5%)</span>
                      <span>{formatCurrency(deal.buyer_bond_idr)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Fee (0.5%)</span>
                      <span>{formatCurrency(deal.buyer_fee_idr)}</span>
                    </div>
                  </div>
                  <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                    Total due from buyer{' '}
                    <span className="font-semibold">{formatCurrency(deal.buyer_total_idr)}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                    <WalletCards className="h-4 w-4 text-emerald-600" />
                    Reputation score {buyerCurrentScore}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{seller?.displayName}</div>
                      <div className="text-xs text-slate-500">Seller deposit obligation</div>
                    </div>
                    <Badge className={sellerFundingStatus.className}>{sellerFundingStatus.label}</Badge>
                  </div>
                  <div className="space-y-2 text-sm text-slate-600">
                    <div className="flex items-center justify-between">
                      <span>Bond (5%)</span>
                      <span>{formatCurrency(deal.seller_bond_idr)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Fee (0.5%)</span>
                      <span>{formatCurrency(deal.seller_fee_idr)}</span>
                    </div>
                  </div>
                  <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                    Total due from seller{' '}
                    <span className="font-semibold">{formatCurrency(deal.seller_total_idr)}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                    <Landmark className="h-4 w-4 text-slate-500" />
                    Reputation score {sellerCurrentScore}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                {isClosed
                  ? 'This room closed before escrow lock. Review the funding record above to see who funded, who did not, and how the outcome should affect refunds or reputation.'
                  : `If the ${depositWindowHours}-hour funding window ends before both deposits clear,
                the funded side should be refunded in full and the non-funding side takes the
                reputation penalty. No slashing applies before lock.`}
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Role Wallets</div>
                    <div className="mt-1 text-xs text-slate-500">
                      Public Testnet identities for the buyer, seller, and Settleway fee path.
                    </div>
                  </div>
                  <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-900">
                    Controlled demo identities
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-3">
                  {walletCards.map((wallet) => (
                    <div
                      key={wallet.key}
                      className="rounded-xl border border-slate-200 bg-white p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{wallet.title}</div>
                          <div className="mt-1 text-xs text-slate-500">{wallet.owner_label}</div>
                        </div>
                        <Badge className="bg-slate-100 text-slate-700 ring-1 ring-slate-200">
                          {wallet.network_label}
                        </Badge>
                      </div>

                      <div className="mt-4 space-y-3 text-sm">
                        <div>
                          <div className="text-xs uppercase tracking-[0.12em] text-slate-400">
                            Identity alias
                          </div>
                          <div className="mt-1 font-medium text-slate-900">
                            {wallet.identity_alias}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs uppercase tracking-[0.12em] text-slate-400">
                            Public address
                          </div>
                          <div className="mt-1 break-all font-mono text-xs text-slate-700">
                            {wallet.public_address}
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                          <div>
                            <div className="text-xs uppercase tracking-[0.12em] text-slate-400">
                              Balance snapshot
                            </div>
                            <div className="mt-1 font-medium text-slate-900">
                              {wallet.balance_snapshot_label}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs uppercase tracking-[0.12em] text-slate-400">
                              Pending commitment
                            </div>
                            <div className="mt-1 font-medium text-slate-900">
                              {wallet.commitment_value}
                            </div>
                          </div>
                        </div>

                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                          <div className="text-xs uppercase tracking-[0.12em] text-slate-400">
                            {wallet.reference_label}
                          </div>
                          {wallet.reference_href ? (
                            <a
                              href={wallet.reference_href}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1 inline-flex break-all text-xs font-medium text-emerald-700 hover:text-emerald-800"
                            >
                              {wallet.reference_value}
                            </a>
                          ) : (
                            <div className="mt-1 text-xs leading-5 text-slate-600">
                              {wallet.reference_value}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-slate-100">
              <CardTitle>Negotiation Context</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              {sourceOffer ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium text-emerald-900">
                        <MessageSquareText className="h-4 w-4" />
                        Recorded negotiation
                      </div>
                      <div className="mt-1 text-xs text-emerald-900">
                        {negotiationMessages.length} messages captured before escrow activation.
                      </div>
                    </div>
                    <Link
                      href={`/offers/${sourceOffer.id}`}
                      className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
                    >
                      Open recorded thread
                    </Link>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <div className="text-xs text-slate-500">Buyer commitment</div>
                      <div className="mt-1 font-medium text-slate-900">
                        {sourceOffer.buyer_open_room_at
                          ? formatDateTime(sourceOffer.buyer_open_room_at)
                          : 'Pending'}
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <div className="text-xs text-slate-500">Seller commitment</div>
                      <div className="mt-1 font-medium text-slate-900">
                        {sourceOffer.seller_open_room_at
                          ? formatDateTime(sourceOffer.seller_open_room_at)
                          : 'Pending'}
                      </div>
                    </div>
                  </div>

                  {latestNegotiationMessages.length > 0 ? (
                    <div className="space-y-3">
                      {latestNegotiationMessages.map((message) => {
                        const author = demoProfiles[message.author_id];
                        return (
                          <div
                            key={message.id}
                            className="rounded-lg border border-slate-200 bg-white p-4"
                          >
                            <div className="mb-1 flex items-center justify-between gap-3">
                              <div className="text-sm font-medium text-slate-900">
                                {author?.displayName || message.author_id}
                              </div>
                              <div className="text-xs text-slate-500">
                                {formatDateTime(message.created_at)}
                              </div>
                            </div>
                            <p className="text-sm leading-6 text-slate-600">{message.body}</p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                      No negotiation messages were found for this activation record.
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                  This demo deal does not include an attached pre-deal thread. New rooms activated
                  through Submit Offer will preserve negotiation continuity here.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-slate-100">
              <CardTitle>Delivery &amp; Proof</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-medium text-slate-900">Evidence state</div>
                  <div className="mt-1 text-sm leading-6 text-slate-600">
                    {deal.proof_hash
                      ? 'Proof has been recorded in this room.'
                      : isClosed
                        ? 'This room closed before escrow lock, so the proof corridor never opened.'
                      : status === 'LOCKED'
                        ? 'Seller evidence is the next required room action.'
                        : 'Evidence submission opens after escrow lock.'}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-medium text-slate-900">Anchoring state</div>
                  <div className="mt-1 text-sm leading-6 text-slate-600">
                    {evidenceList.length > 0
                      ? `${anchoredEvidenceCount} of ${evidenceList.length} evidence item(s) show an anchoring reference.`
                      : isClosed
                        ? 'No evidence anchoring applies because this room never reached the proof stage.'
                      : 'No evidence item is available for anchoring review yet.'}
                  </div>
                </div>
              </div>

              {deal.proof_hash ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="mb-2 text-sm font-semibold text-emerald-900">Recorded proof hash</div>
                  <div className="break-all rounded bg-white px-3 py-2 font-mono text-xs text-slate-700">
                    {deal.proof_hash}
                  </div>
                </div>
              ) : null}

              {deal.status === 'LOCKED' ? (
                viewerRole === 'buyer' ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
                    Escrow is locked. The seller must submit delivery proof to move this room
                    forward.
                  </div>
                ) : (
                  <EvidenceSubmitter dealId={deal.id} sellerId={deal.seller_id} />
                )
              ) : isClosed ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                  <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-slate-400" />
                  <h3 className="mb-1 text-sm font-semibold text-slate-900">No proof corridor opened</h3>
                  <p className="text-xs text-slate-500">
                    This room closed before escrow lock, so delivery evidence and proof anchoring
                    never became part of the flow.
                  </p>
                </div>
              ) : isPostProof ? (
                evidenceList.length > 0 ? (
                  <div className="space-y-4">
                    {evidenceList.map((evidence) => (
                      <div
                        key={evidence.id}
                        className="rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-sm"
                      >
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <div className="font-semibold text-slate-900">{evidence.original_filename}</div>
                          <Badge variant="outline" className="text-xs capitalize">
                            {evidence.evidence_kind.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="grid gap-2 text-xs text-slate-600 md:grid-cols-2">
                          <div>
                            <span className="font-medium">Submitted by:</span>{' '}
                            {demoProfiles[evidence.submitted_by]?.displayName || evidence.submitted_by}
                          </div>
                          <div>{formatDateTime(evidence.created_at)}</div>
                          <div>
                            <span className="font-medium">Visibility:</span>{' '}
                            {formatEvidenceVisibility(evidence.display_visibility)}
                          </div>
                          <div>{(evidence.byte_size / 1024).toFixed(1)} KB</div>
                          <div className="md:col-span-2 break-all rounded bg-slate-100 px-2 py-1 font-mono text-[10px] text-slate-700">
                            {evidence.sha256_hash}
                          </div>
                        </div>
                        <div className="mt-3 rounded border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600">
                          <div className="flex items-center justify-between gap-3">
                            <span>
                              <span className="font-medium">Anchoring reference:</span>{' '}
                              <span className="font-mono">
                                {evidence.chain_operation_reference || 'pending'}
                              </span>
                            </span>
                            <span className="font-medium text-emerald-700">
                              Anchoring status: {evidence.chain_operation_reference ? 'Confirmed' : 'Pending'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                    <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-emerald-400" />
                    <h3 className="mb-1 text-sm font-semibold text-slate-900">Proof Submitted</h3>
                    <p className="text-xs text-slate-500">
                      Delivery evidence has been submitted and the room advanced to the next
                      milestone.
                    </p>
                  </div>
                )
              ) : (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                  <Upload className="mx-auto mb-3 h-8 w-8 text-slate-400" />
                  <h3 className="mb-1 text-sm font-semibold text-slate-900">
                    Upload Delivery Evidence
                  </h3>
                  <p className="mb-4 text-xs text-slate-500">
                    Evidence submission opens after Stellar-backed escrow lock is confirmed.
                  </p>
                  <Button variant="secondary" size="sm" disabled>
                    Select Files
                  </Button>
                </div>
              )}

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-1 text-sm font-medium text-slate-900">Operator demo cue</div>
                <div className="text-xs leading-5 text-slate-600">
                  For MVP, evidence can be uploaded or simulated; the file hash is recorded for integrity checking.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="border-b border-slate-100 pb-3">
              <CardTitle className="text-sm">Next Action</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <DealActions dealId={deal.id} status={deal.status} viewerRole={viewerRole} />
            </CardContent>
          </Card>

          <Card className="border-emerald-200 shadow-sm">
            <CardHeader className="rounded-t-xl border-b border-emerald-100 bg-emerald-50 pb-4">
              <CardTitle className="flex justify-between text-base text-emerald-900">
                <span>Protected Value</span>
                <span>{protectedValueText}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6 text-sm">
              <div className="text-sm font-semibold text-slate-900">
                {status === 'COMPLETED'
                  ? 'Success Settlement Summary'
                  : isClosed
                    ? 'Closed Funding Snapshot'
                    : 'Success Settlement Logic'}
              </div>
              {status === 'COMPLETED' ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
                  Settled funds are now distributed to the final wallets and this completed outcome
                  is eligible to strengthen buyer and seller reputation.
                </div>
              ) : null}
              {status === 'COMPLETED' ? (
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Settlement Record
                  </div>
                  <div className="mt-3 space-y-2 text-xs text-slate-600">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-500">Settlement reference</span>
                      <span className="font-mono text-slate-700">
                        {settlementReference ?? 'Pending room reference'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-500">Settled at</span>
                      <span className="text-slate-700">
                        {settledAt ? formatDateTime(settledAt) : 'Pending timestamp'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-500">Reputation ledger</span>
                      <span className="font-medium text-emerald-700">Updated for both parties</span>
                    </div>
                  </div>
                </div>
              ) : null}
              {isClosed ? (
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Close-out Snapshot
                  </div>
                  <div className="mt-3 space-y-2 text-xs text-slate-600">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-500">Buyer funding outcome</span>
                      <span className="font-medium text-slate-700">
                        {status === 'REFUNDED' && buyerFundedHistorically
                          ? 'Returned in full'
                          : buyerFundedHistorically
                            ? 'Recorded before close'
                            : 'No funding recorded'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-500">Seller funding outcome</span>
                      <span className="font-medium text-slate-700">
                        {status === 'REFUNDED' && sellerFundedHistorically
                          ? 'Returned in full'
                          : sellerFundedHistorically
                            ? 'Recorded before close'
                            : 'No funding recorded'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-500">Platform fees</span>
                      <span className="font-medium text-slate-700">Not charged before lock</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-500">Seller payout route</span>
                      <span className="font-medium text-slate-700">Did not start</span>
                    </div>
                  </div>
                </div>
              ) : null}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="mb-2 flex items-start gap-2 text-xs text-slate-600">
                  <WalletCards className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>
                    Buyer total <strong>{formatCurrency(deal.buyer_total_idr)}</strong>
                  </span>
                </div>
                <div className="flex items-start gap-2 text-xs text-slate-600">
                  <Landmark className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                  <span>
                    Seller total <strong>{formatCurrency(deal.seller_total_idr)}</strong>
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Buyer principal to seller wallet</span>
                  <span className="font-medium text-slate-900">
                    {status === 'COMPLETED'
                      ? 'Released'
                      : isClosed
                        ? 'Did not start'
                        : 'Pending'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Buyer bond back to buyer wallet</span>
                  <span className="font-medium text-slate-900">
                    {status === 'COMPLETED'
                      ? 'Returned'
                      : isClosed
                        ? buyerFundedHistorically
                          ? 'Closed before lock'
                          : 'Not funded'
                        : 'Pending'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Seller bond back to seller wallet</span>
                  <span className="font-medium text-slate-900">
                    {status === 'COMPLETED'
                      ? 'Returned'
                      : isClosed
                        ? sellerFundedHistorically
                          ? 'Closed before lock'
                          : 'Not funded'
                        : 'Pending'}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                  <span className="text-slate-500">Platform fees to Settleway wallet</span>
                  <span className="font-medium text-slate-900">
                    {isClosed ? 'Not charged before lock' : formatCurrency(platformFeeTotalIdr)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-slate-100 pb-3">
              <CardTitle className="text-sm">Protected Execution Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              {postLockMilestones.map((milestone) => (
                <div
                  key={milestone.key}
                  className={`rounded-lg border px-4 py-3 ${milestoneStyles(milestone.state)}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-slate-900">{milestone.title}</div>
                      <div className="mt-1 text-xs leading-5 text-slate-500">{milestone.meta}</div>
                    </div>
                    <Badge className={milestoneBadgeStyles(milestone.state)}>
                      {milestone.state === 'complete'
                        ? 'Complete'
                        : milestone.state === 'current'
                          ? 'Current'
                          : 'Upcoming'}
                    </Badge>
                  </div>
                </div>
              ))}

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="mb-2 text-sm font-medium text-slate-900">Room Events</div>
                <p className="mb-3 text-xs text-slate-500">Newest entries appear first.</p>
                {recentRoomEvents.length > 0 ? (
                  <div className="space-y-3">
                    {recentRoomEvents.slice(0, 4).map((event) => {
                      const detail = buildEventDetail(event);
                      return (
                        <div key={event.id} className="rounded-lg bg-white px-3 py-3">
                          <div className="text-sm font-medium text-slate-900">
                            {event.message || formatEventType(event.event_type)}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {formatDateTime(event.created_at)}
                          </div>
                          {detail ? <div className="mt-2 text-xs text-slate-600">{detail}</div> : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                    No room events recorded yet for this deal.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-slate-100 pb-3">
              <CardTitle className="text-sm">{outcomeCardTitle}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6 text-sm">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-600">
                {outcomeSummary}
              </div>
              <div className="space-y-3">
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="text-xs text-slate-500">Buyer consequence</div>
                  <div className="mt-1 font-medium text-slate-900">{buyerOutcomeSummary}</div>
                  {buyerOutcomeEvent ? (
                    <div className="mt-2 text-xs text-slate-500">
                      {formatOutcomeLabel(buyerOutcomeEvent.reputation_outcome)} | score{' '}
                      {formatScoreDelta(buyerOutcomeEvent.score_delta)}
                    </div>
                  ) : null}
                  {buyerOutcomeEvent ? (
                    <div className="mt-1 text-xs text-slate-500">
                      Latest room outcome: {formatOutcomeLabel(buyerOutcomeEvent.reputation_outcome)} ({formatScoreDelta(buyerOutcomeEvent.score_delta)})
                    </div>
                  ) : null}
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="text-xs text-slate-500">Seller consequence</div>
                  <div className="mt-1 font-medium text-slate-900">{sellerOutcomeSummary}</div>
                  {sellerOutcomeEvent ? (
                    <div className="mt-2 text-xs text-slate-500">
                      {formatOutcomeLabel(sellerOutcomeEvent.reputation_outcome)} | score{' '}
                      {formatScoreDelta(sellerOutcomeEvent.score_delta)}
                    </div>
                  ) : null}
                  {sellerOutcomeEvent ? (
                    <div className="mt-1 text-xs text-slate-500">
                      Latest room outcome: {formatOutcomeLabel(sellerOutcomeEvent.reputation_outcome)} ({formatScoreDelta(sellerOutcomeEvent.score_delta)})
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
                {trustContinuityNote}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-slate-100 pb-3">
              <CardTitle className="text-sm">Stellar Reference</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-6 text-sm">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Contract / mode</div>
                <div className="mt-1 break-all font-mono text-xs text-slate-700">
                  {deal.stellar_contract_id
                    ? deal.stellar_contract_id
                    : deal.stellar_mode === 'mock_only'
                      ? 'Demo mode'
                      : 'Pending'}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Latest Tx</div>
                <div className="mt-1 break-all font-mono text-xs text-slate-700">
                  {deal.latest_stellar_tx_hash
                    ? deal.latest_stellar_tx_hash
                    : deal.stellar_mode === 'mock_only'
                      ? 'Demo mode'
                      : 'Pending'}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
