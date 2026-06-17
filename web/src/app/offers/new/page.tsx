import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { CreateOfferComposer } from '@/components/offers/CreateOfferComposer';
import { repository } from '@/lib/repositories';

export default async function NewOfferPage({
  searchParams,
}: {
  searchParams: Promise<{ listingId?: string; buyerRequestId?: string }>;
}) {
  const resolvedParams = await searchParams;
  const listingId = resolvedParams.listingId;
  const buyerRequestId = resolvedParams.buyerRequestId;

  if ((!listingId && !buyerRequestId) || (listingId && buyerRequestId)) {
    redirect('/marketplace');
  }

  const listing = listingId ? await repository.getListing(listingId) : null;
  const buyerRequest = buyerRequestId ? await repository.getBuyerRequest(buyerRequestId) : null;

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

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Link
          href={listing ? `/marketplace/${listing.id}` : '/buyer-requests'}
          className="inline-flex items-center text-sm text-slate-500 hover:text-emerald-600"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to source
        </Link>
        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
          Pre-Deal Negotiation
        </Badge>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">{commodity}</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Negotiate here first, then submit the commercial terms from the Deal Terms card. The
          active escrow room opens only after the offer is accepted and both parties click Open
          Deal Room.
        </p>
        <p className="mt-3 max-w-3xl text-sm text-slate-500">
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
      />
    </div>
  );
}
