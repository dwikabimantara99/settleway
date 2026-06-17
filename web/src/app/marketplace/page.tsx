import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { demoListings, demoProfiles } from '@/lib/demo/demo-data';
import { Search, MapPin, Scale, Tag, ShieldCheck, FileText } from 'lucide-react';

export default function MarketplacePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8 md:flex md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Marketplace</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Discover agricultural supply from counterparties who already show reputation,
            protected volume, and proof expectations before any protected room is opened.
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-4">
          {/* Mock filters */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search commodities..." 
              className="h-10 w-full md:w-64 rounded-md border border-slate-300 pl-10 pr-4 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <Button variant="secondary" className="hidden sm:inline-flex">Filters</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {demoListings.map(listing => {
          const seller = demoProfiles[listing.sellerId];
          return (
            <Card key={listing.id} className="flex flex-col hover:border-emerald-500 transition-colors">
              <CardContent className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <Badge variant={listing.status === 'ready_stock' ? 'default' : 'secondary'} className={listing.status === 'ready_stock' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200' : 'bg-blue-100 text-blue-800 border-blue-200'}>
                    {listing.status === 'ready_stock' ? 'Ready Stock' : 'Pre-Harvest'}
                  </Badge>
                  <span className="text-lg font-bold text-slate-900">
                    Rp {listing.pricePerKgIdr.toLocaleString('id-ID')} <span className="text-xs font-normal text-slate-500">/kg</span>
                  </span>
                </div>
                
                <h3 className="text-lg font-semibold text-slate-900 mb-1">{listing.commodity}</h3>
                <p className="text-sm text-slate-500 mb-4">{listing.variety}</p>
                
                <div className="space-y-2 mb-6 flex-1">
                  <div className="flex items-center text-sm text-slate-600">
                    <MapPin className="mr-2 h-4 w-4 text-slate-400" />
                    {listing.location}
                  </div>
                  <div className="flex items-center text-sm text-slate-600">
                    <Scale className="mr-2 h-4 w-4 text-slate-400" />
                    {listing.estimatedVolumeKg.toLocaleString('id-ID')} kg available
                  </div>
                  <div className="flex items-center text-sm text-slate-600">
                    <Tag className="mr-2 h-4 w-4 text-slate-400" />
                    Est. Value: Rp {listing.estimatedValueIdr.toLocaleString('id-ID')}
                  </div>
                </div>

                <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Trust Signal
                  </div>
                  <div className="grid gap-3 text-sm text-slate-600">
                    <div className="flex items-start gap-2">
                      <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-600" />
                      <div>
                        <div className="font-medium text-slate-900">
                          Reputation {seller?.sellerScore}/100
                        </div>
                        <div className="text-xs text-slate-500">
                          {seller?.sellerCompletedCount} verified seller completions
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Tag className="mt-0.5 h-4 w-4 text-emerald-600" />
                      <div>
                        <div className="font-medium text-slate-900">
                          Verified volume Rp {(seller?.verifiedVolumeIdr ?? 0).toLocaleString('id-ID')}
                        </div>
                        <div className="text-xs text-slate-500">
                          Protected transaction history visible before negotiation starts
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <FileText className="mt-0.5 h-4 w-4 text-emerald-600" />
                      <div>
                        <div className="font-medium text-slate-900">
                          Proof mode {seller?.proofVisibility === 'public' ? 'Public' : 'Private'}
                        </div>
                        <div className="text-xs text-slate-500">
                          Submit Offer starts recorded negotiation before any protected room opens
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-auto border-t border-slate-100 pt-4 flex items-center justify-between">
                  <Link href={`/profiles/${seller?.id}`} className="text-sm font-medium text-emerald-600 hover:text-emerald-700">
                    {seller?.displayName}
                  </Link>
                  <Link href={`/marketplace/${listing.id}`}>
                    <Button size="sm">View Details</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
