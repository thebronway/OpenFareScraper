'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AlertOctagon, LayoutDashboard, LogOut, PauseCircle, Settings, ShieldAlert, ShieldCheck } from 'lucide-react';
import type { PublicScraperSettings, UsageQuotaStats } from '@/types';

export const SETTINGS_UPDATED_EVENT = 'ofs:settings-updated';

export function Navbar() {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  const [authenticated, setAuthenticated] = useState(false);
  const [settings, setSettings] = useState<PublicScraperSettings | null>(null);
  const [usage, setUsage] = useState<UsageQuotaStats | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const fetchSessionStatus = useCallback(async () => {
    if (isLoginPage) return;
    try {
      const res = await fetch('/api/admin/auth', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setAuthenticated(Boolean(data.authenticated));
      setSettings(data.settings ?? null);
      setUsage(data.usage ?? null);
    } catch {
      // Ignore transient network errors
    }
  }, [isLoginPage]);

  useEffect(() => {
    if (isLoginPage) return;
    void fetchSessionStatus();

    const handleSettingsUpdated = () => {
      void fetchSessionStatus();
    };

    window.addEventListener(SETTINGS_UPDATED_EVENT, handleSettingsUpdated);
    window.addEventListener('focus', handleSettingsUpdated);
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void fetchSessionStatus();
      }
    }, 30000);

    return () => {
      window.removeEventListener(SETTINGS_UPDATED_EVENT, handleSettingsUpdated);
      window.removeEventListener('focus', handleSettingsUpdated);
      clearInterval(interval);
    };
  }, [isLoginPage, pathname, fetchSessionStatus]);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
    } catch {
      // Proceed to login even on transient error
    } finally {
      window.location.assign('/login');
    }
  };

  if (isLoginPage) {
    return null;
  }

  const globalPaused = Boolean(settings?.globalPaused);
  const circuitBreakerActive = Boolean(settings?.circuitBreakerActive);
  const rateLimited = Boolean(
    settings &&
      usage &&
      (usage.hourlyUsed >= settings.maxRequestsPerHour ||
        usage.dailyUsed >= settings.maxRequestsPerDay)
  );

  return (
    <nav className="bg-gunmetal-nav shadow-sm border-b border-gunmetal-border sticky top-0 z-30 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        <Link href="/dashboard" className="flex items-center space-x-3 text-white min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/OpenFareScraper-icon-sm.png"
            alt="OpenFareScraper Logo"
            className="h-[42px] w-auto object-contain rounded flex-shrink-0"
          />
          <span className="font-bold text-xl tracking-tight truncate">
            OpenFareScraper
          </span>
        </Link>

        {authenticated && (
          <div className="flex items-center space-x-2 sm:space-x-3">
            {settings && (
              globalPaused ? (
                <span
                  title="Scraper is globally paused"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded border bg-amber-950/60 border-amber-800/60 text-amber-300"
                >
                  <PauseCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden md:inline">Paused</span>
                </span>
              ) : circuitBreakerActive ? (
                <span
                  title="Circuit breaker cooldown active"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded border bg-amber-950/60 border-amber-800/60 text-amber-300"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden md:inline">Cooldown</span>
                </span>
              ) : rateLimited ? (
                <span
                  title="Rolling hourly or daily quota reached"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded border bg-rose-950/60 border-rose-800/60 text-rose-300"
                >
                  <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                  <span className="hidden md:inline">Rate Limited</span>
                </span>
              ) : (
                <span
                  title="Scraper engine ready"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded border bg-emerald-950/60 border-emerald-800/60 text-emerald-300"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden md:inline">Ready</span>
                </span>
              )
            )}

            <Link
              href="/dashboard"
              title="Dashboard"
              className={`min-h-[44px] min-w-[44px] sm:min-h-[38px] sm:min-w-0 flex items-center justify-center space-x-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                pathname.startsWith('/dashboard')
                  ? 'bg-gunmetal-border border border-slate-500 text-slate-100 shadow-sm'
                  : 'text-gunmetal-muted hover:bg-gunmetal-card hover:text-slate-200'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>

            <Link
              href="/settings/general"
              title="Settings"
              className={`min-h-[44px] min-w-[44px] sm:min-h-[38px] sm:min-w-0 flex items-center justify-center space-x-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                pathname.startsWith('/settings')
                  ? 'bg-gunmetal-border border border-slate-500 text-slate-100 shadow-sm'
                  : 'text-gunmetal-muted hover:bg-gunmetal-card hover:text-slate-200'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </Link>

            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              title="Sign Out"
              className="min-h-[44px] min-w-[44px] sm:min-h-[38px] sm:min-w-0 flex items-center justify-center space-x-1.5 px-3 py-2 rounded-md text-sm font-medium text-gunmetal-muted hover:text-rose-200 hover:bg-rose-950/40 border border-transparent hover:border-rose-800/60 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">
                {signingOut ? 'Signing Out...' : 'Sign Out'}
              </span>
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;