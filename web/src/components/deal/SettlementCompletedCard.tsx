import { CheckCircle2, Award } from 'lucide-react';
import type { DealStatus } from '@/lib/escrow/state-machine';
import { CopyButton } from '@/components/ui/CopyButton';

interface SettlementCompletedCardProps {
  status: DealStatus;
  settlementTxHash: string | null | undefined;
}

export function SettlementCompletedCard({ status, settlementTxHash }: SettlementCompletedCardProps) {
  if (status !== 'COMPLETED') return null;

  return (
    <section className="rounded-2xl border-2 border-emerald-500 bg-emerald-50/50 p-6 shadow-sm">
      <div className="flex items-center gap-4 mb-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-emerald-950">Settlement Completed</h2>
          <div className="text-sm text-emerald-800">The agricultural trade has reached its verified end state.</div>
        </div>
      </div>
      
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-4">
        <div className="rounded-xl bg-white p-4 border border-emerald-100 shadow-sm">
          <div className="text-sm font-medium text-slate-900">Principal released</div>
          <div className="text-xs text-slate-500 mt-1">Transferred to seller</div>
        </div>
        <div className="rounded-xl bg-white p-4 border border-emerald-100 shadow-sm">
          <div className="text-sm font-medium text-slate-900">Buyer bond refunded</div>
          <div className="text-xs text-slate-500 mt-1">Returned in full</div>
        </div>
        <div className="rounded-xl bg-white p-4 border border-emerald-100 shadow-sm">
          <div className="text-sm font-medium text-slate-900">Seller bond refunded</div>
          <div className="text-xs text-slate-500 mt-1">Returned in full</div>
        </div>
        <div className="rounded-xl bg-white p-4 border border-emerald-100 shadow-sm">
          <div className="flex items-center gap-1.5 text-sm font-medium text-slate-900">
            Reputation updated
            <Award className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-xs text-slate-500 mt-1">Completion recorded</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-emerald-800 bg-emerald-100/50 p-3 rounded-lg border border-emerald-200">
        <div className="flex items-center gap-1.5">
          <span className="opacity-70 uppercase tracking-wider text-[10px]">DB Status:</span>
          <span className="bg-emerald-600 text-white px-2 py-0.5 rounded uppercase tracking-wider text-[10px]">COMPLETED</span>
        </div>
        
        {settlementTxHash && (
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="opacity-70">Confirmed on Testnet:</span>
            <span className="font-mono text-emerald-900">{settlementTxHash.slice(0, 12)}...{settlementTxHash.slice(-8)}</span>
            <CopyButton text={settlementTxHash} className="h-5 w-5 text-emerald-700 hover:bg-emerald-200" />
          </div>
        )}
      </div>
    </section>
  );
}
