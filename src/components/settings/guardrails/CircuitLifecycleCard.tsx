'use client';

import { ShieldAlert } from 'lucide-react';
import type { GuardrailValues } from './guardrailsConfig';
import SettingsCard from '../shared/SettingsCard';

interface Props {
  values: GuardrailValues;
  disabled: boolean;
  onChange: (key: keyof GuardrailValues, value: number) => void;
}

export default function CircuitLifecycleCard({
  values,
  disabled,
  onChange,
}: Props) {
  return (
    <SettingsCard className="space-y-4">
      <div className="flex items-start gap-2.5">
        <ShieldAlert className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="text-sm font-bold text-slate-100">
            Circuit Breaker &amp; Chromium Lifecycle
          </h3>
          <p className="text-xs text-gunmetal-muted mt-0.5">
            Configure automatic cooldown pauses when Google triggers anti-bot defenses and periodic browser context recycling to keep memory and disk cache lean.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
        <div className="p-3.5 rounded-lg bg-gunmetal-card/70 border border-gunmetal-border flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label
                htmlFor="guardrail-cooldown-minutes"
                className="text-xs font-semibold uppercase tracking-wider text-slate-300"
              >
                Circuit Breaker Cooldown (min)
              </label>
              <span className="text-[11px] font-mono text-gunmetal-muted">
                Default: 60 min
              </span>
            </div>
            <input
              id="guardrail-cooldown-minutes"
              type="number"
              min={1}
              max={1440}
              required
              disabled={disabled}
              value={values.cooldownMinutes}
              onChange={(e) =>
                onChange('cooldownMinutes', Number(e.target.value))
              }
              className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 rounded-md bg-gunmetal-canvas border border-gunmetal-border text-slate-100 text-sm font-mono focus:outline-none focus:border-slate-500 disabled:opacity-50"
            />
          </div>
          <p className="text-[11px] text-gunmetal-muted leading-relaxed">
            Duration (in minutes) the scraper automatically pauses all traffic if Google returns HTTP <code className="text-slate-300">429</code>/<code className="text-slate-300">403</code>, a <code className="text-slate-300">/sorry/index</code> block, or an unsolvable reCAPTCHA. Can be reset manually from the Dashboard. Allowed range: <span className="font-mono text-slate-300">1–1,440 min</span>.
          </p>
        </div>

        <div className="p-3.5 rounded-lg bg-gunmetal-card/70 border border-gunmetal-border flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label
                htmlFor="guardrail-browser-recycle"
                className="text-xs font-semibold uppercase tracking-wider text-slate-300"
              >
                Browser Recycle Threshold (scrapes)
              </label>
              <span className="text-[11px] font-mono text-gunmetal-muted">
                Default: 100 scrapes
              </span>
            </div>
            <input
              id="guardrail-browser-recycle"
              type="number"
              min={10}
              max={1000}
              required
              disabled={disabled}
              value={values.browserRecycleScrapes}
              onChange={(e) =>
                onChange('browserRecycleScrapes', Number(e.target.value))
              }
              className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 rounded-md bg-gunmetal-canvas border border-gunmetal-border text-slate-100 text-sm font-mono focus:outline-none focus:border-slate-500 disabled:opacity-50"
            />
          </div>
          <p className="text-[11px] text-gunmetal-muted leading-relaxed">
            Automatically closes and relaunches the persistent headless Chromium context after this many scrapes while pruning HTTP disk caches over 250 MB and preserving Google consent cookies. Allowed range: <span className="font-mono text-slate-300">10–1,000 scrapes</span>.
          </p>
        </div>
      </div>
    </SettingsCard>
  );
}