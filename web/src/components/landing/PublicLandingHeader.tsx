'use client';

import Link from 'next/link';
import { Menu } from 'lucide-react';
import { useRef, useState } from 'react';
import { SettlewayLogo } from '@/components/brand/SettlewayLogo';
import { GetStartedModal } from './GetStartedModal';
import { DemoChooserModal } from './DemoChooserModal';

export function PublicLandingHeader({
  initialModalOpen = false,
  initialDemoOpen = false,
}: {
  initialModalOpen?: boolean;
  initialDemoOpen?: boolean;
}) {
  const [isModalOpen, setIsModalOpen] = useState(initialModalOpen);
  const [isDemoOpen, setIsDemoOpen] = useState(initialDemoOpen);
  const [modalFeedback, setModalFeedback] = useState<{
    message: string;
    tone: 'info' | 'success' | 'error';
  } | null>(null);
  const loginButtonRef = useRef<HTMLAnchorElement>(null);
  const demoButtonRef = useRef<HTMLAnchorElement>(null);

  const handleOpenModal = () => {
    setModalFeedback(null);
    setIsModalOpen(true);
  };

  const handleOpenDemo = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDemoOpen(true);
  };

  const handleGoogleClick = () => {
    setModalFeedback({
      tone: 'info',
      message:
        'Google sign-in is not connected in this MVP. The marketplace remains available without fabricating an account flow.',
    });
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
            <a
              href="#settleway-demo-chooser"
              ref={demoButtonRef}
              onClick={handleOpenDemo}
              className="inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold text-[var(--navy-900)] transition-colors hover:bg-white/80 hover:text-[var(--green-700)]"
            >
              Demo
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
                    href="#settleway-demo-chooser"
                    onClick={handleOpenDemo}
                    className="flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-[var(--navy-900)] hover:bg-[var(--surface-subtle)]"
                  >
                    Demo
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
        feedbackMessage={modalFeedback?.message}
        feedbackTone={modalFeedback?.tone}
      />
      <DemoChooserModal
        isOpen={isDemoOpen}
        onClose={() => setIsDemoOpen(false)}
        returnFocusRef={demoButtonRef}
      />
    </>
  );
}
