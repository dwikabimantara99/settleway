'use client';

import Link from 'next/link';
import { ChevronDown, Menu, ShoppingBag, Store } from 'lucide-react';
import { useRef, useState } from 'react';
import { SettlewayLogo } from '@/components/brand/SettlewayLogo';
import { GetStartedModal } from './GetStartedModal';
import { isEscapeDismissKey, isMarketplaceOpenKey } from './landing-interactions';
import {
  getFreighterApi,
  readStringResult,
  shortenStellarAddress,
} from '@/lib/stellar/freighter-client';

const marketplaceItems = [
  {
    href: '/marketplace',
    label: 'Buy',
    description: 'Review verified agricultural supply.',
    icon: ShoppingBag,
  },
  {
    href: '/buyer-requests',
    label: 'Sell',
    description: 'Respond to active buyer requirements.',
    icon: Store,
  },
];

export function PublicLandingHeader({
  initialMarketplaceOpen = false,
  initialModalOpen = false,
}: {
  initialMarketplaceOpen?: boolean;
  initialModalOpen?: boolean;
}) {
  const [isMarketplaceOpen, setIsMarketplaceOpen] = useState(initialMarketplaceOpen);
  const [isModalOpen, setIsModalOpen] = useState(initialModalOpen);
  const [modalFeedback, setModalFeedback] = useState<{
    message: string;
    tone: 'info' | 'success' | 'error';
  } | null>(null);
  const loginButtonRef = useRef<HTMLAnchorElement>(null);

  const handleOpenModal = () => {
    setModalFeedback(null);
    setIsModalOpen(true);
  };

  const handleGoogleClick = () => {
    setModalFeedback({
      tone: 'info',
      message:
        'Google sign-in is not connected in this MVP. The marketplace remains available without fabricating an account flow.',
    });
  };

  const handleStellarClick = async () => {
    const freighter = await getFreighterApi();

    if (!freighter) {
      setModalFeedback({
        tone: 'error',
        message:
          'Settleway could not load the Freighter browser bridge. Refresh the page and confirm Freighter is enabled for this site.',
      });
      return;
    }

    try {
      const accessResult = freighter.requestAccess ? await freighter.requestAccess() : null;
      const addressResult = freighter.getAddress
        ? await freighter.getAddress()
        : freighter.getPublicKey
          ? await freighter.getPublicKey()
          : accessResult;
      const address = readStringResult(addressResult, ['address', 'publicKey', 'public_key']);

      if (!address) {
        setModalFeedback({
          tone: 'error',
          message: 'The wallet opened, but Settleway could not read a public Stellar address.',
        });
        return;
      }

      setModalFeedback({
        tone: 'success',
        message: `Wallet detected: ${shortenStellarAddress(address)}. Profile linking remains a signed-in profile action.`,
      });
    } catch {
      setModalFeedback({
        tone: 'error',
        message: 'The wallet connection was cancelled or could not be completed.',
      });
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/60 bg-white/78 backdrop-blur-xl">
        <div className="field-container flex min-h-[4.5rem] items-center gap-4">
          <SettlewayLogo className="relative z-10" />

          <nav
            className="mx-auto hidden items-center gap-1 lg:flex"
            aria-label="Public navigation"
          >
            <div
              className="group relative"
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
                onKeyDown={(event) => {
                  if (isMarketplaceOpen && isEscapeDismissKey(event.key)) {
                    event.preventDefault();
                    setIsMarketplaceOpen(false);
                    return;
                  }
                  if (isMarketplaceOpenKey(event.key)) {
                    event.preventDefault();
                    setIsMarketplaceOpen(true);
                  }
                }}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-[var(--navy-900)] transition-colors hover:bg-white/80 hover:text-[var(--green-700)]"
              >
                Marketplace
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${isMarketplaceOpen ? 'rotate-180 text-[var(--green-700)]' : 'text-[var(--text-muted)]'}`}
                />
              </button>

              <div
                role="menu"
                aria-label="Marketplace routes"
                className={`absolute left-1/2 top-full z-30 w-[22rem] -translate-x-1/2 pt-3 ${isMarketplaceOpen ? 'block' : 'hidden'} group-hover:block group-focus-within:block`}
              >
                <div className="aurora-acrylic overflow-hidden rounded-[1.25rem] p-2">
                  {marketplaceItems.map(({ href, label, description, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      role="menuitem"
                      className="flex min-h-16 items-start gap-3 rounded-2xl px-4 py-3 transition-colors hover:bg-[var(--azure-50)] focus-visible:bg-[var(--azure-50)] focus-visible:outline-none"
                    >
                      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[var(--green-700)]" />
                      <span>
                        <span className="block text-sm font-semibold text-[var(--navy-900)]">
                          {label}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-[var(--text-secondary)]">
                          {description}
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <a
              href="#how-it-works"
              className="inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold text-[var(--navy-900)] transition-colors hover:bg-white/80 hover:text-[var(--green-700)]"
            >
              How It Works
            </a>
            <a
              href="#trust-settlement"
              className="inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold text-[var(--navy-900)] transition-colors hover:bg-white/80 hover:text-[var(--green-700)]"
            >
              Trust &amp; Settlement
            </a>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <a
              ref={loginButtonRef}
              href="#settleway-login"
              onClick={handleOpenModal}
              className="hidden min-h-11 items-center justify-center rounded-xl bg-[var(--navy-900)] px-5 text-sm font-semibold text-white shadow-[0_12px_28px_rgb(16_32_59_/_0.18)] transition-colors hover:bg-[var(--navy-700)] sm:inline-flex"
            >
              Login
            </a>
            <details className="group/mobile relative lg:hidden">
              <summary
                aria-label="Open navigation"
                className="inline-flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-xl text-[var(--navy-900)] hover:bg-white/80 [&::-webkit-details-marker]:hidden"
              >
                <Menu className="h-5 w-5" />
              </summary>
              <nav
                aria-label="Mobile public navigation"
                className="absolute right-0 top-full z-40 mt-3 w-[min(19rem,calc(100vw-2rem))] rounded-2xl border border-[var(--border-subtle)] bg-white/96 p-3 shadow-[var(--shadow-panel)] backdrop-blur-xl"
              >
                <div className="grid gap-1">
                  {marketplaceItems.map(({ href, label }) => (
                    <Link
                      key={href}
                      href={href}
                      className="flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-[var(--navy-900)] hover:bg-[var(--surface-subtle)]"
                    >
                      {label}
                    </Link>
                  ))}
                  <a
                    href="#how-it-works"
                    className="flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-[var(--navy-900)] hover:bg-[var(--surface-subtle)]"
                  >
                    How It Works
                  </a>
                  <a
                    href="#trust-settlement"
                    className="flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-[var(--navy-900)] hover:bg-[var(--surface-subtle)]"
                  >
                    Trust &amp; Settlement
                  </a>
                  <a
                    href="#settleway-login"
                    onClick={handleOpenModal}
                    className="mt-2 inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--navy-900)] px-4 text-sm font-semibold text-white"
                  >
                    Login
                  </a>
                </div>
              </nav>
            </details>
          </div>
        </div>
      </header>

      <GetStartedModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        returnFocusRef={loginButtonRef}
        onGoogleClick={handleGoogleClick}
        onStellarClick={handleStellarClick}
        feedbackMessage={modalFeedback?.message}
        feedbackTone={modalFeedback?.tone}
      />
    </>
  );
}
