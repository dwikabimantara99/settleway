import Link from 'next/link';
import { CodeXml } from 'lucide-react';
import { SettlewayLogo } from '@/components/brand/SettlewayLogo';

export function Footer() {
  return (
    <footer className="border-t border-[var(--border-subtle)] bg-[#0c1b33] py-14 text-white">
      <div className="field-container">
        <div className="grid gap-12 md:grid-cols-[1.6fr_1fr_1fr] md:gap-8 md:items-start">

          {/* Brand column */}
          <div className="max-w-sm">
            <SettlewayLogo className="[&_span:last-child]:text-white" />
            <p className="mt-4 text-sm leading-7 text-slate-300">
              A bilateral trade-assurance workspace for agricultural commodity discovery,
              commitment, evidence, and verifiable settlement.
            </p>
            <p className="mt-3 text-xs leading-6 text-slate-400">
              Testnet infrastructure only. No production banking rail, no Mainnet custody claim,
              and no guarantee of financing outcomes.
            </p>
          </div>

          {/* Product navigation */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Platform</p>
            <nav className="mt-4 grid gap-3 text-sm" aria-label="Footer platform links">
              <Link href="/marketplace" className="text-slate-300 transition-colors hover:text-white">
                Marketplace
              </Link>
              <Link href="/buyer-requests" className="text-slate-300 transition-colors hover:text-white">
                Buyer Requests
              </Link>
              <Link href="/deals" className="text-slate-300 transition-colors hover:text-white">
                Deals
              </Link>
            </nav>
          </div>

          {/* Information navigation */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Learn</p>
            <nav className="mt-4 grid gap-3 text-sm" aria-label="Footer information links">
              <Link href="/#how-it-works" className="text-slate-300 transition-colors hover:text-white">
                How It Works
              </Link>
              <Link href="/#trust-settlement" className="text-slate-300 transition-colors hover:text-white">
                Trust &amp; Settlement
              </Link>
              <a
                href="https://github.com/dwikabimantara99/settleway"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-slate-300 transition-colors hover:text-white"
              >
                <CodeXml className="h-4 w-4" />
                GitHub
              </a>
            </nav>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>Testnet proof infrastructure. No production bank rail or production custody claim.</p>
          <p>&copy; {new Date().getFullYear()} Settleway.</p>
        </div>
      </div>
    </footer>
  );
}
