import { Rocket, Info, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';

interface CrowdfundingEligibilityCardProps {
  completedDeals: number;
  verifiedVolume: number;
}

export function CrowdfundingEligibilityCard({ completedDeals, verifiedVolume }: CrowdfundingEligibilityCardProps) {
  const DEALS_THRESHOLD = 10;
  const VOLUME_THRESHOLD = 20000 * 15000; // rough IDR conversion for UI
  
  const meetsDeals = completedDeals >= DEALS_THRESHOLD;
  const meetsVolume = verifiedVolume >= VOLUME_THRESHOLD;
  const isEligible = meetsDeals && meetsVolume;

  return (
    <Card className="rounded-2xl shadow-sm border-slate-200 mt-6">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          
          <div className="flex items-start gap-4 flex-1">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-600">
              <Rocket className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-950 flex items-center gap-2">
                Crowdfunding Eligibility
                {isEligible ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Eligible
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                    <XCircle className="h-3.5 w-3.5" /> Not eligible yet
                  </span>
                )}
              </h2>
              <p className="mt-1 text-sm text-slate-500 flex items-center gap-1.5">
                <Info className="h-4 w-4" /> Eligibility is unlocked from verified settled deals.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 flex-1 justify-end">
            <div className="space-y-2 text-sm text-slate-700 bg-slate-50 border border-slate-100 rounded-lg p-3 min-w-[160px]">
              <div className="font-semibold text-slate-900">Completed Settlements</div>
              <div className="flex justify-between items-center">
                <span className="font-mono">{completedDeals} / {DEALS_THRESHOLD}</span>
                {meetsDeals ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-slate-400" />}
              </div>
            </div>

            <div className="space-y-2 text-sm text-slate-700 bg-slate-50 border border-slate-100 rounded-lg p-3 min-w-[200px]">
              <div className="font-semibold text-slate-900">Settled Volume</div>
              <div className="flex justify-between items-center">
                <span className="font-mono">Rp {(verifiedVolume / 1000000).toFixed(1)}M / Rp 300M</span>
                {meetsVolume ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-slate-400" />}
              </div>
            </div>
          </div>

        </div>
      </CardContent>
    </Card>
  );
}
