import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  Copy,
  FileCheck2,
  Flag,
  ReceiptText,
  ShieldCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { StatusPill } from '@/components/ui/StatusPill';
import { Step } from '@/components/ui/Stepper';
import { DealRoomTabs } from '@/components/deal/DealRoomTabs';
import { EvidenceSubmitter } from '@/components/deal/EvidenceSubmitter';
import { EscrowTimeline } from '@/components/deal/EscrowTimeline';
import { getCurrentUser } from '@/lib/auth/server';
import { demoProfiles } from '@/lib/demo/demo-data';
import { repository } from '@/lib/repositories';
import { getDealDepositDeadlineAt, getDealOfferId } from '@/lib/deals/terms';
import {
  isClosedDealStatus,
  isFundingWindowDealStatus,
  isPostLockDealStatus,
} from '@/lib/escrow/state-machine';
import {
  buildDealRoomWalletCards,
  type DealRoomWalletStateTone,
} from '@/lib/stellar/demo-wallets';
import type { DbEscrowEvent, DbReputationEvent } from '@/lib/db/types';
import {
  createProfilePayoutDestinationSnapshot,
  createWalletPayoutDestinationSnapshot,
  formatPayoutDestinationLabel,
  formatPayoutDestinationRail,
  formatPayoutDestinationReference,
  isPayoutDestinationSnapshot,
} from '@/lib/payout-destinations';

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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function formatPricePerKg(principalIdr: number, volumeKg: number | null): string {
  if (!volumeKg) return 'Pending';
  return `${formatCurrency(Math.round(principalIdr / volumeKg))}/kg`;
}

