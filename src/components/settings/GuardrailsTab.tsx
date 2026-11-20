'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Loader2, RotateCcw, Save } from 'lucide-react';
import {
  DEFAULT_GUARDRAILS,
  type GuardrailValues,
} from './guardrails/guardrailsConfig';
import type { PublicScraperSettings } from '@/types';
import CircuitLifecycleCard from './guardrails/CircuitLifecycleCard';
import PacingDelaysCard from './guardrails/PacingDelaysCard';
import RateLimitsCard from './guardrails/RateLimitsCard';
import SettingsCard from './shared/SettingsCard';
import SettingsIntroBanner from './shared/SettingsIntroBanner';

interface Props {
  settings: PublicScraperSettings;
  onSettingsUpdated: (settings: PublicScraperSettings) => void;
  onNotify: (message: string, type?: 'success' | 'error') => void;
}

function extractGuardrails(settings: PublicScraperSettings): GuardrailValues {
  return {
    minJitterMs: settings.minJitterMs,
    maxJitterMs: settings.maxJitterMs,
    settleDelayMs: settings.settleDelayMs,
    maxRequestsPerHour: settings.maxRequestsPerHour,
    maxRequestsPerDay: settings.maxRequestsPerDay,
    cooldownMinutes: settings.cooldownMinutes,
    browserRecycleScrapes: settings.browserRecycleScrapes,
  };
}

export default function GuardrailsTab({
  settings,
  onSettingsUpdated,
  onNotify,
}: Props) {
  const [values, setValues] = useState<GuardrailValues>(() =>
    extractGuardrails(settings)
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValues(extractGuardrails(settings));
  }, [settings]);

  const isAlreadyDefault = (
    Object.keys(DEFAULT_GUARDRAILS) as Array<keyof GuardrailValues>
  ).every((key) => Number(values[key]) === DEFAULT_GUARDRAILS[key]);

  function handleFieldChange(key: keyof GuardrailValues, nextValue: number) {
    setValues((prev) => ({ ...prev, [key]: nextValue }));
  }

  function handleRestoreDefaults() {
    setValues({ ...DEFAULT_GUARDRAILS });
    onNotify(
      'Default guardrail values loaded — click Save Guardrails to apply',
      'success'
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          minJitterMs: Number(values.minJitterMs),
          maxJitterMs: Number(values.maxJitterMs),
          settleDelayMs: Number(values.settleDelayMs),
          maxRequestsPerHour: Number(values.maxRequestsPerHour),
          maxRequestsPerDay: Number(values.maxRequestsPerDay),
          cooldownMinutes: Number(values.cooldownMinutes),
          browserRecycleScrapes: Number(values.browserRecycleScrapes),
        }),
      });

      if (res.status === 401) {
        window.location.assign('/login?next=/settings/guardrails');
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        onNotify(data.error ?? 'Failed to save guardrail limits.', 'error');
        return;
      }

      onSettingsUpdated(data.settings);
      onNotify('Scraper guardrails saved', 'success');
    } catch {
      onNotify('Network error saving guardrails.', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 pt-2">
      <SettingsIntroBanner
        title="Anti-Bot Guardrails & Circuit Breaker Thresholds"
        description="Configure randomized human-like jitter, rolling API request quotas, automatic CAPTCHA/429 cooldown durations, and periodic Chromium profile recycling."
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <PacingDelaysCard
          values={values}
          disabled={saving}
          onChange={handleFieldChange}
        />

        <RateLimitsCard
          values={values}
          disabled={saving}
          onChange={handleFieldChange}
        />

        <CircuitLifecycleCard
          values={values}
          disabled={saving}
          onChange={handleFieldChange}
        />

        <SettingsCard className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs text-gunmetal-muted">
            Changes take effect immediately on the next queued scrape request.
          </p>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5">
            <button
              type="button"
              onClick={handleRestoreDefaults}
              disabled={saving || isAlreadyDefault}
              className="min-h-[44px] sm:min-h-[38px] px-4 py-2 rounded-lg text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 bg-gunmetal-canvas hover:bg-gunmetal-border border border-gunmetal-border text-slate-300 hover:text-white font-semibold transition-colors disabled:opacity-45 disabled:pointer-events-none cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Restore Defaults</span>
            </button>

            <button
              type="submit"
              disabled={saving}
              className="min-h-[44px] sm:min-h-[38px] px-4 py-2 rounded-lg text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 bg-slate-800/75 hover:bg-slate-700/85 border border-slate-500/80 hover:border-slate-400 text-slate-100 hover:text-white font-semibold shadow-sm transition-colors disabled:opacity-45 disabled:pointer-events-none cursor-pointer"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              <span>{saving ? 'Saving...' : 'Save Guardrails'}</span>
            </button>
          </div>
        </SettingsCard>
      </form>
    </div>
  );
}