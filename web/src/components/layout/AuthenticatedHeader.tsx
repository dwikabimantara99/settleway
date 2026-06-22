'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  Bell,
  ChevronDown,
  CircleHelp,
  LogOut,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Store,
  UserRound,
  WalletCards,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const DEFAULT_ACTOR = 'buyer-surabaya-restaurant';

function getActorFromCookie(): string {
  const match = document.cookie.match(/(?:^|;\s*)mock_actor=([^;]*)/);
  return match?.[1] ? decodeURIComponent(match[1]) : DEFAULT_ACTOR;
}

function getActorInitials(actorId: string): string {
  if (actorId === 'seller-probolinggo-cabai') return 'PF';
  if (actorId === 'buyer-surabaya-restaurant') return 'SS';
  return 'SW';
}

export function AuthenticatedHeader() {
  const pathname = usePathname();
  const [actorId, setActorId] = useState('operator');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMarketplaceOpen, setIsMarketplaceOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const marketplaceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Sync the demo actor from the browser cookie after hydration.
    setActorId(getActorFromCookie());
  }, []);

  const profileHref =
    actorId === 'operator' ? '/demo' : `/profiles/${actorId}`;
  const isMarketplaceRoute =
    pathname.startsWith('/marketplace') || pathname.startsWith('/buyer-requests');

  const handleLogout = () => {
    document.cookie = 'mock_actor=; path=/; max-age=0';
    window.location.href = '/';
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="order-1 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-[0_8px_18px_rgba(16,185,129,0.16)]">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-slate-950">Settleway</span>
        </Link>

        <nav className="order-3 flex basis-full items-center justify-center gap-5 text-sm font-semibold text-slate-950 sm:gap-6 lg:order-2 lg:basis-auto lg:flex-1 lg:gap-9">
          <Link
            href="/"
            className="relative py-2 transition-colors hover:text-emerald-600"
          >
            Home
          </Link>

          <div
            ref={marketplaceRef}
            className="relative"
            onMouseEnter={() => setIsMarketplaceOpen(true)}
            onMouseLeave={() => setIsMarketplaceOpen(false)}
            onBlur={(event) => {
              const nextTarget = event.relatedTarget;
              if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return;
              setIsMarketplaceOpen(false);
            }}
          >
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={isMarketplaceOpen}
              onClick={() => setIsMarketplaceOpen((open) => !open)}
              className={cn(
                'relative inline-flex items-center gap-2 py-2 transition-colors hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
                isMarketplaceRoute ? 'text-emerald-600' : 'text-slate-950',
              )}
            >
              Marketplace
              <ChevronDown
                className={`h-4 w-4 transition-transform ${isMarketplaceOpen ? 'rotate-180 text-emerald-600' : 'text-slate-500'}`}
              />
              {isMarketplaceRoute ? (
                <span className="absolute inset-x-1 -bottom-1 h-0.5 rounded-full bg-emerald-600" />
              ) : null}
            </button>

            {isMarketplaceOpen ? (
              <div
                role="menu"
                aria-label="Marketplace routes"
                className="absolute left-1/2 top-full z-30 w-56 -translate-x-1/2 pt-3"
              >
                <div className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.14)]">
                  <Link
                    href="/marketplace"
                    role="menuitem"
                    className="flex items-center gap-3 border-b border-slate-200 px-5 py-4 text-left text-base font-semibold text-slate-950 transition-colors hover:bg-emerald-50 focus-visible:bg-emerald-50 focus-visible:outline-none"
                  >
                    <ShoppingBag className="h-6 w-6 text-emerald-600" />
                    Buy
                  </Link>
                  <Link
                    href="/buyer-requests"
                    role="menuitem"
                    className="flex items-center gap-3 px-5 py-4 text-left text-base font-semibold text-slate-950 transition-colors hover:bg-emerald-50 focus-visible:bg-emerald-50 focus-visible:outline-none"
                  >
                    <Store className="h-6 w-6 text-emerald-600" />
                    Sell
                  </Link>
                </div>
              </div>
            ) : null}
          </div>

          <Link href="/#about" className="py-2 transition-colors hover:text-emerald-600">
            About
          </Link>
          <Link href="/#faq" className="py-2 transition-colors hover:text-emerald-600">
            FAQ
          </Link>
        </nav>

        <div className="order-2 ml-auto flex items-center gap-3 lg:order-3">
          <Link
            href="/notifications"
            aria-label="Notifications"
            className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-700 transition-colors hover:bg-slate-100 hover:text-emerald-700"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
          </Link>

          <div
            ref={menuRef}
            className="relative"
            onBlur={(event) => {
              const nextTarget = event.relatedTarget;
              if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return;
              setIsMenuOpen(false);
            }}
          >
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={isMenuOpen}
              aria-label="Open account menu"
              onClick={() => setIsMenuOpen((open) => !open)}
              className="flex items-center gap-2 rounded-full p-1 pr-2 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800 ring-2 ring-white">
                {getActorInitials(actorId)}
              </span>
              <ChevronDown
                className={`h-4 w-4 text-slate-600 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {isMenuOpen ? (
              <div
                role="menu"
                aria-label="Account menu"
                className="absolute right-0 top-full mt-3 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-[0_20px_55px_rgba(15,23,42,0.16)]"
              >
                <Link
                  href={profileHref}
                  role="menuitem"
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
                >
                  <UserRound className="h-4 w-4" />
                  Profile
                </Link>
                <Link
                  href="/deals/demo-cabai-001"
                  role="menuitem"
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
                >
                  <WalletCards className="h-4 w-4" />
                  Transactions
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  disabled
                  title="Settings are not available in the current MVP."
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </button>
                <Link
                  href="/demo"
                  role="menuitem"
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
                >
                  <CircleHelp className="h-4 w-4" />
                  Help
                </Link>
                <div className="my-2 border-t border-slate-200" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
