import Link from 'next/link';
import { CodeXml } from 'lucide-react';
import { SettlewayLogo } from '@/components/brand/SettlewayLogo';

export function Footer() {
  return (
    <footer className="border-t border-[var(--border-subtle)] bg-[#0c1b33] py-12 text-white">
      <div className="field-container">
        <div className="grid gap-10 md:grid-cols-[1fr_auto] md:items-start">
          <div className="max-w-lg">
            <SettlewayLogo className="[&_span:last-child]:text-white" />
            <p className="mt-4 text-sm leading-6 text-slate-300">
              A bilateral trade-assurance workspace for agricultural commodity discovery,
              commitment, evidence, and verifiable settlement.
            </p>
          </div>
          <nav className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm" aria-label="Footer">
            <Link href="/marketplace" className="text-slate-300 hover:text-white">
              Buy commodities
            </Link>
            <Link href="/buyer-requests" className="text-slate-300 hover:text-white">
              Sell to demand
            </Link>
            <Link href="/#how-it-works" className="text-slate-300 hover:text-white">
              How It Works
            </Link>
            <Link href="/#trust-settlement" className="text-slate-300 hover:text-white">
              Trust &amp; Settlement
            </Link>
            <Link href="/demo" className="text-slate-300 hover:text-white">
              Product status
            </Link>
            <a
              href="https://github.com/dwikabimantara99/settleway"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-slate-300 hover:text-white"
            >
              <CodeXml className="h-4 w-4" />
              GitHub
            </a>
          </nav>
        </div>
        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>Testnet proof infrastructure. No production bank rail or production custody claim.</p>
          <p>&copy; {new Date().getFullYear()} Settleway.</p>
        </div>
      </div>
    </footer>
  );
}
