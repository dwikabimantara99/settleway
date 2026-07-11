import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { CreateOfferComposer } from '@/components/offers/CreateOfferComposer';
import { getCurrentUser } from '@/lib/auth/server';
import { repository } from '@/lib/repositories';
import { demoListings, demoProfiles } from '@/lib/demo/demo-data';

export default async function NewOfferPage({
  searchParams,
}: {
  searchParams: Promise<{ listingId?: string; buyerRequestId?: string; demo?: string; role?: string }>;
}) {
  const resolvedParams = await searchParams;
  const listingId = resolvedParams.listingId;
  const buyerRequestId = resolvedParams.buyerRequestId;
  const isDemo = resolvedParams.demo === '1';
  const role = resolvedParams.role;

  if ((!listingId && !buyerRequestId) || (listingId && buyerRequestId)) {
    redirect('/marketplace');
  }

  let listing = listingId ? await repository.getListing(listingId) : null;
  const buyerRequest = buyerRequestId ? await repository.getBuyerRequest(buyerRequestId) : null;
  const currentUser = await getCurrentUser();

  if (isDemo && listingId === 'listing-cabai-001' && !listing) {
    const demoListing = demoListings.find((l) => l.id === listingId);
    if (demoListing) {
      listing = {
        id: demoListing.id,
        seller_id: demoListing.sellerId,
        commodity: demoListing.commodity,
        variety: demoListing.variety,
        status: demoListing.status,
        location: demoListing.location,
        estimated_volume_kg: demoListing.estimatedVolumeKg,
        price_per_kg_idr: demoListing.pricePerKgIdr,
        estimated_value_idr: demoListing.estimatedValueIdr,
        description: demoListing.description,
      } as any;
    }
  }

  if (listingId && !listing) {
    redirect('/marketplace');
  }
  if (buyerRequestId && !buyerRequest) {
    redirect('/buyer-requests');
  }

  const commodity = listing?.commodity || buyerRequest?.commodity || 'Unknown commodity';
  const volumeKg = listing?.estimated_volume_kg ?? buyerRequest?.required_volume_kg ?? 0;
  const pricePerKg = listing?.price_per_kg_idr ?? buyerRequest?.target_price_per_kg_idr ?? 0;
  const principalIdr =
    listing?.estimated_value_idr ??
    (buyerRequest?.required_volume_kg ?? 0) * (buyerRequest?.target_price_per_kg_idr ?? 0);
  let counterparty = listing
    ? await repository.getProfile(listing.seller_id)
    : buyerRequest
      ? await repository.getProfile(buyerRequest.buyer_id)
      : null;

  if (isDemo && listingId === 'listing-cabai-001' && listing && !counterparty) {
    const demoProfile = demoProfiles[listing.seller_id];
    if (demoProfile) {
      counterparty = {
        id: demoProfile.id,
        display_name: demoProfile.displayName,
        role_label: demoProfile.roleLabel,
        location: demoProfile.location,
        user_type: demoProfile.userType,
        seller_score: demoProfile.sellerScore,
        buyer_score: demoProfile.buyerScore,
        seller_completed_count: demoProfile.sellerCompletedCount,
        buyer_completed_count: demoProfile.buyerCompletedCount,
        verified_volume_idr: demoProfile.verifiedVolumeIdr,
      } as any;
    }
  }
  const counterpartyKind = listing ? 'seller' : 'buyer';
  const backHref = listing ? `/marketplace/${listing.id}` : '/buyer-requests';
  const backLabel = listing ? 'Back to marketplace' : 'Back to sell board';

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Link
          href={backHref}
          className="inline-flex items-center text-sm text-slate-500 hover:text-emerald-600"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          {backLabel}
        </Link>
        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
          Pre-Deal Negotiation
        </Badge>
      </div>

      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-slate-950">{commodity}</h1>
        <p className="mt-4 max-w-4xl text-base leading-7 text-slate-600">
          This is the recorded negotiation area. The Deal Room opens only after the offer is
          accepted and both parties commit.
        </p>
        <p className="mt-3 max-w-4xl text-base leading-7 text-slate-500">
          Indicative baseline: {volumeKg.toLocaleString('id-ID')} kg at Rp{' '}
          {pricePerKg.toLocaleString('id-ID')} / kg, with indicative value Rp{' '}
          {principalIdr.toLocaleString('id-ID')}.
        </p>
      </div>

      <CreateOfferComposer
        listingId={listingId}
        buyerRequestId={buyerRequestId}
        initialVolumeKg={volumeKg}
        initialPricePerKgIdr={pricePerKg}
        commodity={commodity}
        counterpartyName={counterparty?.display_name ?? 'Counterparty'}
        counterpartyRoleLabel={counterparty?.role_label ?? 'Verified counterparty'}
        counterpartyLocation={counterparty?.location ?? 'Location pending'}
        counterpartyScore={
          counterpartyKind === 'seller'
            ? (counterparty?.seller_score ?? 0)
            : (counterparty?.buyer_score ?? 0)
        }
        counterpartyKind={counterpartyKind}
        currentActorId={currentUser?.id ?? null}
        isDemo={isDemo}
        role={role}
      />
    </div>
  );
}
