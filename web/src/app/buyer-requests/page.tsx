import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { demoBuyerRequests, demoProfiles } from '@/lib/demo/demo-data';
import { Search, MapPin, Scale, Coins, ShieldCheck, FileText, Tag } from 'lucide-react';

export default function BuyerRequestsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8 md:flex md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Buyer Requests</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Find serious buyer demand with visible trust signals before negotiation starts. Supply
            discussions remain recorded before any protected room is opened.
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search requests..." 
              className="h-10 w-full md:w-64 rounded-md border border-slate-300 pl-10 pr-4 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <Button variant="primary" className="hidden sm:inline-flex">Post Request</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {demoBuyerRequests.map(req => {
          const buyer = demoProfiles[req.buyerId];
          return (
            <Card key={req.id} className="flex flex-col hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold text-slate-900">{req.commodity}</h3>
                  <Badge className="bg-amber-100 text-amber-800 border-amber-200">Open Request</Badge>
                </div>
                <p className="text-sm text-slate-500 mb-4">{req.variety}</p>
                <p className="text-sm text-slate-700 mb-6">{req.description}</p>
                
                <div className="grid grid-cols-2 gap-4 mb-6 bg-slate-50 p-4 rounded-lg">
                  <div className="flex items-start text-sm text-slate-600">
                    <Scale className="mr-2 h-4 w-4 text-emerald-600 mt-0.5" />
                    <div>
                      <span className="block text-xs text-slate-400">Required Volume</span>
                      <span className="font-medium text-slate-900">{req.requiredVolumeKg.toLocaleString('id-ID')} kg</span>
                    </div>
                  </div>
                  <div className="flex items-start text-sm text-slate-600">
                    <Coins className="mr-2 h-4 w-4 text-emerald-600 mt-0.5" />
                    <div>
                      <span className="block text-xs text-slate-400">Target Price</span>
                      <span className="font-medium text-slate-900">Rp {req.targetPricePerKgIdr.toLocaleString('id-ID')} / kg</span>
                    </div>
                  </div>
                  <div className="flex items-start text-sm text-slate-600 col-span-2 border-t border-slate-200 pt-3 mt-1">
                    <MapPin className="mr-2 h-4 w-4 text-emerald-600 mt-0.5" />
                    <div>
                      <span className="block text-xs text-slate-400">Delivery To</span>
                      <span className="font-medium text-slate-900">{req.deliveryLocation} by {new Date(req.requiredDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
                  <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Procurement Trust Signal
                  </div>
                  <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-3">
                    <div className="flex items-start gap-2">
                      <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-600" />
                      <div>
                        <div className="font-medium text-slate-900">
                          Buyer reputation {buyer?.buyerScore}/100
                        </div>
                        <div className="text-xs text-slate-500">
                          {buyer?.buyerCompletedCount} verified buyer completions
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Tag className="mt-0.5 h-4 w-4 text-emerald-600" />
                      <div>
                        <div className="font-medium text-slate-900">
                          Verified volume Rp {(buyer?.verifiedVolumeIdr ?? 0).toLocaleString('id-ID')}
                        </div>
                        <div className="text-xs text-slate-500">
                          Protected purchase history visible before supply discussion
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <FileText className="mt-0.5 h-4 w-4 text-emerald-600" />
                      <div>
                        <div className="font-medium text-slate-900">
                          Proof mode {buyer?.proofVisibility === 'public' ? 'Public' : 'Private'}
                        </div>
                        <div className="text-xs text-slate-500">
                          Submit Offer opens recorded negotiation before any protected room begins
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                      {buyer?.displayName.charAt(0)}
                    </div>
                    <div>
                      <Link href={`/profiles/${buyer?.id}`} className="text-sm font-medium text-slate-900 hover:text-emerald-600">
                        {buyer?.displayName}
                      </Link>
                      <div className="text-xs text-slate-500">Reputation: {buyer?.buyerScore}/100</div>
                    </div>
                  </div>
                  <Link href={`/offers/new?buyerRequestId=${req.id}`}>
                    <Button variant="secondary">Submit Offer</Button>
                  </Link>
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  Supply qualification starts in a recorded negotiation thread. Protected escrow
                  begins only after both sides commit to open the Deal Room.
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
