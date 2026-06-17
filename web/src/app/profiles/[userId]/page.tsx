import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { demoProfiles } from '@/lib/demo/demo-data';
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  Briefcase,
  MapPin,
  Scale,
  ShieldCheck,
  UserCircle2,
} from 'lucide-react';
import { notFound } from 'next/navigation';
import { rebuildReputationAggregate } from '@/lib/reputation/engine';
import type { DbReputationEvent } from '@/lib/db/types';
import { repository } from '@/lib/repositories';

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

function formatRoleLabel(role: DbReputationEvent['participant_role']): string {
  return role === 'buyer' ? 'Buyer role' : 'Seller role';
}

function formatReference(value: string): string {
  if (value.length <= 18) {
    return value;
  }

  return `${value.slice(0, 10)}...${value.slice(-6)}`;
}

export default async function ProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const resolvedParams = await params;
  const profile = demoProfiles[resolvedParams.userId];
  
  if (!profile) return notFound();

  const reputationEvents = await repository.getParticipantReputationEvents(resolvedParams.userId);
  const agg = rebuildReputationAggregate(reputationEvents);
  const recentEvents = [...reputationEvents]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 5);

  const finalVerifiedVolume = profile.verifiedVolumeIdr + agg.verified_volume_idr;
  const finalSellerScore = profile.sellerScore + agg.seller_score;
  const finalBuyerScore = profile.buyerScore + agg.buyer_score;
  const finalSellerCompleted = profile.sellerCompletedCount + agg.seller_completed_count;
  const finalBuyerCompleted = profile.buyerCompletedCount + agg.buyer_completed_count;
  const totalCompleted = finalSellerCompleted + finalBuyerCompleted;
  const publicProofMode = profile.proofVisibility === 'public';
  const proofVisibilityLabel =
    publicProofMode ? 'Public proof mode' : 'Private proof mode';
  const completedOutcomeCount = reputationEvents.filter(
    (event) => event.reputation_outcome === 'transaction_completed',
  ).length;
  const failedFundingCount = reputationEvents.filter(
    (event) =>
      event.reputation_outcome === 'buyer_failed_deposit' ||
      event.reputation_outcome === 'seller_failed_deposit',
  ).length;
  const neutralRefundCount = reputationEvents.filter(
    (event) => event.reputation_outcome === 'refunded_before_locked',
  ).length;
  const recentDealIds = Array.from(new Set(recentEvents.map((event) => event.deal_id)));
  const recentDeals = await Promise.all(recentDealIds.map((dealId) => repository.getDeal(dealId)));
  const recentDealLookup = new Map(
    recentDeals
      .filter((deal): deal is NonNullable<typeof deal> => deal !== null)
      .map((deal) => [deal.id, deal]),
  );
  const visibleReferenceCount = publicProofMode
    ? recentDeals.filter((deal) => deal && (deal.latest_stellar_tx_hash || deal.proof_hash)).length
    : 0;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row gap-8 items-start mb-8">
        <div className="h-24 w-24 bg-emerald-100 rounded-2xl flex items-center justify-center shrink-0 border border-emerald-200">
          <UserCircle2 className="h-12 w-12 text-emerald-600" />
        </div>
        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            <Badge className="border-emerald-200 bg-emerald-50 text-emerald-800">
              Outcome-backed reputation
            </Badge>
            <Badge variant="secondary" className="bg-slate-100 text-slate-700">
              {proofVisibilityLabel}
            </Badge>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">{profile.displayName}</h1>
          <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-600">
            <div className="flex items-center">
              <Briefcase className="mr-1.5 h-4 w-4 text-slate-400" />
              {profile.roleLabel}
            </div>
            <div className="flex items-center">
              <MapPin className="mr-1.5 h-4 w-4 text-slate-400" />
              {profile.location}
            </div>
            <div className="flex items-center">
              <ShieldCheck className="mr-1.5 h-4 w-4 text-emerald-600" />
              <span className="text-emerald-700 font-medium">{proofVisibilityLabel}</span>
            </div>
          </div>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
            This profile acts as a trust passport. Settleway aggregates verified transaction
            outcomes, protected volume, and proof visibility rules so counterparties can evaluate
            credibility before they commit to an escrow-backed room.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard 
          title="Verified Volume" 
          value={`Rp ${(finalVerifiedVolume / 1000000).toLocaleString('id-ID')}M`} 
          description="Protected transaction volume from verified rooms"
        />
        <StatCard 
          title="Seller Reputation" 
          value={`${finalSellerScore}/100`} 
          description={`${finalSellerCompleted} verified seller completions`}
          className={finalSellerScore > 0 ? 'border-emerald-200 bg-emerald-50' : 'opacity-50'}
        />
        <StatCard 
          title="Buyer Reputation" 
          value={`${finalBuyerScore}/100`} 
          description={`${finalBuyerCompleted} verified buyer completions`}
          className={finalBuyerScore > 0 ? 'border-blue-200 bg-blue-50' : 'opacity-50'}
        />
        <StatCard 
          title="Completed Outcomes"
          value={`${totalCompleted}`} 
          description={`${totalCompleted} total verified completions across both roles`}
        />
        <StatCard 
          title="Neutral Refunds"
          value={`${neutralRefundCount}`}
          description="Closed before lock without forced blame"
        />
        <StatCard 
          title="Failed Funding Events"
          value={`${failedFundingCount}`}
          description="Missed deposit commitments before lock"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Trust Passport</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 space-y-4">
            <p>
              Settleway trust is built from transaction outcomes, not generic star ratings.
              A profile becomes more credible when it completes protected deals, maintains funding
              discipline, and accumulates verified volume through the Deal Room.
            </p>

            <div className="grid gap-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h4 className="mb-1 flex items-center gap-2 font-semibold text-slate-900">
                  <Scale className="h-4 w-4 text-emerald-600" />
                  Outcome-backed reputation
                </h4>
                <p className="text-xs">
                  Scores move because a party completed, missed, refunded, or otherwise resolved a
                  protected transaction state. Settleway does not fabricate trust with empty reviews.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h4 className="mb-1 flex items-center gap-2 font-semibold text-slate-900">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Stellar-backed trust trail
                </h4>
                <p className="text-xs">
                  Lock, refund, settlement, and proof references belong to the same trust story even
                  when public hash visibility is reduced.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h4 className="mb-1 flex items-center gap-2 font-semibold text-slate-900">
                  <FileText className="h-4 w-4 text-emerald-600" />
                  Proof visibility policy
                </h4>
                <p className="text-xs">
                  {profile.proofVisibility === 'public'
                    ? 'This profile is allowed to expose transaction-level proof references when available.'
                    : 'This profile keeps transaction-level proof references private and relies on aggregate trust presentation instead.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Verification Model</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="mb-1 flex items-center gap-2 font-semibold text-slate-900">
                {publicProofMode ? (
                  <Eye className="h-4 w-4 text-emerald-600" />
                ) : (
                  <EyeOff className="h-4 w-4 text-slate-500" />
                )}
                {publicProofMode ? 'Public verification mode' : 'Private verification mode'}
              </div>
              <p className="text-xs">
                {publicProofMode
                  ? 'When a linked room has a transaction hash or proof hash available, this profile can expose those references so counterparties can inspect the trust trail more directly.'
                  : 'This profile intentionally hides transaction-level references from the public view. Counterparties still see aggregate trust, while detailed references remain inside the room and operator context.'}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="mb-1 font-semibold text-slate-900">Outcome ledger logic</div>
              <p className="text-xs">
                Reputation moves because protected transactions completed, failed at the funding
                gate, or closed neutrally before lock. Settleway does not inflate trust with empty
                testimonials or generic five-star reviews.
              </p>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900">
              <div className="mb-1 font-semibold">Visible verification signals</div>
              <div>
                {publicProofMode
                  ? `${visibleReferenceCount} recent ledger item(s) currently have public transaction or proof references available on this profile.`
                  : 'Public verification references are intentionally hidden here, but the protected room and aggregate ledger still preserve the trust trail.'}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
              Counterparties should read this profile together with the Deal Room, not as a
              detached marketing badge. Discovery, commitment, execution, and reputation are meant
              to reinforce one another.
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Reputation Ledger</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            {recentEvents.length > 0 ? (
              recentEvents.map((event) => (
                <div key={event.id} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900">
                        {formatOutcomeLabel(event.reputation_outcome)}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {formatRoleLabel(event.participant_role)} | Deal {event.deal_id} | score{' '}
                        {formatScoreDelta(event.score_delta)}
                      </div>
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(event.created_at).toLocaleDateString('id-ID')}
                    </div>
                  </div>
                  {event.volume_delta_idr > 0 ? (
                    <div className="mt-2 text-xs text-emerald-700">
                      Verified volume contribution: Rp{' '}
                      {event.volume_delta_idr.toLocaleString('id-ID')}
                    </div>
                  ) : null}
                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    {publicProofMode
                      ? 'Public proof preference allows visible transaction and proof references when they are available.'
                      : 'Private proof preference keeps transaction references off the public profile while preserving aggregate trust signals.'}
                  </div>
                  <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                    {(() => {
                      const linkedDeal = recentDealLookup.get(event.deal_id);

                      if (!publicProofMode) {
                        return 'Verification references are retained inside the protected room and operator context for this private-profile view.';
                      }

                      if (!linkedDeal) {
                        return 'Public verification becomes visible here once a linked protected room reference is available.';
                      }

                      if (!linkedDeal.latest_stellar_tx_hash && !linkedDeal.proof_hash) {
                        if (event.settlement_reference) {
                          return (
                            <div>
                              Settlement reference:{' '}
                              <span className="font-mono text-slate-700">
                                {formatReference(event.settlement_reference)}
                              </span>
                            </div>
                          );
                        }

                        return 'This outcome is ledger-backed, but no public transaction or proof hash is exposed yet for this room.';
                      }

                      return (
                        <>
                          {event.settlement_reference ? (
                            <div>
                              Settlement reference:{' '}
                              <span className="font-mono text-slate-700">
                                {formatReference(event.settlement_reference)}
                              </span>
                            </div>
                          ) : null}
                          {linkedDeal.latest_stellar_tx_hash ? (
                            <div className={event.settlement_reference ? 'mt-1' : ''}>
                              Transaction reference:{' '}
                              <span className="font-mono text-slate-700">
                                {formatReference(linkedDeal.latest_stellar_tx_hash)}
                              </span>
                            </div>
                          ) : null}
                          {linkedDeal.proof_hash ? (
                            <div className={linkedDeal.latest_stellar_tx_hash ? 'mt-1' : ''}>
                              Proof hash:{' '}
                              <span className="font-mono text-slate-700">
                                {formatReference(linkedDeal.proof_hash)}
                              </span>
                            </div>
                          ) : null}
                        </>
                      );
                    })()}
                  </div>
                  <div className="mt-3">
                    <Link
                      href={`/deals/${event.deal_id}`}
                      className="inline-flex items-center text-xs font-medium text-emerald-700 hover:text-emerald-800"
                    >
                      Open protected room
                      <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                No verified outcome has been recorded for this profile yet.
              </div>
            )}

            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900">
              After lock, disputes still require operator review using room chat, uploaded evidence,
              and escrow-linked event history. The MVP does not auto-judge fault.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
