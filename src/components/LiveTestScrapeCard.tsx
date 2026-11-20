'use client';

import { useState } from 'react';
import { Plane, Play } from 'lucide-react';
import type { CabinClass, FareTier, ScrapeResponse } from '@/types';

interface LiveTestScrapeCardProps {
  globalPaused: boolean;
  onScrapeCompleted: () => Promise<void>;
}

function defaultFutureDate(): string {
  const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  return future.toISOString().slice(0, 10);
}

export function LiveTestScrapeCard({
  globalPaused,
  onScrapeCompleted,
}: LiveTestScrapeCardProps) {
  const [origin, setOrigin] = useState('DCA');
  const [destination, setDestination] = useState('LAX');
  const [departureDate, setDepartureDate] = useState(defaultFutureDate);
  const [cabinClass, setCabinClass] = useState<CabinClass>('economy');
  const [fareTier, setFareTier] = useState<FareTier>('Standard');
  const [currency, setCurrency] = useState('USD');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ScrapeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRunTest(e: React.FormEvent) {
    e.preventDefault();
    setRunning(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/admin/test-scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: origin.trim().toUpperCase(),
          destination: destination.trim().toUpperCase(),
          departureDate,
          cabinClass,
          fareTier,
          currency: currency.trim().toUpperCase(),
        }),
      });

      const data = await res.json();
      if (!res.ok && !data.status) {
        setError(data.error ?? 'Test scrape failed.');
        return;
      }

      setResult(data as ScrapeResponse);
      await onScrapeCompleted();
    } catch {
      setError('Network error running test scrape.');
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="bg-gunmetal-card border border-gunmetal-border rounded-lg shadow-sm p-4 sm:p-5 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Plane className="h-4 w-4 text-slate-300" />
          <h2 className="text-sm font-bold text-slate-200">
            Live Test Scrape
          </h2>
        </div>
        <span className="text-xs text-gunmetal-muted">
          Headless Chromium Verification
        </span>
      </div>

      <form onSubmit={handleRunTest} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Origin
            </label>
            <input
              type="text"
              required
              value={origin}
              onChange={(e) => setOrigin(e.target.value.toUpperCase())}
              placeholder="DCA"
              className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 rounded-md bg-gunmetal-canvas border border-gunmetal-border text-slate-100 placeholder-zinc-500 text-sm uppercase focus:outline-none focus:border-slate-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Destination
            </label>
            <input
              type="text"
              required
              value={destination}
              onChange={(e) => setDestination(e.target.value.toUpperCase())}
              placeholder="LAX"
              className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 rounded-md bg-gunmetal-canvas border border-gunmetal-border text-slate-100 placeholder-zinc-500 text-sm uppercase focus:outline-none focus:border-slate-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Date
            </label>
            <input
              type="date"
              required
              value={departureDate}
              onChange={(e) => setDepartureDate(e.target.value)}
              className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 rounded-md bg-gunmetal-canvas border border-gunmetal-border text-slate-100 text-sm focus:outline-none focus:border-slate-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Cabin
            </label>
            <select
              value={cabinClass}
              onChange={(e) => setCabinClass(e.target.value as CabinClass)}
              className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 rounded-md bg-gunmetal-canvas border border-gunmetal-border text-slate-200 text-sm focus:outline-none focus:border-slate-500 cursor-pointer"
            >
              <option value="economy">Economy</option>
              <option value="premium_economy">Premium Econ</option>
              <option value="business">Business</option>
              <option value="first">First</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Fare Tier
            </label>
            <select
              value={fareTier}
              onChange={(e) => setFareTier(e.target.value as FareTier)}
              className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 rounded-md bg-gunmetal-canvas border border-gunmetal-border text-slate-200 text-sm focus:outline-none focus:border-slate-500 cursor-pointer"
            >
              <option value="Standard">Standard</option>
              <option value="Basic">Basic</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Currency
            </label>
            <input
              type="text"
              maxLength={3}
              required
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 rounded-md bg-gunmetal-canvas border border-gunmetal-border text-slate-100 placeholder-zinc-500 text-sm uppercase focus:outline-none focus:border-slate-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={running || globalPaused}
            className="min-h-[44px] sm:min-h-[38px] px-4 py-2 rounded-lg text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 bg-slate-800/75 hover:bg-slate-700/85 border border-slate-500/80 hover:border-slate-400 text-slate-100 hover:text-white font-semibold shadow-sm transition-colors disabled:opacity-45 disabled:pointer-events-none cursor-pointer"
          >
            <Play className="h-3.5 w-3.5" />
            {running ? 'Scraping Google Flights...' : 'Run Live Scrape'}
          </button>

          {globalPaused && (
            <span className="text-xs text-amber-300">
              Scraper is globally paused. Resume the engine above to run a live
              test scrape.
            </span>
          )}
        </div>
      </form>

      {error && (
        <div className="mt-4 text-xs text-rose-200 bg-rose-950/45 border border-rose-700/70 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-4 p-3.5 rounded-lg bg-gunmetal-canvas border border-gunmetal-border text-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-100">
                Status: {result.status}
              </span>
              {result.price !== null && (
                <span className="text-emerald-300 font-semibold">
                  Lowest: {result.currency} {result.price}
                </span>
              )}
            </div>
            <span className="text-gunmetal-muted">
              {result.itineraries.length} itineraries • {result.meta.durationMs}ms
            </span>
          </div>

          {result.errorMessage && (
            <p className="text-rose-300">{result.errorMessage}</p>
          )}

          {result.itineraries.length > 0 && (
            <div className="max-h-56 overflow-y-auto divide-y divide-gunmetal-border/70 border border-gunmetal-border rounded-lg">
              {result.itineraries.slice(0, 10).map((itin, idx) => (
                <div
                  key={`${itin.airline}-${itin.flightNumber}-${idx}`}
                  className="px-3 py-2 flex items-center justify-between gap-2"
                >
                  <div>
                    <span className="font-semibold text-slate-100">
                      {itin.airline} {itin.flightNumber}
                    </span>{' '}
                    <span className="text-gunmetal-muted">
                      ({itin.origin} → {itin.destination})
                    </span>
                    <div className="text-gunmetal-muted mt-0.5">
                      {itin.departureTime} → {itin.arrivalTime} • {itin.duration} •{' '}
                      {itin.isNonstop
                        ? 'Nonstop'
                        : `${itin.stops} stop${itin.stops > 1 ? 's' : ''}`}
                    </div>
                  </div>
                  <div className="font-semibold text-emerald-300 shrink-0">
                    {result.currency} {itin.price}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}