import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { demoProfiles } from '@/lib/demo/demo-data';
import { MapPin, ShieldCheck, UserCircle2, Briefcase } from 'lucide-react';
import { notFound } from 'next/navigation';
import { mockStore } from '@/lib/db/mock-store';
import { rebuildReputationAggregate } from '@/lib/reputation/engine';

export default async function ProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const resolvedParams = await params;
  const profile = demoProfiles[resolvedParams.userId];
  
  if (!profile) return notFound();

  const reputationEvents = mockStore.getParticipantReputationEvents(resolvedParams.userId);
  const agg = rebuildReputationAggregate(reputationEvents);

  const finalVerifiedVolume = profile.verifiedVolumeIdr + agg.verified_volume_idr;
  const finalSellerScore = profile.sellerScore + agg.seller_score;
  const finalBuyerScore = profile.buyerScore + agg.buyer_score;
  const finalSellerCompleted = profile.sellerCompletedCount + agg.seller_completed_count;
  const finalBuyerCompleted = profile.buyerCompletedCount + agg.buyer_completed_count;
  const totalCompleted = finalSellerCompleted + finalBuyerCompleted;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row gap-8 items-start mb-8">
        <div className="h-24 w-24 bg-emerald-100 rounded-2xl flex items-center justify-center shrink-0 border border-emerald-200">
          <UserCircle2 className="h-12 w-12 text-emerald-600" />
        </div>
        <div>
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
              <span className="text-emerald-700 font-medium capitalize">Profile {profile.proofVisibility}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard 
          title="Verified Volume" 
          value={`Rp ${(finalVerifiedVolume / 1000000).toLocaleString('id-ID')}M`} 
          description="Total transaction volume protected by Settleway"
        />
        <StatCard 
          title="Seller Reputation" 
          value={`${finalSellerScore}/100`} 
          description={`${finalSellerCompleted} completed deals`}
          className={finalSellerScore > 0 ? 'border-emerald-200 bg-emerald-50' : 'opacity-50'}
        />
        <StatCard 
          title="Buyer Reputation" 
          value={`${finalBuyerScore}/100`} 
          description={`${finalBuyerCompleted} completed deals`}
          className={finalBuyerScore > 0 ? 'border-blue-200 bg-blue-50' : 'opacity-50'}
        />
        <StatCard 
          title="Total Deals Completed" 
          value={`${totalCompleted}`} 
          description="Across all roles"
        />
        <StatCard 
          title="Refunded Deals" 
          value={`${agg.refunded_count}`} 
          description="Before locking phase"
        />
        <StatCard 
          title="Expired Deals" 
          value={`${agg.expired_count}`} 
          description="Failed deposits"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>About Identity & Proof</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 space-y-4">
            <p>
              Settleway reputation is built strictly on completed Deal Room transactions. 
              Scores increase when a party fulfills their obligations (e.g., successful delivery, timely deposit). 
              Scores decrease for cancellations or disputes.
            </p>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <h4 className="font-semibold text-slate-900 mb-1 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Stellar Proven
              </h4>
              <p className="text-xs">
                All reputation changes are backed by escrow event hashes on the Stellar Testnet, preventing reputation manipulation.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
