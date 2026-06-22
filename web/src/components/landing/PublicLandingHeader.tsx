'use client';

import Link from 'next/link';
import { ChevronDown, ShoppingBag, Store } from 'lucide-react';
import { useRef, useState } from 'react';
import { GetStartedModal } from './GetStartedModal';
import { isEscapeDismissKey, isMarketplaceOpenKey } from './landing-interactions';
import { getFreighterApi, readStringResult, shortenStellarAddress } from '@/lib/stellar/freighter-client';
import { SettlewayLogo } from '@/components/brand/SettlewayLogo';

const marketplaceItems = [
  { href: '/marketplace', label: 'Buy', icon: ShoppingBag },
  { href: '/buyer-requests', label: 'Sell', icon: Store },
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
  const dropdownRef = useRef<HTMLDivElement>(null);
  const getStartedButtonRef = useRef<HTMLButtonElement>(null);

  const handleOpenModal = () => {
    setModalFeedback(null);
    setIsModalOpen(true);
  };

  const handleGoogleClick = () => {
    setModalFeedback({
      tone: 'info',
      message: 'Google sign-in is not connected in this local MVP yet. Continue through the marketplace demo for now.',
    });
  };

  const handleStellarClick = async () => {
    const freighter = await getFreighterApi();

    if (!freighter) {
      setModalFeedback({
        tone: 'error',
        message: 'Settleway could not load the Freighter browser bridge. Refresh the page and confirm Freighter is enabled for this site.',
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
      const address = readStringResult(addressResult, [
        'address',
        'publicKey',
        'public_key',
      ]);

      if (!address) {
        setModalFeedback({
          tone: 'error',
          message: 'The wallet opened, but Settleway could not read a public Stellar address.',
        });
        return;
      }

      setModalFeedback({
        tone: 'success',
        message: `Wallet detected: ${shortenStellarAddress(address)}. Profile linking is handled from the signed-in profile page.`,
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
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6 lg:px-8">
          <SettlewayLogo className="order-1" />

          <nav className="order-3 flex basis-full items-center justify-center gap-5 text-sm font-semibold text-slate-950 sm:gap-6 lg:order-2 lg:basis-auto lg:flex-1 lg:gap-9">
            <Link href="/" className="relative py-2 text-emerald-600">
              Home
              <span className="absolute inset-x-2 -bottom-1 h-0.5 rounded-full bg-emerald-600" />
            </Link>

            <div
              ref={dropdownRef}
              className="relative"
              onMouseEnter={() => setIsMarketplaceOpen(true)}
              onMouseLeave={() => setIsMarketplaceOpen(false)}
              onBlur={(event) => {
                const nextTarget = event.relatedTarget;
                if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
                  return;
                }

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
                className="inline-flex items-center gap-2 py-2 text-slate-950 transition-colors hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                Marketplace
                <ChevronDown
                  className={`h-5 w-5 transition-transform ${isMarketplaceOpen ? 'rotate-180 text-emerald-600' : 'text-slate-500'}`}
                />
              </button>

              {isMarketplaceOpen ? (
                <div
                  role="menu"
                  aria-label="Marketplace routes"
                  className="absolute left-1/2 top-full z-30 w-56 -translate-x-1/2 pt-3"
                >
                  <div className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.14)]">
                    {marketplaceItems.map(({ href, label, icon: Icon }, index) => (
                      <Link
                        key={label}
                        href={href}
                        role="menuitem"
                        className={`flex items-center gap-3 px-5 py-4 text-left text-base font-semibold text-slate-950 transition-colors hover:bg-emerald-50 focus-visible:bg-emerald-50 focus-visible:outline-none ${index === 0 ? 'border-b border-slate-200' : ''}`}
                      >
                        <Icon className="h-6 w-6 text-emerald-600" />
                        {label}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <a
              href="#about"
              className="py-2 text-slate-950 transition-colors hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              About
            </a>

            <a
              href="#faq"
              className="py-2 text-slate-950 transition-colors hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              FAQ
            </a>
          </nav>

          <button
            ref={getStartedButtonRef}
            type="button"
            onClick={handleOpenModal}
            className="order-2 ml-auto inline-flex h-11 items-center justify-center rounded-xl bg-emerald-600 px-6 text-base font-semibold text-white shadow-[0_12px_28px_rgba(16,185,129,0.18)] transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 lg:order-3"
          >
            Get Started
          </button>
        </div>
      </header>

      <GetStartedModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        returnFocusRef={getStartedButtonRef}
        onGoogleClick={handleGoogleClick}
        onStellarClick={handleStellarClick}
        feedbackMessage={modalFeedback?.message}
        feedbackTone={modalFeedback?.tone}
      />
    </>
  );
}
