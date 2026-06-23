'use client';

import { RefObject, useEffect, useId, useRef } from 'react';
import { ShieldCheck, Wallet, X } from 'lucide-react';
import { getNextFocusIndex, isEscapeDismissKey } from './landing-interactions';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

function GoogleMark() {
  return (
    <svg aria-hidden="true" className="h-7 w-7" viewBox="0 0 24 24">
      <path
        fill="#EA4335"
        d="M12 10.2v3.92h5.45c-.22 1.26-.95 2.32-2.03 3.03l3.29 2.56c1.92-1.77 3.03-4.38 3.03-7.48 0-.7-.06-1.37-.19-2.03H12Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.97-.9 6.62-2.44l-3.29-2.56c-.91.61-2.08.97-3.33.97-2.56 0-4.73-1.73-5.5-4.05H3.1v2.64A9.99 9.99 0 0 0 12 22Z"
      />
      <path
        fill="#4A90E2"
        d="M6.5 13.92A5.98 5.98 0 0 1 6.2 12c0-.67.11-1.31.3-1.92V7.44H3.1A9.99 9.99 0 0 0 2 12c0 1.62.39 3.15 1.1 4.56l3.4-2.64Z"
      />
      <path
        fill="#FBBC05"
        d="M12 6.03c1.47 0 2.79.51 3.83 1.5l2.87-2.87C16.96 2.99 14.69 2 12 2A9.99 9.99 0 0 0 3.1 7.44l3.4 2.64c.77-2.33 2.94-4.05 5.5-4.05Z"
      />
    </svg>
  );
}

function LegalLink({
  href,
  label,
}: {
  href?: string;
  label: string;
}) {
  if (href) {
    return (
      <a
        href={href}
        className="font-medium text-emerald-600 underline-offset-4 hover:text-emerald-700 hover:underline"
      >
        {label}
      </a>
    );
  }

  return (
    <button
      type="button"
      className="font-medium text-emerald-600 underline-offset-4 hover:text-emerald-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
    >
      {label}
    </button>
  );
}

export function GetStartedModal({
  isOpen,
  onClose,
  returnFocusRef,
  onGoogleClick,
  onStellarClick,
  feedbackMessage,
  feedbackTone = 'info',
  termsHref,
  privacyHref,
}: {
  isOpen: boolean;
  onClose: () => void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
  onGoogleClick?: () => void;
  onStellarClick?: () => void;
  feedbackMessage?: string | null;
  feedbackTone?: 'info' | 'success' | 'error';
  termsHref?: string;
  privacyHref?: string;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
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

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[#07152b]/58 px-4 py-6 backdrop-blur-md sm:px-6"
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
        className="aurora-enter relative flex max-h-[calc(100vh-32px)] w-full max-w-[500px] flex-col overflow-y-auto rounded-[var(--radius-dialog)] border border-white/75 bg-white/95 p-6 shadow-[var(--shadow-dialog)] backdrop-blur-xl sm:p-8"
      >
        <button
          ref={closeButtonRef}
          type="button"
          aria-label="Close Login modal"
          onClick={onClose}
          className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--navy-900)] text-white shadow-[0_12px_30px_rgb(16_32_59_/_0.2)]">
          <ShieldCheck className="h-7 w-7" />
        </div>

        <h2
          id={titleId}
          className="mt-6 text-center text-[clamp(1.8rem,6vw,2.35rem)] font-semibold tracking-tight text-[var(--navy-900)]"
        >
          Enter Settleway
        </h2>

        <p
          id={descriptionId}
          className="mx-auto mt-4 max-w-sm text-center text-base leading-7 text-slate-600"
        >
          Choose an available account path for the agricultural trade workspace.
        </p>

        <div className="mt-8 space-y-4">
          <button
            type="button"
            onClick={onGoogleClick}
            className="inline-flex min-h-14 w-full items-center justify-center gap-4 rounded-2xl border border-[var(--border-default)] bg-white px-5 text-base font-semibold text-[var(--navy-900)] transition-colors hover:bg-[var(--surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          >
            <GoogleMark />
            <span>Continue with Google</span>
          </button>

          <div className="flex items-center gap-4 text-sm text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            <span>or</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <button
            type="button"
            onClick={onStellarClick}
            className="inline-flex min-h-14 w-full items-center justify-center gap-4 rounded-2xl border border-[var(--azure-300)]/60 bg-[var(--azure-50)] px-5 text-base font-semibold text-[var(--navy-900)] transition-colors hover:bg-[var(--azure-100)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          >
            <Wallet className="h-6 w-6 text-slate-950" />
            <span>Connect Stellar Wallet</span>
          </button>

          {feedbackMessage ? (
            <p
              role="status"
              className={`rounded-xl border px-4 py-3 text-sm leading-6 ${
                feedbackTone === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : feedbackTone === 'error'
                    ? 'border-red-200 bg-red-50 text-red-700'
                    : 'border-slate-200 bg-slate-50 text-slate-600'
              }`}
            >
              {feedbackMessage}
            </p>
          ) : null}
        </div>

        <div className="mt-6 rounded-2xl border border-[var(--border-subtle)] bg-gradient-to-br from-[var(--green-50)] to-[var(--azure-50)] px-5 py-4">
          <div className="flex items-start gap-4">
            <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-emerald-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[var(--navy-900)]">Protected by design</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Escrow-backed transactions, on-chain verification, and transparent settlements.
              </p>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-sm leading-6 text-slate-500">
          By continuing, you agree to our <LegalLink href={termsHref} label="Terms of Service" /> and{' '}
          <LegalLink href={privacyHref} label="Privacy Policy" />.
        </p>
      </div>
    </div>
  );
}
