import { ShieldCheck } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50 py-12 text-slate-600">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-emerald-600" />
            <span className="text-lg font-semibold text-slate-900">Settleway</span>
          </div>
          <p className="text-sm">
            The Safer Way to Settle Real-World Trade
          </p>
        </div>
        <div className="mt-8 border-t border-slate-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <p>Structured negotiation. Protected settlement. Verifiable outcomes.</p>
          <p>&copy; {new Date().getFullYear()} Settleway.</p>
        </div>
      </div>
    </footer>
  );
}
