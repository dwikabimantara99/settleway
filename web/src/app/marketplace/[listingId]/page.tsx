import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { demoListings, demoProfiles } from '@/lib/demo/demo-data';
import { MapPin, Info, ShieldCheck, ChevronLeft } from 'lucide-react';
import { notFound } from 'next/navigation';

export default async function ListingDetailPage({ params }: { params: Promise<{ listingId: string }> }) {
  const resolvedParams = await params;
  const listing = demoListings.find(l => l.id === resolvedParams.listingId);
  
  if (!listing) return notFound();
  
  const seller = demoProfiles[listing.sellerId];

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12">
      <Link href="/marketplace" className="inline-flex items-center text-sm text-slate-500 hover:text-emerald-600 mb-8">
        <ChevronLeft className="mr-1 h-4 w-4" />
        Back to Marketplace
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-3">
            <Badge className={listing.status === 'ready_stock' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-blue-100 text-blue-800 border-blue-200'}>
              {listing.status === 'ready_stock' ? 'Ready Stock' : 'Pre-Harvest'}
            </Badge>
            {listing.harvestDate && (
               <span className="text-sm text-slate-500">Harvest: {listing.harvestDate}</span>
            )}
          </div>
          
          <h1 className="text-3xl font-bold text-slate-900">{listing.commodity}</h1>
          <p className="text-lg text-slate-600">{listing.variety}</p>

          <div className="prose prose-slate max-w-none border-y border-slate-200 py-6">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2 mb-2">
              <Info className="h-5 w-5 text-slate-400" /> Description
            </h3>
            <p>{listing.description}</p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Proof Requirements</h3>
            <Card className="bg-slate-50">
              <CardContent className="p-4 flex gap-4">
                <ShieldCheck className="h-6 w-6 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-slate-900">Standard Escrow Evidence</p>
                  <p className="text-sm text-slate-600 mt-1">This deal requires photo evidence of loaded goods and a signed delivery receipt. Hashes will be recorded to the Stellar Testnet.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="border-emerald-200 shadow-md">
            <CardHeader className="bg-emerald-50 rounded-t-xl border-b border-emerald-100 pb-4">
              <CardTitle className="text-emerald-900">Deal Terms</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-end">
                <div className="text-sm text-slate-500">Price per kg</div>
                <div className="text-xl font-bold text-slate-900">Rp {listing.pricePerKgIdr.toLocaleString('id-ID')}</div>
              </div>
              <div className="flex justify-between items-end">
                <div className="text-sm text-slate-500">Total Volume</div>
                <div className="text-md font-medium text-slate-900">{listing.estimatedVolumeKg.toLocaleString('id-ID')} kg</div>
              </div>
              <div className="flex justify-between items-end border-t border-slate-200 pt-4">
                <div className="text-sm font-medium text-slate-900">Estimated Value</div>
                <div className="text-xl font-bold text-emerald-600">Rp {listing.estimatedValueIdr.toLocaleString('id-ID')}</div>
              </div>
              
              <div className="mt-6">
                <Button className="w-full" size="lg" disabled>Deal Room starts in Phase 3</Button>
              </div>
              <p className="text-xs text-center text-slate-500 mt-2">Requires 5% commitment bond</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Seller Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Link href={`/profiles/${seller?.id}`} className="font-semibold text-slate-900 hover:text-emerald-600 hover:underline">
                  {seller?.displayName}
                </Link>
                <p className="text-sm text-slate-500">{seller?.roleLabel}</p>
                <div className="flex items-center text-sm text-slate-500 mt-1">
                  <MapPin className="mr-1 h-3 w-3" /> {seller?.location}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-3 rounded-lg">
                  <div className="text-xs text-slate-500 mb-1">Reputation</div>
                  <div className="font-semibold text-emerald-600">{seller?.sellerScore}/100</div>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg">
                  <div className="text-xs text-slate-500 mb-1">Completed</div>
                  <div className="font-semibold text-slate-900">{seller?.sellerCompletedCount} deals</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
