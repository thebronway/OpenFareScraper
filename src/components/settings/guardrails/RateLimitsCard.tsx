'use client';

import { Gauge } from 'lucide-react';
import type { GuardrailValues } from './guardrailsConfig';
import SettingsCard from '../shared/SettingsCard';

interface Props {
  values: GuardrailValues;
  disabled: boolean;
  onChange: (key: keyof GuardrailValues, value: number) => void;
}

export default function RateLimitsCard({
  values,
  disabled,
  onChange,
}: Props) {
  return (
    <SettingsCard className="space-y-4">
      <div className="flex items-start gap-2.5">
        <Gauge className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="text-sm font-bold text-slate-100">
            Rolling Request Rate Caps
          </h3>
          <p className="text-xs text-gunmetal-muted mt-0.5">
            Enforce hard sliding-window scrape ceilings across all API keys and live test scrapes to protect your egress IP from upstream throttling.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
        <div className="p-3.5 rounded-lg bg-gunmetal-card/70 border border-gunmetal-border flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label
                htmlFor="guardrail-hourly-cap"
                className="text-xs font-semibold uppercase tracking-wider text-slate-300"
              >
                Hourly Request Cap
              </label>
              <span className="text-[11px] font-mono text-gunmetal-muted">
                Default: 20 / hr
              </span>
            </div>
            <input
              id="guardrail-hourly-cap"
              type="number"
              min={1}
              max={500}
              required
              disabled={disabled}
              value={values.maxRequestsPerHour}
              onChange={(e) =>
                onChange('maxRequestsPerHour', Number(e.target.value))
              }
              className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 rounded-md bg-gunmetal-canvas border border-gunmetal-border text-slate-100 text-sm font-mono focus:outline-none focus:border-slate-500 disabled:opacity-50"
            />
          </div>
          <p className="text-[11px] text-gunmetal-muted leading-relaxed">
            Maximum completed scrapes allowed in any rolling 60-minute window. Additional requests immediately return HTTP <code className="text-slate-300">429</code> without launching Chromium. Allowed range: <span className="font-mono text-slate-300">1–500</span>.
          </p>
        </div>

        <div className="p-3.5 rounded-lg bg-gunmetal-card/70 border border-gunmetal-border flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label
                htmlFor="guardrail-daily-cap"
                className="text-xs font-semibold uppercase tracking-wider text-slate-300"
              >
                Daily Request Cap
              </label>
              <span className="text-[11px] font-mono text-gunmetal-muted">
                Default: 150 / day
              </span>
            </div>
            <input
              id="guardrail-daily-cap"
              type="number"
              min={1}
              max={5000}
              required
              disabled={disabled}
              value={values.maxRequestsPerDay}
              onChange={(e) =>
                onChange('maxRequestsPerDay', Number(e.target.value))
              }
              className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 rounded-md bg-gunmetal-canvas border border-gunmetal-border text-slate-100 text-sm font-mono focus:outline-none focus:border-slate-500 disabled:opacity-50"
            />
          </div>
          <p className="text-[11px] text-gunmetal-muted leading-relaxed">
            Maximum completed scrapes allowed in any rolling 24-hour window. Must be greater than or equal to the Hourly Request Cap. Allowed range: <span className="font-mono text-slate-300">1–5,000</span>.
          </p>
        </div>
      </div>
    </SettingsCard>
  );
}