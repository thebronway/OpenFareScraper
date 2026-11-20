'use client';

import { Info, Timer } from 'lucide-react';
import type { GuardrailValues } from './guardrailsConfig';
import SettingsCard from '../shared/SettingsCard';

interface Props {
  values: GuardrailValues;
  disabled: boolean;
  onChange: (key: keyof GuardrailValues, value: number) => void;
}

export default function PacingDelaysCard({
  values,
  disabled,
  onChange,
}: Props) {
  return (
    <SettingsCard className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <Timer className="w-4 h-4 text-sky-400 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-slate-100">
              Human Pacing &amp; Navigation Delays
            </h3>
            <p className="text-xs text-gunmetal-muted mt-0.5">
              Control randomized pre-navigation pauses and post-render settle waits so automated Chromium queries mimic natural browsing cadence.
            </p>
          </div>
        </div>

        <span className="inline-flex items-center px-2.5 py-0.5 rounded border text-xs font-mono font-semibold bg-sky-950/60 text-sky-300 border-sky-800/60">
          Serial FIFO Queue · Concurrency = 1
        </span>
      </div>

      <div className="p-3 rounded-lg bg-gunmetal-card/80 border border-gunmetal-border text-xs text-gunmetal-muted flex items-start gap-2.5">
        <Info className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          All incoming API and live test scrapes execute sequentially in arrival order (<code className="text-slate-300">concurrency = 1</code>). Before each navigation, Chromium sleeps for a random duration between <strong className="text-slate-200">Min Jitter</strong> and <strong className="text-slate-200">Max Jitter</strong> to prevent fixed-interval bot fingerprinting.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-1">
        <div className="p-3.5 rounded-lg bg-gunmetal-card/70 border border-gunmetal-border flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label
                htmlFor="guardrail-min-jitter"
                className="text-xs font-semibold uppercase tracking-wider text-slate-300"
              >
                Min Jitter (ms)
              </label>
              <span className="text-[11px] font-mono text-gunmetal-muted">
                Default: 4000ms
              </span>
            </div>
            <input
              id="guardrail-min-jitter"
              type="number"
              min={500}
              max={60000}
              required
              disabled={disabled}
              value={values.minJitterMs}
              onChange={(e) => onChange('minJitterMs', Number(e.target.value))}
              className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 rounded-md bg-gunmetal-canvas border border-gunmetal-border text-slate-100 text-sm font-mono focus:outline-none focus:border-slate-500 disabled:opacity-50"
            />
          </div>
          <p className="text-[11px] text-gunmetal-muted leading-relaxed">
            Minimum randomized delay (in milliseconds) before navigating to Google Flights. Allowed range: <span className="font-mono text-slate-300">500–60,000 ms</span>.
          </p>
        </div>

        <div className="p-3.5 rounded-lg bg-gunmetal-card/70 border border-gunmetal-border flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label
                htmlFor="guardrail-max-jitter"
                className="text-xs font-semibold uppercase tracking-wider text-slate-300"
              >
                Max Jitter (ms)
              </label>
              <span className="text-[11px] font-mono text-gunmetal-muted">
                Default: 9000ms
              </span>
            </div>
            <input
              id="guardrail-max-jitter"
              type="number"
              min={500}
              max={120000}
              required
              disabled={disabled}
              value={values.maxJitterMs}
              onChange={(e) => onChange('maxJitterMs', Number(e.target.value))}
              className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 rounded-md bg-gunmetal-canvas border border-gunmetal-border text-slate-100 text-sm font-mono focus:outline-none focus:border-slate-500 disabled:opacity-50"
            />
          </div>
          <p className="text-[11px] text-gunmetal-muted leading-relaxed">
            Upper bound for the randomized pre-navigation pause. Must be greater than or equal to Min Jitter. Allowed range: <span className="font-mono text-slate-300">500–120,000 ms</span>.
          </p>
        </div>

        <div className="p-3.5 rounded-lg bg-gunmetal-card/70 border border-gunmetal-border flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label
                htmlFor="guardrail-settle-delay"
                className="text-xs font-semibold uppercase tracking-wider text-slate-300"
              >
                Settle Delay (ms)
              </label>
              <span className="text-[11px] font-mono text-gunmetal-muted">
                Default: 2500ms
              </span>
            </div>
            <input
              id="guardrail-settle-delay"
              type="number"
              min={500}
              max={30000}
              required
              disabled={disabled}
              value={values.settleDelayMs}
              onChange={(e) => onChange('settleDelayMs', Number(e.target.value))}
              className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 rounded-md bg-gunmetal-canvas border border-gunmetal-border text-slate-100 text-sm font-mono focus:outline-none focus:border-slate-500 disabled:opacity-50"
            />
          </div>
          <p className="text-[11px] text-gunmetal-muted leading-relaxed">
            Wait window after initial page load so dynamic flight fares and expanded multi-stop legs finish rendering. Allowed range: <span className="font-mono text-slate-300">500–30,000 ms</span>.
          </p>
        </div>
      </div>
    </SettingsCard>
  );
}