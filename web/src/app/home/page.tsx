import { Metadata } from 'next';
import Link from 'next/link';
import { ShoppingBag, Store, Handshake, Landmark, ChevronRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Home | Settleway',
  description: 'Settleway Testnet App Home',
};

// Force dynamic rendering so searchParams (demo=1, role) are read at request time.
export const dynamic = 'force-dynamic';

interface SearchParams {
  demo?: string;
  role?: string;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const resolvedSearch = await searchParams;
  const isDemo = resolvedSearch.demo === '1';
  const role = resolvedSearch.role;
  const isBuyer = role === 'buyer';
  const isSeller = role === 'seller';

  // Construct base query param string to forward demo state
  const queryParams = new URLSearchParams();
  if (isDemo) queryParams.set('demo', '1');
  if (role) queryParams.set('role', role);
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--navy-900)] sm:text-4xl flex items-center gap-3">
          Welcome to Settleway
          {isDemo && (
            <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10">
              Testnet Preview
            </span>
          )}
        </h1>
        {isDemo ? (
          <p className="mt-2 text-lg text-slate-600">
            {isBuyer 
              ? 'Browse verified supply, submit offers, and settle through a trusted Deal Room.' 
              : isSeller 
              ? 'Review verified demand, manage deals, submit proof, and build reputation.' 
              : 'Your trusted gateway to verified agricultural trade and settlement.'}
          </p>
        ) : (
          <p className="mt-2 text-lg text-slate-600">
            Your trusted gateway to verified agricultural trade and settlement.
          </p>
        )}
      </header>

      {/* Role-Aware Guidance */}
      {isDemo && (
        <section className="mb-12 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-[var(--navy-900)]">
            Start your workflow
          </h2>
          <ol className="mt-6 flex flex-col gap-4 sm:flex-row sm:gap-6">
            {isBuyer ? (
              <>
                <li className="flex-1">
                  <div className="font-semibold text-emerald-700">1. Browse Supply</div>
                  <div className="mt-1 text-sm text-slate-600">Find verified agricultural products in the Buy catalog.</div>
                </li>
                <li className="flex-1">
                  <div className="font-semibold text-emerald-700">2. Submit Offer</div>
                  <div className="mt-1 text-sm text-slate-600">Enter a secure Deal Room and deposit your funds.</div>
                </li>
                <li className="flex-1">
                  <div className="font-semibold text-emerald-700">3. Review Settlement Evidence</div>
                  <div className="mt-1 text-sm text-slate-600">Accept delivery proof and release funds instantly.</div>
                </li>
              </>
            ) : isSeller ? (
              <>
                <li className="flex-1">
                  <div className="font-semibold text-emerald-700">1. Review Demand</div>
                  <div className="mt-1 text-sm text-slate-600">Check the Sell catalog or view active Deals.</div>
                </li>
                <li className="flex-1">
                  <div className="font-semibold text-emerald-700">2. Submit Delivery Proof</div>
                  <div className="mt-1 text-sm text-slate-600">Upload delivery evidence to unlock buyer funds.</div>
                </li>
                <li className="flex-1">
                  <div className="font-semibold text-emerald-700">3. Build Reputation</div>
                  <div className="mt-1 text-sm text-slate-600">Successful settlements unlock Funding eligibility.</div>
                </li>
              </>
            ) : (
              <li className="flex-1 text-slate-600">
                Explore the platform to see how Settleway secures agricultural trade.
              </li>
            )}
          </ol>
        </section>
      )}

      {/* App Navigation Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href={`/marketplace${queryString}`}
          className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:border-emerald-500 hover:shadow-md"
        >
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-100">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <h3 className="mt-4 font-bold text-slate-900">Buy</h3>
            <p className="mt-1 text-sm text-slate-500">Browse supply listings from verified sellers.</p>
          </div>
          <div className="mt-6 flex items-center text-sm font-semibold text-emerald-600">
            Explore Supply <ChevronRight className="ml-1 h-4 w-4" />
          </div>
        </Link>

        <Link
          href={`/buyer-requests${queryString}`}
          className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:border-emerald-500 hover:shadow-md"
        >
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-orange-600 group-hover:bg-orange-100">
              <Store className="h-6 w-6" />
            </div>
            <h3 className="mt-4 font-bold text-slate-900">Sell</h3>
            <p className="mt-1 text-sm text-slate-500">Review buyer requests and sell into verified demand.</p>
          </div>
          <div className="mt-6 flex items-center text-sm font-semibold text-emerald-600">
            View Requests <ChevronRight className="ml-1 h-4 w-4" />
          </div>
        </Link>

        <Link
          href={`/deals${queryString}`}
          className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:border-emerald-500 hover:shadow-md"
        >
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100">
              <Handshake className="h-6 w-6" />
            </div>
            <h3 className="mt-4 font-bold text-slate-900">Deals</h3>
            <p className="mt-1 text-sm text-slate-500">Manage active Deal Rooms and track settlements.</p>
          </div>
          <div className="mt-6 flex items-center text-sm font-semibold text-emerald-600">
            Open Deals <ChevronRight className="ml-1 h-4 w-4" />
          </div>
        </Link>

        <Link
          href={`/funding${queryString}`}
          className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:border-emerald-500 hover:shadow-md"
        >
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600 group-hover:bg-purple-100">
              <Landmark className="h-6 w-6" />
            </div>
            <h3 className="mt-4 font-bold text-slate-900">Funding</h3>
            <p className="mt-1 text-sm text-slate-500">Discover funding unlocked by verified reputation.</p>
          </div>
          <div className="mt-6 flex items-center text-sm font-semibold text-emerald-600">
            View Funding <ChevronRight className="ml-1 h-4 w-4" />
          </div>
        </Link>
      </div>
    </div>
  );
}
