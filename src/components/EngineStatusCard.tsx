'use client';

import { useState } from 'react';
import { Activity, AlertTriangle, Pause, PauseCircle, Play, RotateCcw } from 'lucide-react';
import type { PublicScraperSettings, UsageQuotaStats } from '@/types';

interface EngineStatusCardProps {
  settings: PublicScraperSettings;
  usage: UsageQuotaStats;
  browserStats?: {
    active: boolean;
    scrapesSinceLaunch: number;
  };
  onSettingsUpdated: (settings: PublicScraperSettings) => void;
}

export function EngineStatusCard({
  settings,
  usage,
  browserStats,
  onSettingsUpdated,
}: EngineStatusCardProps) {
  const [resetting, setResetting] = useState(false);
  const [togglingPause, setTogglingPause] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hourlyPct = Math.min(
    100,
    Math.round((usage.hourlyUsed / Math.max(1, settings.maxRequestsPerHour)) * 100)
  );
  const dailyPct = Math.min(
    100,
    Math.round((usage.dailyUsed / Math.max(1, settings.maxRequestsPerDay)) * 100)
  );
  const isRateLimited =
    !settings.globalPaused &&
    !settings.circuitBreakerActive &&
    (usage.hourlyUsed >= settings.maxRequestsPerHour ||
      usage.dailyUsed >= settings.maxRequestsPerDay);

  const engineStatusLabel = settings.globalPaused
    ? 'Paused'
    : settings.circuitBreakerActive
      ? 'Cooldown'
      : isRateLimited
        ? 'Rate Limited'
        : 'Ready';

  const engineCardBorder = settings.globalPaused
    ? 'border-amber-500/40'
    : settings.circuitBreakerActive
      ? 'border-amber-500/40'
      : isRateLimited
        ? 'border-rose-500/40'
        : 'border-emerald-500/30';

  const engineStatusDotColor = settings.globalPaused
    ? 'bg-amber-400'
    : settings.circuitBreakerActive
      ? 'bg-amber-400'
      : isRateLimited
        ? 'bg-rose-400'
        : 'bg-emerald-400';

  const engineStatusTextColor = settings.globalPaused
    ? 'text-amber-300'
    : settings.circuitBreakerActive
      ? 'text-amber-300'
      : isRateLimited
        ? 'text-rose-300'
        : 'text-emerald-300';

  const hourlyBarColor = settings.globalPaused
    ? 'bg-amber-600'
    : settings.circuitBreakerActive
      ? 'bg-amber-600'
      : hourlyPct >= 90
        ? 'bg-rose-500'
        : hourlyPct >= 75
          ? 'bg-amber-400'
          : 'bg-sky-500';

  const hourlyUsedColor = settings.globalPaused
    ? 'text-amber-300'
    : settings.circuitBreakerActive
      ? 'text-slate-200'
      : hourlyPct >= 90
        ? 'text-rose-400'
        : hourlyPct >= 75
          ? 'text-amber-300'
          : 'text-slate-200';

  const dailyBarColor = settings.globalPaused
    ? 'bg-amber-600'
    : settings.circuitBreakerActive
      ? 'bg-amber-600'
      : dailyPct >= 90
        ? 'bg-rose-500'
        : dailyPct >= 75
          ? 'bg-amber-400'
          : 'bg-sky-500';

  const dailyUsedColor = settings.globalPaused
    ? 'text-amber-300'
    : settings.circuitBreakerActive
      ? 'text-slate-200'
      : dailyPct >= 90
        ? 'text-rose-400'
        : dailyPct >= 75
          ? 'text-amber-300'
          : 'text-slate-200';

  async function handleToggleGlobalPause() {
    setTogglingPause(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paused: !settings.globalPaused }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to update global pause state.');
        return;
      }
      onSettingsUpdated(data.settings);
    } catch {
      setError('Network error updating global pause state.');
    } finally {
      setTogglingPause(false);
    }
  }

  async function handleResetCooldown() {
    setResetting(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/circuit-breaker', {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to reset cooldown.');
        return;
      }
      onSettingsUpdated(data.settings);
    } catch {
      setError('Network error resetting cooldown.');
    } finally {
      setResetting(false);
    }
  }

  return (
    <section
      className={`bg-gunmetal-card border rounded-lg shadow-sm p-4 sm:p-5 transition-colors ${
        settings.globalPaused
          ? 'border-amber-500/40'
          : 'border-gunmetal-border'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <Activity
            className={`h-4 w-4 ${
              settings.globalPaused ? 'text-amber-400' : 'text-slate-300'
            }`}
          />
          <h3 className="text-sm font-bold text-slate-100">
            Engine Status &amp; Circuit Breaker
          </h3>
        </div>

        <button
          type="button"
          onClick={handleToggleGlobalPause}
          disabled={togglingPause}
          className={`min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-md text-xs inline-flex items-center justify-center gap-1.5 font-semibold border transition-colors disabled:opacity-45 disabled:pointer-events-none cursor-pointer ${
            settings.globalPaused
              ? 'bg-emerald-950/60 hover:bg-emerald-900/75 border-emerald-700/80 text-emerald-200 hover:text-white'
              : 'bg-gunmetal-canvas hover:bg-gunmetal-border border-gunmetal-border text-slate-300 hover:text-white'
          }`}
        >
          {settings.globalPaused ? (
            <>
              <Play className="h-3.5 w-3.5 text-emerald-400" />
              {togglingPause ? 'Resuming...' : 'Resume Scraping'}
            </>
          ) : (
            <>
              <Pause className="h-3.5 w-3.5" />
              {togglingPause ? 'Pausing...' : 'Pause Scraper'}
            </>
          )}
        </button>
      </div>

      {settings.globalPaused && (
        <div className="mb-4 p-3.5 rounded-lg bg-amber-950/35 border border-amber-700/70 flex items-start gap-2.5">
          <PauseCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-semibold text-amber-200">
              Global Pause Active — All Scraping Halted
            </p>
            <p className="text-amber-200/85 mt-0.5 leading-relaxed">
              Incoming API and test scrapes are paused (HTTP 503) without
              consuming rolling quota.
              {settings.globalPausedAt && (
                <>
                  {' '}
                  Paused since{' '}
                  <span className="underline">
                    {new Date(settings.globalPausedAt).toLocaleString()}
                  </span>
                  .
                </>
              )}
            </p>
          </div>
        </div>
      )}

      {settings.circuitBreakerActive && (
        <div className="mb-4 p-3.5 rounded-lg bg-amber-950/35 border border-amber-700/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-semibold text-amber-200">
                Circuit Breaker Active — Scraping Paused
              </p>
              <p className="text-amber-200/85 mt-0.5 leading-relaxed">
                {settings.circuitBreakerReason || 'Upstream rate limit detected.'}
                {settings.circuitBreakerUntil && (
                  <>
                    {' '}
                    Resumes at{' '}
                    <span className="underline">
                      {new Date(settings.circuitBreakerUntil).toLocaleString()}
                    </span>
                    .
                  </>
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetCooldown}
            disabled={resetting}
            className="min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-md text-xs inline-flex items-center justify-center gap-1.5 font-semibold bg-amber-950/60 hover:bg-amber-900/75 border border-amber-700/80 text-amber-200 hover:text-white disabled:opacity-45 disabled:pointer-events-none shrink-0 transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5 text-amber-400" />
            {resetting ? 'Resetting...' : 'Reset Cooldown'}
          </button>
        </div>
      )}

      {error && (
        <div className="mb-4 text-xs text-rose-200 bg-rose-950/45 border border-rose-700/70 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          className={`p-3.5 rounded-lg bg-gunmetal-canvas border transition-colors ${engineCardBorder}`}
        >
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-gunmetal-muted">Chromium Engine</span>
            <span
              title="Scrapes executed in current Chromium session before automatic recycle"
              className="font-mono text-slate-300"
            >
              {browserStats?.scrapesSinceLaunch ?? 0} /{' '}
              {settings.browserRecycleScrapes} scrapes
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between gap-2">
            <span
              className={`inline-flex items-center gap-2 text-sm font-semibold ${engineStatusTextColor}`}
            >
              <span
                className={`h-2 w-2 rounded-full shrink-0 ${engineStatusDotColor}`}
              />
              {engineStatusLabel}
            </span>
            {settings.hasProxy && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-sky-500/10 border border-sky-500/30 text-sky-300">
                Proxy On
              </span>
            )}
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-gunmetal-canvas border border-gunmetal-border">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gunmetal-muted">Rolling 1-Hour Quota</span>
            <span className="text-slate-200 font-medium">
              <span className={hourlyUsedColor}>{usage.hourlyUsed}</span> /{' '}
              {settings.maxRequestsPerHour}
            </span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-gunmetal-card border border-gunmetal-border overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${hourlyBarColor}`}
              style={{ width: `${hourlyPct}%` }}
            />
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-gunmetal-canvas border border-gunmetal-border">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gunmetal-muted">Rolling 24-Hour Quota</span>
            <span className="text-slate-200 font-medium">
              <span className={dailyUsedColor}>{usage.dailyUsed}</span> /{' '}
              {settings.maxRequestsPerDay}
            </span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-gunmetal-card border border-gunmetal-border overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${dailyBarColor}`}
              style={{ width: `${dailyPct}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}