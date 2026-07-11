"use client";

import { useState, useEffect } from 'react';
import { Check, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePathname, useRouter } from 'next/navigation';

const roles = [
  { id: 'buyer-surabaya-restaurant', label: 'Buyer' },
  { id: 'seller-probolinggo-cabai', label: 'Seller' },
  { id: 'operator', label: 'Operator' },
];

export function RoleSwitcher() {
  const [role, setRole] = useState<string>('operator');
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isDevRoleSwitcher, setIsDevRoleSwitcher] = useState(false);

  useEffect(() => {
    // Check current demo_mode cookie or URL param
    const searchParams = new URLSearchParams(window.location.search);
    const hasDemoParam = searchParams.get('demo') === '1';
    const hasDevSwitcherParam = searchParams.get('devRoleSwitcher') === '1';
    
    if (hasDevSwitcherParam) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Safe initialization sync
      setIsDevRoleSwitcher(true);
    }
    
    const demoMatch = document.cookie.match(/(?:(?:^|.*;\s*)demo_mode\s*\=\s*([^;]*).*$)|^.*$/);
    const hasDemoCookie = demoMatch && demoMatch[1] === '1';

    if (hasDemoParam || hasDemoCookie) {
      if (hasDemoParam && !hasDemoCookie) {
        document.cookie = 'demo_mode=1; path=/; max-age=86400';
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Safe in DOM cookie sync
      setIsDemoMode(true);
    }

    // Check current mock_actor cookie
    const match = document.cookie.match(/(?:(?:^|.*;\s*)mock_actor\s*\=\s*([^;]*).*$)|^.*$/);
    if (match && match[1]) {
      setRole(match[1]);
    } else if (hasDemoParam || hasDemoCookie) {
      setRole('buyer-surabaya-restaurant');
      document.cookie = 'mock_actor=buyer-surabaya-restaurant; path=/; max-age=86400';
    }
  }, []);

  const handleRoleChange = async (newRole: string) => {
    setRole(newRole);
    setIsOpen(false);
    // eslint-disable-next-line react-hooks/immutability -- Safe to modify document.cookie directly for demo simulation
    document.cookie = `mock_actor=${newRole}; path=/; max-age=86400`;
    if (pathname.startsWith('/profiles/')) {
      router.push(newRole === 'operator' ? '/deals' : `/profiles/${newRole}`);
      return;
    }
    router.refresh();
  };

  if (!isDemoMode || !isDevRoleSwitcher) {
    return null;
  }

  return (
    <div className="fixed bottom-5 left-5 z-[2147483647]">
      {isOpen ? (
        <div className="mb-3 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.16)]">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Demo role</p>
          </div>
          <div className="p-1.5">
            {roles.map((r) => {
              const active = role === r.id;

              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleRoleChange(r.id)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-950',
                  )}
                >
                  <span>{r.label}</span>
                  {active ? <Check className="h-4 w-4" /> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <button
        type="button"
        aria-expanded={isOpen}
        aria-label="Open demo role switcher"
        onClick={() => setIsOpen((open) => !open)}
        className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-slate-950 text-white shadow-[0_14px_32px_rgba(15,23,42,0.28)] ring-1 ring-slate-950/10 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
      >
        <Play className={cn('h-5 w-5 fill-current transition-transform', isOpen ? 'rotate-90' : '')} />
      </button>
    </div>
  );
}