function parseDeliveryDeadline(note: string | null): string {
  if (!note) return '24 May 2025';
  const deliveryLine = note
    .split('\n')
    .find((line) => line.toLowerCase().startsWith('delivery deadline:'));
  return deliveryLine?.replace(/^delivery deadline:\s*/i, '').trim() || '24 May 2025';
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

function formatEventType(eventType: string): string {
  return eventType
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildEventDetail(event: DbEscrowEvent): string | null {
  const metadata = event.metadata ?? {};

  if (typeof metadata.refund_to_party === 'string' && typeof metadata.penalized_party === 'string') {
    return `Refund ${metadata.refund_to_party} in full before lock. ${metadata.penalized_party} takes the reputation penalty.`;
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

function buildTestnetTxHref(txHash: string | null, stellarMode: string): string | null {
  if (!txHash || stellarMode !== 'testnet') {
    return null;
  }

  return `https://stellar.expert/explorer/testnet/tx/${txHash}`;
}

function walletStateBadgeClassName(tone: DealRoomWalletStateTone): string {
  if (tone === 'funded') {
    return 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200';
  }

  if (tone === 'closed') {
    return 'bg-slate-100 text-slate-700 ring-1 ring-slate-200';
  }

  if (tone === 'settled') {
    return 'bg-blue-100 text-blue-800 ring-1 ring-blue-200';
  }

  return 'bg-amber-100 text-amber-800 ring-1 ring-amber-200';
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
  const deal = await repository.getDeal(resolvedParams.dealId);

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
  const [
    buyerProfile,
    sellerProfile,
    evidenceList,
    dealEvents,
    dealReputationEvents,
  ] = await Promise.all([
    repository.getProfile(deal.buyer_id),
    repository.getProfile(deal.seller_id),
    repository.getDealEvidence(deal.id),
    repository.getDealEvents(deal.id),
    repository.getDealReputationEvents(deal.id),
  ]);

  const buyerDisplayName = buyerProfile?.display_name ?? buyer?.displayName ?? 'Buyer';
  const sellerDisplayName = sellerProfile?.display_name ?? seller?.displayName ?? 'Seller';
  const offerId = getDealOfferId(deal.terms);
  const sourceOffer = offerId ? await repository.getOffer(offerId) : null;
  const negotiationMessages = offerId ? await repository.getOfferMessages(offerId) : [];
  const latestNegotiationMessages = negotiationMessages.slice(-2).reverse();
  const deliveryDeadline = parseDeliveryDeadline(sourceOffer?.terms_note ?? null);

  const status = deal.status;
  const isPostLock = isPostLockDealStatus(status);
  const isClosed = isClosedDealStatus(status);
  const isFundingWindow = isFundingWindowDealStatus(status);
  const depositDeadlineAt = getDealDepositDeadlineAt({
    createdAt: deal.created_at,
    terms: deal.terms,
  });

  const latestLockEvent = getLatestEvent(dealEvents, ['escrow_locked']);
  const latestProofEvent = getLatestEvent(dealEvents, ['submit_proof']);
  const latestBuyerFundingEvent = getLatestEvent(dealEvents, ['buyer_deposit']);
  const latestSellerFundingEvent = getLatestEvent(dealEvents, ['seller_deposit']);
  const latestCompletionEvent = getLatestEvent(dealEvents, ['accept_delivery']);
  const recentRoomEvents = dealEvents.slice(-5).reverse();
  const sortedDealReputationEvents = [...dealReputationEvents].sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  );
  const buyerOutcomeEvent =
    sortedDealReputationEvents.find((event) => event.participant_role === 'buyer') ?? null;
  const sellerOutcomeEvent =
    sortedDealReputationEvents.find((event) => event.participant_role === 'seller') ?? null;

  const buyerFundedHistorically =
    isPostLock ||
    status === 'BUYER_FUNDED' ||
    status === 'CUSTODY_PENDING' ||
    (isClosed && latestBuyerFundingEvent !== null);
  const sellerFundedHistorically =
    isPostLock ||
    status === 'SELLER_FUNDED' ||
    status === 'CUSTODY_PENDING' ||
    (isClosed && latestSellerFundingEvent !== null);
  const platformFeeTotalIdr = deal.buyer_fee_idr + deal.seller_fee_idr;
  const pricePerKg = formatPricePerKg(deal.principal_idr, deal.volume_kg);

  const walletCards = buildDealRoomWalletCards({
    buyer_label: buyerDisplayName,
    seller_label: sellerDisplayName,
    buyer_commitment_idr: deal.buyer_total_idr,
    seller_commitment_idr: deal.seller_total_idr,
    platform_fee_target_idr: platformFeeTotalIdr,
    buyer_funding_tx_hash: latestBuyerFundingEvent?.tx_hash ?? null,
    seller_funding_tx_hash: latestSellerFundingEvent?.tx_hash ?? null,
    platform_reference_hash: status === 'COMPLETED' ? deal.latest_stellar_tx_hash : null,
    buyer_funded: buyerFundedHistorically,
    seller_funded: sellerFundedHistorically,
    room_state:
      status === 'COMPLETED'
        ? 'completed'
        : isClosed
          ? 'closed_pre_lock'
          : isPostLock
            ? 'post_lock'
            : 'funding_window',
  });

  const steps: Step[] = [
    { label: 'Terms Agreed', status: 'complete' },
    {
      label: 'Funding',
      status: isFundingWindow || isClosed ? 'current' : 'complete',
      detail: isClosed ? 'Closed before lock' : undefined,
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
      label: 'Delivery & Proof',
      status:
        status === 'PROOF_SUBMITTED'
          ? 'current'
          : status === 'DELIVERED' || status === 'COMPLETED'
            ? 'complete'
            : 'upcoming',
    },
    {
      label: 'Buyer Review',
      status: status === 'DELIVERED' ? 'current' : status === 'COMPLETED' ? 'complete' : 'upcoming',
    },
    { label: 'Settled', status: status === 'COMPLETED' ? 'current' : 'upcoming' },
  ];

  let roomHeadline = 'Deposit window is live';
  let roomSubline =
    'Buyer and seller have both committed to open this room. Funding is now the only gate before escrow locks.';
  let protectedValueText = formatCurrency(deal.principal_idr);
  let fundingWindowLabel = formatCountdown(depositDeadlineAt);

  if (status === 'COMPLETED') {
    roomHeadline = 'Settlement completed';
    roomSubline =
      'Escrow was locked, proof was recorded, and the transaction has reached its end state.';
    protectedValueText = 'Settled';
    fundingWindowLabel = 'Deposits complete';
  } else if (isClosed) {
    roomHeadline = status === 'REFUNDED' ? 'Refund outcome recorded' : 'Funding window expired';
    roomSubline =
      status === 'REFUNDED'
        ? 'Review who was refunded, whether any penalty applied, and how the outcome affects reputation.'
        : 'The funding window expired before either side funded. No refund movement, reputation penalty, or post-lock execution was triggered.';
    protectedValueText = status === 'REFUNDED' ? 'Closed before lock' : 'No lock reached';
    fundingWindowLabel = 'Funding window closed';
  } else if (status === 'CUSTODY_PENDING') {
    roomHeadline = 'Preparing escrow custody';
    roomSubline =
      'Both wallet funding transfers are confirmed. Settleway is moving the committed funds into escrow custody before lock.';
    protectedValueText = formatCurrency(deal.principal_idr + deal.buyer_bond_idr + deal.seller_bond_idr);
    fundingWindowLabel = 'Custody transfer pending';
  } else if (isPostLock) {
    roomHeadline = 'Escrow locked';
    roomSubline =
      'Both deposits cleared and this transaction has moved into the protected execution corridor.';
    protectedValueText = formatCurrency(deal.principal_idr + deal.buyer_bond_idr + deal.seller_bond_idr);
    fundingWindowLabel = 'Deposits complete';
  }

  if (isFundingWindow) {
    // EscrowTimeline handles funding states and actions
  }

  let outcomeCardTitle = 'Outcome & Reputation Consequences';
  let outcomeSummary = 'Before lock, full refunds and missed-deposit penalties should stay legible inside this room.';
  let buyerOutcomeSummary = 'Buyer: funding and reputation outcome pending.';
  let sellerOutcomeSummary = 'Seller: funding and reputation outcome pending.';
  let trustContinuityNote =
    'Funding, lock, proof, settlement, and reputation all belong to the same protected event trail.';

  if (status === 'COMPLETED') {
    outcomeCardTitle = 'Success Settlement Summary';
    outcomeSummary =
      'Settlement completed. Principal, bonds, fees, proof, and reputation updates are now part of the completed room record.';
    buyerOutcomeSummary = 'Buyer bond returned and completion reputation recorded.';
    sellerOutcomeSummary = 'Seller received principal, seller bond returned, and completion reputation recorded.';
    trustContinuityNote =
      'Completion, settlement references, and reputation gains all belong to the same protected event trail.';
  } else if (status === 'REFUNDED' && buyerOutcomeEvent?.reputation_outcome === 'seller_failed_deposit') {
    outcomeSummary =
      'The seller missed the deposit commitment before lock. Buyer funding should return in full and the seller absorbs the reputation penalty.';
    buyerOutcomeSummary = 'Buyer: full pre-lock refund, no score loss.';
    sellerOutcomeSummary = 'Seller: missed deposit commitment, reputation reduced.';
  } else if (status === 'REFUNDED' && buyerOutcomeEvent?.reputation_outcome === 'buyer_failed_deposit') {
    outcomeSummary =
      'The buyer missed the deposit commitment before lock. Seller funding should return in full and the buyer absorbs the reputation penalty.';
    buyerOutcomeSummary = 'Buyer: missed deposit commitment, reputation reduced.';
    sellerOutcomeSummary = 'Seller: full pre-lock refund, no score loss.';
  } else if (status === 'REFUNDED') {
    outcomeSummary =
      'The room closed before lock without assigning fault. Any funded side should be refunded in full and no party is penalized.';
    buyerOutcomeSummary = buyerFundedHistorically
      ? 'Buyer: full pre-lock refund, no score loss.'
      : 'Buyer: neutral refund outcome before lock.';
    sellerOutcomeSummary = sellerFundedHistorically
      ? 'Seller: full pre-lock refund, no score loss.'
      : 'Seller: neutral refund outcome before lock.';
  } else if (status === 'EXPIRED') {
    outcomeCardTitle = 'Closed Funding Snapshot';
    outcomeSummary =
      'The funding window expired before either side funded. No refund movement, reputation penalty, or post-lock execution was triggered.';
    buyerOutcomeSummary = 'Buyer: no deposit was recorded before expiry.';
    sellerOutcomeSummary = 'Seller: no deposit was recorded before expiry.';
  } else if (isPostLock) {
    outcomeSummary =
      'After lock, any dispute must be reviewed through recorded negotiation chat, uploaded evidence, and escrow-linked room events. This MVP does not auto-decide fault.';
    buyerOutcomeSummary =
      'Buyer can point to room evidence, proof milestones, and the escrow history if delivery is contested.';
    sellerOutcomeSummary =
      'Seller can point to room evidence, proof milestones, and the escrow history if performance is contested.';
  }

  const lockTxHash =
    latestLockEvent?.tx_hash ?? (status === 'LOCKED' ? deal.latest_stellar_tx_hash : null);
  const lockTxHref = buildTestnetTxHref(lockTxHash, deal.stellar_mode);
  const latestTxHref = buildTestnetTxHref(deal.latest_stellar_tx_hash, deal.stellar_mode);
  const completionTxHash = status === 'COMPLETED' ? deal.latest_stellar_tx_hash : null;
  const completionTxHref = buildTestnetTxHref(completionTxHash, deal.stellar_mode);
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
  const platformWalletCard = walletCards.find((wallet) => wallet.key === 'platform') ?? null;
  const buyerPayoutDestination = isPayoutDestinationSnapshot(completionMetadata.buyer_payout_destination)
    ? completionMetadata.buyer_payout_destination
    : buyerProfile
      ? createProfilePayoutDestinationSnapshot(buyerProfile)
      : null;
  const sellerPayoutDestination = isPayoutDestinationSnapshot(completionMetadata.seller_payout_destination)
    ? completionMetadata.seller_payout_destination
    : sellerProfile
      ? createProfilePayoutDestinationSnapshot(sellerProfile)
      : null;
  const platformPayoutDestination = isPayoutDestinationSnapshot(
    completionMetadata.platform_payout_destination,
  )
    ? completionMetadata.platform_payout_destination
    : createWalletPayoutDestinationSnapshot(
        'Settleway fee wallet',
        platformWalletCard?.public_address ?? null,
      );
  const completedPayoutRoutes = [
    {
      key: 'buyer-bond',
      title: 'Buyer bond return',
      statusLabel: 'Returned',
      amount: formatCurrency(deal.buyer_bond_idr),
      destination: buyerPayoutDestination,
      fallbackLabel: 'Buyer destination',
    },
    {
      key: 'seller-principal',
      title: 'Seller principal receipt',
      statusLabel: 'Released',
      amount: formatCurrency(deal.principal_idr),
      destination: sellerPayoutDestination,
      fallbackLabel: 'Seller destination',
    },
    {
      key: 'seller-bond',
      title: 'Seller bond return',
      statusLabel: 'Returned',
      amount: formatCurrency(deal.seller_bond_idr),
      destination: sellerPayoutDestination,
      fallbackLabel: 'Seller destination',
    },
    {
      key: 'platform-fees',
      title: 'Platform fee retention',
      statusLabel: 'Retained',
      amount: formatCurrency(platformFeeTotalIdr),
      destination: platformPayoutDestination,
      fallbackLabel: 'Settleway fee wallet',
    },
  ];

  return (
    <div className="mx-auto max-w-7xl overflow-x-hidden px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-7">
        {sourceOffer ? (
          <Link
            href={`/offers/${sourceOffer.id}`}
            className="inline-flex items-center text-sm text-slate-500 hover:text-emerald-600"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back to recorded negotiation
          </Link>
        ) : (
          <Link
            href="/marketplace"
            className="inline-flex items-center text-sm text-slate-500 hover:text-emerald-600"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back to Agreement
          </Link>
        )}
      </div>

      <header className="mb-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div>
          <div className="flex flex-wrap items-center gap-4">
            <h1 className="text-4xl font-bold tracking-tight text-slate-950">{deal.commodity}</h1>
            <StatusPill status={status} />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-base font-medium text-slate-700">
            <span className="inline-flex items-center gap-2">
              <Building2 className="h-5 w-5 text-emerald-600" />
              {buyerDisplayName}
            </span>
            <ArrowRight className="h-4 w-4 text-slate-400" />
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              {sellerDisplayName}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-base text-slate-600">
            <span>{(deal.volume_kg ?? 0).toLocaleString('id-ID')} kg</span>
            <span className="text-slate-300">|</span>
            <span>{pricePerKg}</span>
            <span className="text-slate-300">|</span>
            <span>Protected value {protectedValueText}</span>
          </div>
          <p className="mt-4 max-w-4xl text-sm leading-6 text-slate-600">{roomSubline}</p>
        </div>

        <div className="grid gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Deal ID
                </div>
                <div className="mt-1 break-all font-mono text-sm font-semibold text-slate-900">
                  {deal.id}
                </div>
              </div>
              <Copy className="h-5 w-5 shrink-0 text-slate-400" />
            </div>
            <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
              <ShieldCheck className="h-4 w-4" />
              {deal.stellar_mode === 'testnet' ? 'Stellar Testnet' : 'Demo mode'}
            </div>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-5 shadow-sm">
            <div className="flex items-start gap-4">
              <Clock3 className="mt-1 h-6 w-6 text-amber-600" />
              <div>
                <div className="text-sm font-semibold text-amber-800">
                  {status === 'CUSTODY_PENDING'
                    ? 'Custody transfer status'
                    : isFundingWindow
                      ? 'Deposit window ends in'
                      : roomHeadline}
                </div>
                <div className="mt-1 text-3xl font-bold text-slate-950">{fundingWindowLabel}</div>
                <div className="mt-1 text-sm text-slate-600">
                  Deposit deadline: {formatDateTime(depositDeadlineAt)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <main className="min-w-0 space-y-6">
          <EscrowTimeline
            dealId={deal.id}
            status={status}
            viewerRole={viewerRole}
            userId={currentUser?.id ?? null}
            requiredAmountIdr={viewerRole === 'buyer' ? deal.buyer_total_idr : deal.seller_total_idr}
            isFunded={viewerRole === 'buyer' ? buyerFundedHistorically : sellerFundedHistorically}
            steps={steps}
          />


          <DealRoomTabs
            overviewContent={
              <>
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-slate-950">Negotiation Context</h2>
              {sourceOffer ? (
                <Link
                  href={`/offers/${sourceOffer.id}`}
                  className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 hover:border-emerald-200"
                >
                  Open recorded thread
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              ) : null}
            </div>
            <div className="mb-4 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              Activated from recorded negotiation
            </div>
            <div className="mb-4 text-sm font-semibold text-slate-700">Recorded negotiation</div>
            {latestNegotiationMessages.length > 0 ? (
              <div className="space-y-3">
                {latestNegotiationMessages.map((message) => (
                  <div key={message.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-semibold text-slate-500">
                      {demoProfiles[message.author_id]?.displayName ?? message.author_id}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{message.body}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                Recorded negotiation messages appear here when this room is activated from an offer.
              </div>
            )}
          </section>
              </>
            }
            fundingContent={
              <>
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                  <h3 className="text-lg font-semibold text-slate-950 mb-2">Funding Information</h3>
                  Funding instructions, status, and deadlines are actively displayed at the top of the Deal Room during the funding phase.
                </div>
              </>
            }
            deliveryContent={
              <>
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-slate-950">Delivery & Proof</h2>
              <Badge className="border-slate-200 bg-slate-100 text-slate-700">
                Evidence state
              </Badge>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-950">Evidence state</div>
                <div className="mt-2 text-sm text-slate-600">
                  {evidenceList.length > 0 ? `${evidenceList.length} file recorded` : 'Awaiting delivery proof'}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-950">Anchoring state</div>
                <div className="mt-2 text-sm text-slate-600">
                  {evidenceList.some((item) => item.chain_operation_reference)
                    ? 'Confirmed'
                    : 'Pending'}
                </div>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="text-sm font-semibold text-emerald-900">Operator demo cue</div>
                <div className="mt-2 text-sm leading-6 text-emerald-900">
                  For MVP, evidence can be uploaded or simulated; the file hash is recorded.
                </div>
              </div>
            </div>
            {status === 'LOCKED' ? (
              <EvidenceSubmitter dealId={deal.id} sellerId={deal.seller_id} />
            ) : null}
            {evidenceList.length > 0 ? (
              <div className="mt-5 space-y-3">
                {evidenceList.map((evidence) => (
                  <div key={evidence.id} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-950">{evidence.original_filename}</div>
                        <div className="mt-1 text-xs text-slate-500">{formatBytes(evidence.byte_size)}</div>
                      </div>
                      <Badge
                        className={
                          evidence.chain_operation_reference
                            ? 'border-emerald-200 bg-emerald-100 text-emerald-800'
                            : 'border-amber-200 bg-amber-50 text-amber-700'
                        }
                      >
                        Anchoring status:{' '}
                        {evidence.chain_operation_reference ? 'Confirmed' : 'Pending'}
                      </Badge>
                    </div>
                    <div className="mt-4 grid gap-3 text-xs text-slate-600 md:grid-cols-2">
                      <div>Visibility: {formatEvidenceVisibility(evidence.display_visibility)}</div>
                      <div>Submitted by: {evidence.submitted_by}</div>
                      <div>Anchoring reference: {evidence.chain_operation_reference ?? 'Pending'}</div>
                      <div className="break-all">Hash: {evidence.sha256_hash}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
              </>
            }
            activityContent={
              <>
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">Protected Execution Timeline</h2>
            <p className="mt-2 text-sm text-slate-500">Newest entries appear first.</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="font-semibold text-slate-950">Escrow Locked</div>
                <div className="mt-2 text-sm text-slate-600">
                  {latestLockEvent ? 'Lock truth recorded.' : isPostLock ? 'Locked in escrow' : 'Waiting for lock'}
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  View Lock Proof
                  {lockTxHash ? ` | Lock truth ${lockTxHash}` : ''}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="font-semibold text-slate-950">Room Events</div>
                <div className="mt-3 space-y-3">
                  {recentRoomEvents.length > 0 ? (
                    recentRoomEvents.map((event) => (
                      <div key={event.id} className="rounded-lg bg-white p-3">
                        <div className="text-sm font-medium text-slate-900">
                          {event.message || formatEventType(event.event_type)}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">{formatDateTime(event.created_at)}</div>
                        {buildEventDetail(event) ? (
                          <div className="mt-2 text-xs text-slate-600">{buildEventDetail(event)}</div>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-slate-500">No room events recorded yet.</div>
                  )}
                </div>
              </div>
            </div>
          </section>
              </>
            }
            transactionContent={
              <>
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">Role Wallets</h2>
            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              {walletCards.map((wallet) => (
                <div key={wallet.key} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-950">{wallet.title}</div>
                      <div className="mt-1 text-xs text-slate-500">{wallet.identity_alias}</div>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${walletStateBadgeClassName(
                        wallet.status_tone,
                      )}`}
                    >
                      {wallet.status_label}
                    </span>
                  </div>
                  <div className="mt-3 break-all font-mono text-xs text-slate-600">
                    {wallet.public_address}
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-600">{wallet.movement_value}</div>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">{outcomeCardTitle}</h2>
            {isClosed ? (
              <div className="mt-3 inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                Closed Funding Snapshot
              </div>
            ) : null}
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              {outcomeSummary}
            </div>
            {status === 'REFUNDED' || status === 'EXPIRED' ? (
              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700">
                No proof corridor opened
              </div>
            ) : null}
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-xs text-slate-500">Buyer consequence</div>
                <div className="mt-1 font-semibold text-slate-900">{buyerOutcomeSummary}</div>
                {buyerOutcomeEvent ? (
                  <div className="mt-2 text-xs text-slate-500">
                    {formatOutcomeLabel(buyerOutcomeEvent.reputation_outcome)} | score{' '}
                    {formatScoreDelta(buyerOutcomeEvent.score_delta)}
                  </div>
                ) : null}
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-xs text-slate-500">Seller consequence</div>
                <div className="mt-1 font-semibold text-slate-900">{sellerOutcomeSummary}</div>
                {sellerOutcomeEvent ? (
                  <div className="mt-2 text-xs text-slate-500">
                    {formatOutcomeLabel(sellerOutcomeEvent.reputation_outcome)} | score{' '}
                    {formatScoreDelta(sellerOutcomeEvent.score_delta)}
                  </div>
                ) : null}
                {sellerOutcomeEvent ? (
                  <div className="mt-1 text-xs text-slate-500">
                    Latest room outcome: {formatOutcomeLabel(sellerOutcomeEvent.reputation_outcome)} (
                    {formatScoreDelta(sellerOutcomeEvent.score_delta)})
                  </div>
                ) : null}
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
              {trustContinuityNote}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">
              {status === 'COMPLETED' ? 'Success Settlement Summary' : 'Success Settlement Logic'}
            </h2>
            {status === 'COMPLETED' ? (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
                Settled funds are now distributed to the final wallets and this completed outcome
                is eligible to strengthen buyer and seller reputation.
              </div>
            ) : null}
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-950">Completion Proof</h3>
              <div className="mt-3 grid min-w-0 gap-3 break-words text-sm text-slate-600 md:grid-cols-2">
                <div>Settlement transaction: {completionTxHash ?? settlementReference ?? 'Pending'}</div>
                <div>Settled at: {settledAt ? formatDateTime(settledAt) : 'Pending timestamp'}</div>
                <div>Escrow reference: {deal.stellar_escrow_id ?? 'Pending escrow reference'}</div>
                <div>Contract ID: {deal.stellar_contract_id ?? 'Pending contract reference'}</div>
                <div>Proof hash: {deal.proof_hash ?? latestProofEvent?.proof_hash ?? 'Pending proof hash'}</div>
                <div>
                  Reputation ledger:{' '}
                  <span className="font-semibold text-emerald-700">
                    {status === 'COMPLETED' ? 'Updated for both parties' : 'Pending'}
                  </span>
                </div>
              </div>
              <div className="mt-4">
                {completionTxHref ? (
                  <a
                    href={completionTxHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center text-sm font-semibold text-emerald-700"
                  >
                    View Settlement Transaction
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                ) : (
                  <span className="inline-flex rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-500">
                    View Settlement Transaction
                  </span>
                )}
              </div>
            </div>
            {status === 'COMPLETED' ? (
              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="text-sm font-semibold text-slate-950">Payout Destinations</h3>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {completedPayoutRoutes.map((route) => (
                    <div key={route.key} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-slate-900">{route.title}</span>
                        <span className="text-xs font-semibold text-emerald-700">
                          {route.statusLabel} | {route.amount}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500">
                        <span>{formatPayoutDestinationLabel(route.destination, route.fallbackLabel)}</span>
                        <span>{formatPayoutDestinationRail(route.destination)}</span>
                      </div>
                      <div className="mt-2 break-all font-mono text-[11px] text-slate-600">
                        {formatPayoutDestinationReference(route.destination)}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                  Linked wallet destination is the only active payout rail in this MVP. Local bank
                  payout remains visible on profiles but is not live yet.
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Buyer funding outcome</span>
                  <span className="font-semibold text-slate-900">
                    {status === 'REFUNDED' && buyerFundedHistorically ? 'Returned in full' : 'Pending'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Platform fees</span>
                  <span className="font-semibold text-slate-900">
                    {isClosed ? 'Not charged before lock' : formatCurrency(platformFeeTotalIdr)}
                  </span>
                </div>
              </div>
            )}
          </section>
              </>
            }
          />
        </main>

        <aside className="min-w-0 space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <ReceiptText className="h-6 w-6 text-emerald-700" />
              <h2 className="text-xl font-semibold text-slate-950">Deal Summary</h2>
            </div>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Product</span>
                <span className="font-semibold text-slate-950">Red Curly Chili</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Grade</span>
                <span className="text-right font-semibold text-slate-950">
                  Grade A, minimum size 3 cm
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Quantity</span>
                <span className="font-semibold text-slate-950">
                  {(deal.volume_kg ?? 0).toLocaleString('id-ID')} kg
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Price</span>
                <span className="font-semibold text-slate-950">{pricePerKg}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Protected value</span>
                <span className="font-bold text-emerald-700">{formatCurrency(deal.principal_idr)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Delivery deadline</span>
                <span className="font-semibold text-slate-950">{deliveryDeadline}</span>
              </div>
              <div className="border-t border-slate-200 pt-4">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Buyer</span>
                  <span className="text-right font-semibold text-slate-950">{buyerDisplayName}</span>
                </div>
                <div className="mt-3 flex justify-between gap-4">
                  <span className="text-slate-500">Seller</span>
                  <span className="text-right font-semibold text-slate-950">{sellerDisplayName}</span>
                </div>
              </div>
              {sourceOffer ? (
                <Link
                  href={`/offers/${sourceOffer.id}`}
                  className="mt-3 inline-flex h-12 w-full items-center justify-center rounded-xl border border-emerald-200 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
                >
                  Review Recorded Negotiation
                </Link>
              ) : null}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <FileCheck2 className="h-6 w-6 text-emerald-700" />
              <h2 className="text-xl font-semibold text-slate-950">Evidence Expected</h2>
            </div>
            <div className="space-y-4 text-sm text-slate-700">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                Recent product photos
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                Delivery proof
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                Signed receipt
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <Flag className="h-6 w-6 text-emerald-700" />
              <h2 className="text-xl font-semibold text-slate-950">What happens next</h2>
            </div>
            <div className="space-y-3 text-sm text-slate-700">
              {[
                'Both parties fund commitments',
                'Escrow locks on Stellar',
                'Delivery & Proof become active',
                'Buyer reviews and confirms',
                'Settlement is executed',
              ].map((item, index) => (
                <div key={item} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-emerald-200 text-xs font-semibold text-emerald-700">
                    {index + 1}
                  </span>
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <ShieldCheck className="h-6 w-6 text-emerald-700" />
              <h2 className="text-xl font-semibold text-emerald-950">Trust layer</h2>
            </div>
            <p className="text-sm leading-6 text-emerald-900">
              Protected by escrow logic and recorded on Stellar. Funding, lock, proof, refund, and
              settlement remain part of one trust trail.
            </p>
            <div className="mt-4 rounded-xl border border-emerald-200 bg-white p-4 text-sm text-slate-700">
              <div className="font-semibold text-slate-950">View Transaction</div>
              {latestTxHref ? (
                <a
                  href={latestTxHref}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex break-all font-mono text-xs text-emerald-700"
                >
                  {deal.latest_stellar_tx_hash}
                </a>
              ) : (
                <div className="mt-2 text-xs text-slate-500">
                  {deal.stellar_mode === 'testnet' ? 'Pending' : 'Demo mode'}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">Stellar References</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Verification mode</div>
                <div className="mt-1 text-slate-700">
                  {deal.stellar_mode === 'testnet' ? 'Testnet-backed room' : 'Demo mode'}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Contract ID</div>
                <div className="mt-1 break-all font-mono text-xs text-slate-700">
                  {deal.stellar_contract_id
                    ? deal.stellar_contract_id
                    : deal.stellar_mode === 'mock_only'
                      ? 'Demo mode'
                      : 'Pending'}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Escrow reference</div>
                <div className="mt-1 break-all font-mono text-xs text-slate-700">
                  {deal.stellar_escrow_id
                    ? deal.stellar_escrow_id
                    : deal.stellar_mode === 'mock_only'
                      ? 'Demo mode'
                      : 'Pending'}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Lock proof</div>
                {lockTxHref ? (
                  <a
                    href={lockTxHref}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex break-all font-mono text-xs text-emerald-700"
                  >
                    {lockTxHash}
                  </a>
                ) : (
                  <div className="mt-1 break-all font-mono text-xs text-slate-700">
                    {isPostLock
                      ? 'Pending'
                      : deal.stellar_mode === 'mock_only'
                        ? 'Demo mode'
                        : 'Appears after both deposits lock the room'}
                  </div>
                )}
              </div>
              {deal.latest_stellar_tx_hash ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">Latest room tx</div>
                  {latestTxHref ? (
                    <a
                      href={latestTxHref}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex break-all font-mono text-xs text-emerald-700"
                    >
                      {deal.latest_stellar_tx_hash}
                    </a>
                  ) : (
                    <div className="mt-1 break-all font-mono text-xs text-slate-700">
                      {deal.latest_stellar_tx_hash}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
