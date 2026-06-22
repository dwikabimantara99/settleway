'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/db/supabase-client';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';

export function AuthForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!supabase) {
      setError('Authentication is not configured. Running in demo mode — use the role switcher instead.');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/marketplace');
      router.refresh();
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Card */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_32px_80px_rgba(15,23,42,0.12)]">
        {/* Top gradient accent */}
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600" />

        <div className="px-8 py-10">
          {/* Logo & headline */}
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-[0_8px_24px_rgba(16,185,129,0.30)]">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-slate-950">
              Welcome to Settleway
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Sign in to access your protected trade workspace.
            </p>
          </div>

          {/* Error alert */}
          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700" htmlFor="auth-email">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700" htmlFor="auth-password">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-12 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="group relative mt-2 flex h-13 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-emerald-600 px-6 text-base font-semibold text-white shadow-[0_8px_24px_rgba(16,185,129,0.28)] transition-all duration-200 hover:bg-emerald-700 hover:shadow-[0_12px_32px_rgba(16,185,129,0.36)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                  </svg>
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-7">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-slate-400 font-medium">or</span>
            </div>
          </div>

          {/* Demo mode shortcut */}
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-center">
            <p className="text-sm font-semibold text-emerald-800">Running the demo?</p>
            <p className="mt-1 text-xs text-emerald-600">
              Use the role switcher in the bottom-right corner instead of logging in.
            </p>
            <Link
              href="/marketplace"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 underline-offset-2 hover:underline"
            >
              Go to Marketplace
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Footer note */}
      <p className="mt-6 text-center text-xs text-slate-400">
        Protected by Settleway escrow infrastructure.{' '}
        <span className="text-emerald-600">Powered by Stellar.</span>
      </p>
    </div>
  );
}
