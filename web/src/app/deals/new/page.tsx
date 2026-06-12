import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { demoListings, demoBuyerRequests, demoProfiles } from '@/lib/demo/demo-data';
import { ShieldCheck, ArrowRight, Wallet, ChevronLeft } from 'lucide-react';
import { redirect } from 'next/navigation';

export default async function NewDealPage({ searchParams }: { searchParams: Promise<{ listingId?: string, requestId?: string }> }) {
  const resolvedParams = await searchParams;
  const listingId = resolvedParams.listingId;
  const requestId = resolvedParams.requestId;

  let sourceItem;
  let buyerId = '';
  let sellerId = '';
  let commodity = '';
  let volume = 0;
  let price = 0;

  if (listingId) {
    sourceItem = demoListings.find(l => l.id === listingId);
    if (!sourceItem) return redirect('/marketplace');
    sellerId = sourceItem.sellerId;
    commodity = sourceItem.commodity;
    volume = sourceItem.estimatedVolumeKg;
    price = sourceItem.estimatedValueIdr;
    // For demo, assume current user is the buyer if not specified
    buyerId = 'buyer-surabaya-restaurant';
  } else if (requestId) {
    sourceItem = demoBuyerRequests.find(r => r.id === requestId);
    if (!sourceItem) return redirect('/buyer-requests');
    buyerId = sourceItem.buyerId;
    commodity = sourceItem.commodity;
    volume = sourceItem.requiredVolumeKg;
    price = sourceItem.estimatedTotalIdr;
    sellerId = 'seller-probolinggo-cabai';
  } else {
    return redirect('/marketplace');
  }

  const seller = demoProfiles[sellerId];
  const buyer = demoProfiles[buyerId];

  // Calculations
  const principal = price;
  const buyerBond = principal * 0.05;
  const sellerBond = principal * 0.05;
  const buyerFee = principal * 0.005;
  const sellerFee = principal * 0.005;

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
      <Link href="/marketplace" className="inline-flex items-center text-sm text-slate-500 hover:text-emerald-600 mb-8">
        <ChevronLeft className="mr-1 h-4 w-4" />
        Back
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Create Protected Deal</h1>
        <p className="text-slate-600">Review terms and initialize the Deal Room escrow.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm text-slate-500">Seller</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="font-semibold text-slate-900">{seller?.displayName}</div>
            <div className="text-sm text-emerald-600">Reputation: {seller?.sellerScore}/100</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm text-slate-500">Buyer</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="font-semibold text-slate-900">{buyer?.displayName}</div>
            <div className="text-sm text-blue-600">Reputation: {buyer?.buyerScore}/100</div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8 border-emerald-200">
        <CardHeader className="bg-emerald-50 rounded-t-xl border-b border-emerald-100">
          <CardTitle className="text-emerald-900">Transaction Terms & Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="mb-6 pb-6 border-b border-slate-200">
            <div className="flex justify-between mb-2">
              <span className="text-slate-600">Commodity</span>
              <span className="font-medium">{commodity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Agreed Volume</span>
              <span className="font-medium">{volume.toLocaleString('id-ID')} kg</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h4 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Wallet className="h-4 w-4 text-blue-500" /> Buyer Responsibility
              </h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Principal (Payment)</span>
                  <span>Rp {principal.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Commitment Bond (5%)</span>
                  <span>Rp {buyerBond.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Settleway Fee (0.5%)</span>
                  <span>Rp {buyerFee.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 pt-3 border-t border-slate-200">
                  <span>Total Deposit Required</span>
                  <span>Rp {(principal + buyerBond + buyerFee).toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Wallet className="h-4 w-4 text-emerald-500" /> Seller Responsibility
              </h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Performance Bond (5%)</span>
                  <span>Rp {sellerBond.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Settleway Fee (0.5%)</span>
                  <span>Rp {sellerFee.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 pt-3 border-t border-slate-200">
                  <span>Total Deposit Required</span>
                  <span>Rp {(sellerBond + sellerFee).toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Link href="/marketplace">
          <Button variant="ghost">Cancel</Button>
        </Link>
        <Link href="/deals/demo-cabai-001">
          <Button size="lg" className="gap-2">
            Confirm & Create Deal Room
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
      
      <p className="text-center text-xs text-slate-400 mt-6 flex items-center justify-center gap-1">
        <ShieldCheck className="h-3 w-3" />
        No funds are moved yet. Clicking confirm generates the Deal Room and deposit instructions.
      </p>
    </div>
  );
}
