'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, Eye, EyeOff, Loader2, Lock, ShieldCheck } from 'lucide-react';
import { sanitizeRedirectPath } from '@/utils/redirect';

interface LoginFormProps {
  hasAdminPassword: boolean;
}

export default function LoginForm({ hasAdminPassword }: LoginFormProps) {
  const searchParams = useSearchParams();
  const safeNext = sanitizeRedirectPath(searchParams.get('next'), '/dashboard');
  const isSetup = !hasAdminPassword;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting || cooldownSeconds > 0) return;

    setError('');
    setSubmitting(true);

    try {
      const payload = isSetup
        ? { action: 'setup', password, confirmPassword }
        : { action: 'login', password };

      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        window.location.assign(safeNext);
        return;
      }

      if (res.status === 429) {
        const retryHeader = Number(res.headers.get('Retry-After'));
        if (Number.isFinite(retryHeader) && retryHeader > 0) {
          setCooldownSeconds(retryHeader);
        }
      }

      setError(data.error || 'Authentication failed. Please check your credentials.');
    } catch {
      setError('Unable to reach OpenFareScraper server. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md bg-gunmetal-card border border-gunmetal-border rounded-xl shadow-2xl p-6 sm:p-8">
        <div className="flex flex-col items-center text-center mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/OpenFareScraper-icon-sm.png"
            alt="OpenFareScraper Logo"
            className="h-[46px] w-auto object-contain rounded mb-3"
          />
          <h1 className="text-xl font-bold text-slate-100 tracking-tight">
            {isSetup ? 'Set Up OpenFareScraper' : 'Sign in to OpenFareScraper'}
          </h1>
          <p className="text-xs text-gunmetal-muted mt-1 leading-relaxed">
            {isSetup
              ? 'Create an administrator password to secure your scraper dashboard and API keys.'
              : 'Enter your administrator password to manage engine guardrails and API keys.'}
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 p-3 rounded-md bg-rose-950/45 border border-rose-700/70 text-rose-200 text-xs flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <span>
              {error}
              {cooldownSeconds > 0 ? ` (${cooldownSeconds}s remaining)` : ''}
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="ofs-admin-password"
              className="block text-xs font-semibold text-slate-300 mb-1.5"
            >
              {isSetup ? 'New Admin Password (min 8 characters)' : 'Admin Password'}
            </label>
            <div className="relative">
              <input
                id="ofs-admin-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={isSetup ? 'new-password' : 'current-password'}
                required
                minLength={isSetup ? 8 : 1}
                disabled={submitting || cooldownSeconds > 0}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full min-h-[44px] pl-3 pr-10 py-2 rounded-md bg-gunmetal-canvas border border-gunmetal-border text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-slate-400 transition-colors disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-gunmetal-muted hover:text-slate-200 transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {isSetup && (
            <div>
              <label
                htmlFor="ofs-confirm-password"
                className="block text-xs font-semibold text-slate-300 mb-1.5"
              >
                Confirm Admin Password
              </label>
              <input
                id="ofs-confirm-password"
                name="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                minLength={8}
                disabled={submitting}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full min-h-[44px] px-3 py-2 rounded-md bg-gunmetal-canvas border border-gunmetal-border text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-slate-400 transition-colors disabled:opacity-50"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={
              submitting ||
              cooldownSeconds > 0 ||
              !password ||
              (isSetup && !confirmPassword)
            }
            className="w-full min-h-[44px] px-4 py-2.5 rounded-lg bg-slate-800/75 hover:bg-slate-700/85 border border-slate-500/80 hover:border-slate-400 text-slate-100 hover:text-white font-semibold text-sm inline-flex items-center justify-center gap-2 shadow-sm transition-colors disabled:opacity-45 disabled:pointer-events-none cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isSetup ? 'Saving Password...' : 'Signing In...'}</span>
              </>
            ) : cooldownSeconds > 0 ? (
              <>
                <Lock className="w-4 h-4 text-amber-400" />
                <span>Locked ({cooldownSeconds}s)</span>
              </>
            ) : isSetup ? (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Save Password &amp; Continue</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}