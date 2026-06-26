import { notFound } from 'next/navigation';
import { AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { FounderBrowserSetupForm } from './FounderBrowserSetupForm';
import {
  diagnoseCustodyV2BrowserRuntime,
  FOUNDER_BROWSER_CONTRACT_ID,
  NATIVE_XLM_SAC_TESTNET_CONTRACT_ID,
} from '@/lib/custody-v2/browser-corridor';
import { runtimeMode } from '@/lib/repositories';

export default function CustodyV2BrowserSetupPage() {
  const diagnostics = diagnoseCustodyV2BrowserRuntime(process.env, runtimeMode, process.env.NODE_ENV);

  if (!diagnostics.setupAllowed && process.env.NODE_ENV === 'production') {
    notFound();
  }

  return (
    <div className="aurora-canvas min-h-screen pb-16">
      <main className="field-container pt-10">
        <section className="rounded-[2rem] border border-[var(--border-subtle)] bg-white p-6 shadow-[var(--shadow-soft)] sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--green-200)] bg-[var(--green-50)] px-3 py-1.5 text-xs font-semibold text-[var(--green-700)]">
            <ShieldCheck className="h-4 w-4" />
            Development-only browser acceptance gate
          </div>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-[var(--navy-900)]">
            Custody V2 browser corridor setup
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--text-secondary)]">
            This page creates a fresh Deal Room explicitly assigned to the Custody V2 Testnet rail.
            It is only available outside production and does not mutate existing legacy demo deals.
          </p>
          <div className="mt-5 grid gap-3 text-xs text-[var(--text-secondary)] md:grid-cols-2">
            <div className="break-all">
              <span className="font-semibold text-[var(--navy-900)]">Contract:</span>{' '}
              {FOUNDER_BROWSER_CONTRACT_ID}
            </div>
            <div className="break-all">
              <span className="font-semibold text-[var(--navy-900)]">Native XLM SAC:</span>{' '}
              {NATIVE_XLM_SAC_TESTNET_CONTRACT_ID}
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[1.5rem] border border-[var(--border-subtle)] bg-white p-5 shadow-[var(--shadow-soft)]">
          <div className="flex items-start gap-3">
            {diagnostics.ok ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-[var(--green-700)]" />
            ) : (
              <AlertTriangle className="mt-0.5 h-5 w-5 text-[var(--warning-600)]" />
            )}
            <div>
              <h2 className="text-lg font-semibold text-[var(--navy-900)]">
                Runtime diagnostics
              </h2>
              {diagnostics.ok ? (
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Custody V2 Testnet configuration is present. The founder setup form is enabled.
                </p>
              ) : (
                <div className="mt-2 grid gap-2 text-sm text-red-700">
                  {diagnostics.errors.map((error) => (
                    <div key={error} className="rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                      {error}
                    </div>
                  ))}
                </div>
              )}
              {diagnostics.warnings.length > 0 ? (
                <div className="mt-3 grid gap-2 text-sm text-[var(--warning-700)]">
                  {diagnostics.warnings.map((warning) => (
                    <div key={warning} className="rounded-xl border border-yellow-200 bg-yellow-50 px-3 py-2">
                      {warning}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="mt-8">
          {diagnostics.ok ? (
            <FounderBrowserSetupForm />
          ) : (
            <div className="rounded-[1.5rem] border border-[var(--border-subtle)] bg-white p-6 text-sm leading-6 text-[var(--text-secondary)] shadow-[var(--shadow-soft)]">
              Fix the missing runtime configuration above, restart the local dev server, then reload
              this page. The setup form is intentionally hidden while configuration is incomplete.
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
