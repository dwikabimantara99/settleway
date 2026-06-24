'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/db/supabase-client';

export function AuthForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    if (!supabase) {
      setError('Authentication is not configured. Running in demo mode - use the role switcher instead.');
      setLoading(false);
      return;
    }

    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });

    if (loginError) {
      setError(loginError.message);
      setLoading(false);
      return;
    }

    router.push('/marketplace');
    router.refresh();
  };

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="aurora-feature-surface relative overflow-hidden">
        <div className="px-8 py-10">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--green-700)] text-white shadow-[0_16px_34px_rgb(23_102_59_/_0.22)]">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <h1 className="mt-5 text-2xl font-semibold tracking-tight text-[var(--navy-900)]">
              Welcome to Settleway
            </h1>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Sign in to access your protected trade workspace.
            </p>
          </div>

          {error ? (
            <div className="mb-5 flex items-start gap-3 rounded-2xl border border-[var(--danger-600)]/20 bg-[var(--danger-50)] p-4 text-sm text-[var(--danger-600)]">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-[var(--navy-900)]" htmlFor="auth-email">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="h-12 w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] pl-11 pr-4 text-sm text-[var(--text-primary)] outline-none transition-all placeholder:text-[var(--text-muted)] focus:border-[var(--green-600)] focus:bg-white focus:ring-2 focus:ring-[var(--green-100)]"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-[var(--navy-900)]" htmlFor="auth-password">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Your password"
                  className="h-12 w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] pl-11 pr-12 text-sm text-[var(--text-primary)] outline-none transition-all placeholder:text-[var(--text-muted)] focus:border-[var(--green-600)] focus:bg-white focus:ring-2 focus:ring-[var(--green-100)]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] transition-colors hover:text-[var(--navy-900)]"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative mt-2 flex h-13 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-[var(--green-700)] px-6 text-base font-semibold text-white shadow-[0_16px_34px_rgb(23_102_59_/_0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--green-800)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                  </svg>
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          <div className="relative my-7">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--border-subtle)]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 font-medium text-[var(--text-muted)]">or</span>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--green-100)] bg-[var(--green-50)] p-5 text-center">
            <p className="text-sm font-semibold text-[var(--green-800)]">Running the demo?</p>
            <p className="mt-1 text-xs leading-5 text-[var(--green-700)]">
              Use the role switcher in the bottom-right corner instead of logging in.
            </p>
            <Link
              href="/marketplace"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-[var(--green-700)] underline-offset-2 hover:underline"
            >
              Go to Marketplace
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-[var(--text-muted)]">
        Protected by Settleway escrow infrastructure.{' '}
        <span className="text-[var(--green-700)]">Powered by Stellar Testnet proof rails.</span>
      </p>
    </div>
  );
}
