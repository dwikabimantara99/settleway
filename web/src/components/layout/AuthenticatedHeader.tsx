'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  Bell,
  ChevronDown,
  CircleHelp,
  LogOut,
  Menu,
  Settings,
  Handshake,
  UserRound,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SettlewayLogo } from '@/components/brand/SettlewayLogo';

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
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Sync the demo actor from the browser cookie after hydration.
    setActorId(getActorFromCookie());
  }, []);

  const profileHref =
    actorId === 'operator' ? '/demo' : `/profiles/${actorId}`;
  const handleLogout = () => {
    document.cookie = 'mock_actor=; path=/; max-age=0';
    window.location.href = '/';
  };

  const navigation = [
    { href: '/marketplace', label: 'Buy' },
    { href: '/buyer-requests', label: 'Sell' },
    { href: '/deals/demo-cabai-001', label: 'Deals' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/65 bg-white/82 backdrop-blur-xl">
      <div className="field-container flex min-h-[4.5rem] items-center gap-5">
        <SettlewayLogo />

        <nav className="mx-auto hidden items-center gap-1 lg:flex" aria-label="Primary navigation">
          {navigation.map((item) => {
            const active =
              item.href.startsWith('/deals/')
                ? pathname.startsWith('/deals')
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'relative inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-white hover:text-[var(--navy-900)]',
                  active && 'bg-white text-[var(--green-700)] shadow-sm',
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/notifications"
            aria-label="Notifications"
            className="relative flex h-11 w-11 items-center justify-center rounded-xl text-[var(--text-secondary)] hover:bg-white hover:text-[var(--navy-900)]"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[var(--green-700)] ring-2 ring-[var(--surface)]" />
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
              className="flex min-h-11 items-center gap-2 rounded-xl px-2 hover:bg-white"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--navy-100)] text-xs font-bold text-[var(--navy-800)]">
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
                className="aurora-acrylic absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-2xl p-1.5"
              >
                <Link
                  href={profileHref}
                  role="menuitem"
                  className="flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--navy-900)]"
                >
                  <UserRound className="h-4 w-4" />
                  Profile
                </Link>
                <Link
                  href="/deals/demo-cabai-001"
                  role="menuitem"
                  className="flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--navy-900)]"
                >
                  <Handshake className="h-4 w-4" />
                  Transactions
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  disabled
                  title="Settings are not available in the current MVP."
                  className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-[var(--text-muted)]"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </button>
                <Link
                  href="/demo"
                  role="menuitem"
                  className="flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--navy-900)]"
                >
                  <CircleHelp className="h-4 w-4" />
                  Help
                </Link>
                <div className="my-1 border-t border-[var(--border-subtle)]" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm font-semibold text-[var(--danger-600)] hover:bg-[var(--danger-50)]"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            aria-label={isMobileOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={isMobileOpen}
            onClick={() => setIsMobileOpen((open) => !open)}
            className="flex h-11 w-11 items-center justify-center rounded-md text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] lg:hidden"
          >
            {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {isMobileOpen ? (
        <nav
          aria-label="Mobile navigation"
          className="border-t border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 lg:hidden"
        >
          <div className="field-container grid gap-1">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className="flex min-h-11 items-center rounded-md px-3 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      ) : null}
    </header>
  );
}
