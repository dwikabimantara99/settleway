import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { demoBuyerRequests, demoProfiles } from '@/lib/demo/demo-data';
import { Search, MapPin, Scale, Coins } from 'lucide-react';

export default function BuyerRequestsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8 md:flex md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Buyer Requests</h1>
          <p className="mt-2 text-sm text-slate-600">Find buyers looking for specific commodities and supply them securely.</p>
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
                  <Button variant="secondary" disabled title="Deal Room starts in Phase 3">Propose Supply (Phase 3)</Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
