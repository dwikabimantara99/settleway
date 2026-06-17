import { redirect } from 'next/navigation';

export default async function NewDealPage({
  searchParams,
}: {
  searchParams: Promise<{ listingId?: string; requestId?: string; buyerRequestId?: string }>;
}) {
  const resolvedParams = await searchParams;
  const target = new URLSearchParams();

  if (resolvedParams.listingId) {
    target.set('listingId', resolvedParams.listingId);
  }

  const requestId = resolvedParams.buyerRequestId || resolvedParams.requestId;
  if (requestId) {
    target.set('buyerRequestId', requestId);
  }

  const query = target.toString();
  redirect(query ? `/offers/new?${query}` : '/marketplace');
}
