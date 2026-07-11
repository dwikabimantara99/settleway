import { Metadata } from 'next';
import { Landmark, TrendingUp, Users, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Funding | Settleway',
  description: 'Settleway Funding Preview',
};

export default function FundingPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--navy-900)] sm:text-4xl flex items-center gap-3">
          <Landmark className="h-8 w-8 text-emerald-600" />
          Funding Opportunities
        </h1>
        <p className="mt-3 text-lg text-slate-600 max-w-3xl">
          Verified Settleway users can unlock funding opportunities from completed settlement reputation. 
          Grow your agricultural operations securely with asset-backed community financing.
        </p>
      </header>

      <div className="mb-8 rounded-xl border border-blue-100 bg-blue-50 p-4 flex gap-3 text-blue-800 text-sm">
        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold block mb-1">Testnet Hackathon Preview</strong>
          Eligibility is based on verified settlements and settled volume on the public Stellar Testnet. 
          Real fundraising, payments, and investment execution are disabled in this demo environment.
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
          <div className="bg-emerald-50/50 p-6 border-b border-slate-100 relative">
            <span className="absolute top-6 right-6 inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
              Funding Preview
            </span>
            <h3 className="text-xl font-bold text-[var(--navy-900)] pr-24">Probolinggo Chili Expansion</h3>
            <p className="text-sm text-slate-600 mt-1">Applicant: Probolinggo Chili Cooperative</p>
          </div>
          
          <div className="p-6 flex-1 flex flex-col">
            <p className="text-slate-700 mb-6">
              <strong className="font-semibold text-slate-900">Purpose:</strong> Acquire 1 hectare of land and expand chili production capacity to meet verified Settleway demand.
            </p>

            <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-slate-500 mb-1">Funding Need</div>
                <div className="font-bold text-slate-900 text-lg">$30,000</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-slate-500 mb-1">Projected Return</div>
                <div className="font-bold text-emerald-600 text-lg flex items-center gap-1">
                  50% <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-slate-500 mb-1">Cycle Length</div>
                <div className="font-semibold text-slate-900">8 months</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-slate-500 mb-1">Contributor Slots</div>
                <div className="font-semibold text-slate-900 flex items-center gap-1">
                  100 <Users className="h-4 w-4 text-slate-400" />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-emerald-100 bg-white p-4 mb-6">
              <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Reputation Eligibility Met
              </h4>
              <div className="flex justify-between items-end border-t border-slate-100 pt-3 mt-3">
                <div>
                  <div className="text-xs text-slate-500">Verified Settlements</div>
                  <div className="font-semibold text-slate-900">12</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">Settled Volume</div>
                  <div className="font-semibold text-slate-900">$24,500</div>
                </div>
              </div>
            </div>

            <div className="mt-auto grid grid-cols-2 gap-3 pt-4">
              <button 
                type="button"
                className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
              >
                Join Funding Waitlist
              </button>
              <button 
                type="button"
                className="w-full rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
              >
                View Opportunity
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
