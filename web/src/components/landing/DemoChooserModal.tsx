'use client';

import { MouseEvent, RefObject, useEffect, useId, useRef } from 'react';
import Link from 'next/link';
import { ShoppingBag, Store, ShieldCheck, X } from 'lucide-react';
import { getNextFocusIndex, isEscapeDismissKey } from './landing-interactions';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export function DemoChooserModal({
  isOpen,
  onClose,
  returnFocusRef,
}: {
  isOpen: boolean;
  onClose: () => void;
  returnFocusRef: RefObject<HTMLElement | null>;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLAnchorElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const returnFocusElement = returnFocusRef.current;
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    const frame = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEscapeDismissKey(event.key)) {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const dialog = dialogRef.current;
      if (!dialog) {
        return;
      }

      const focusableElements = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((element) => !element.hasAttribute('disabled'));

      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const currentIndex = focusableElements.findIndex((element) => element === document.activeElement);
      const nextIndex = getNextFocusIndex(currentIndex, focusableElements.length, event.shiftKey);

      event.preventDefault();
      focusableElements[nextIndex]?.focus();
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      returnFocusElement?.focus();
    };
  }, [isOpen, onClose, returnFocusRef]);

  return (
    <div
      id="settleway-demo-chooser"
      data-open={isOpen ? 'true' : 'false'}
      className="settleway-modal-shell fixed inset-0 z-[100] items-center justify-center overflow-y-auto bg-[#07152b]/58 px-4 py-6 backdrop-blur-md sm:px-6"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="aurora-enter relative flex max-h-[calc(100vh-32px)] w-full max-w-[600px] flex-col overflow-y-auto rounded-[var(--radius-dialog)] border border-white/75 bg-white/95 p-6 shadow-[var(--shadow-dialog)] backdrop-blur-xl sm:p-8"
      >
        <a
          ref={closeButtonRef}
          href="#"
          role="button"
          aria-label="Close demo chooser"
          onClick={(event: MouseEvent<HTMLAnchorElement>) => {
            event.preventDefault();
            onClose();
            if (window.location.hash === '#settleway-demo-chooser') {
                window.history.replaceState(null, '', window.location.pathname + window.location.search);
            }
          }}
          className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <X className="h-6 w-6" />
        </a>

        <h2
          id={titleId}
          className="text-[clamp(1.5rem,5vw,2rem)] font-semibold tracking-tight text-[var(--navy-900)]"
        >
          Choose a Demo Role
        </h2>

        <p
          id={descriptionId}
          className="mt-3 text-base leading-7 text-slate-600"
        >
          Experience the Settleway trust corridor from different perspectives on the public Stellar Testnet. No account required.
        </p>

        <div className="mt-8 space-y-4">
          <Link
            href="/marketplace/listing-cabai-001?demo=1&role=buyer"
            className="group relative flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-emerald-500 hover:shadow-md"
            onClick={onClose}
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Try as Buyer</h3>
              <p className="mt-1 text-sm text-slate-600">
                Explore supply, submit an offer, and enter a Deal Room.
              </p>
            </div>
          </Link>

          <Link
            href="/deals/demo-cabai-001?demo=1&role=seller"
            className="group relative flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-emerald-500 hover:shadow-md"
            onClick={onClose}
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100">
              <Store className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Try as Seller</h3>
              <p className="mt-1 text-sm text-slate-600">
                Review the deal room, submit delivery proof, and see settlement evidence.
              </p>
            </div>
          </Link>

          <Link
            href="/profiles/seller-probolinggo-cabai?demo=1"
            className="group relative flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-emerald-500 hover:shadow-md"
            onClick={onClose}
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">View Reputation Profile</h3>
              <p className="mt-1 text-sm text-slate-600">
                See verified settlement reputation and funding eligibility.
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
