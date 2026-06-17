import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { RoleSwitcher } from '../demo/RoleSwitcher';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white transition-transform group-hover:scale-105">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">Settleway</span>
          </Link>
        </div>
        
        <nav className="hidden md:flex items-center gap-8">
          <Link href="/marketplace" className="text-sm font-medium text-slate-600 hover:text-emerald-600 transition-colors">
            Marketplace
          </Link>
          <Link href="/buyer-requests" className="text-sm font-medium text-slate-600 hover:text-emerald-600 transition-colors">
            Buyer Requests
          </Link>
          <Link href="/notifications" className="text-sm font-medium text-slate-600 hover:text-emerald-600 transition-colors">
            Notifications
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <RoleSwitcher />
        </div>
      </div>
    </header>
  );
}
