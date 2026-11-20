'use client';

import { useState, type FormEvent } from 'react';
import { GlobeLock, Info, Loader2, Save } from 'lucide-react';
import Tooltip from '@/components/common/Tooltip';
import type { PublicScraperSettings } from '@/types';
import SettingsCard from '../shared/SettingsCard';

interface Props {
  settings: PublicScraperSettings;
  onSettingsUpdated: (settings: PublicScraperSettings) => void;
  onNotify: (message: string, type?: 'success' | 'error') => void;
}

export default function OutboundProxyCard({
  settings,
  onSettingsUpdated,
  onNotify,
}: Props) {
  const [proxyInput, setProxyInput] = useState('');
  const [clearProxy, setClearProxy] = useState(false);
  const [saving, setSaving] = useState(false);

  const hasChanges = clearProxy || proxyInput.trim().length > 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!hasChanges || saving) return;

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        proxyUrl: clearProxy ? '' : proxyInput.trim(),
      };

      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.status === 401) {
        window.location.assign('/login?next=/settings/general');
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        onNotify(data.error ?? 'Failed to update proxy configuration.', 'error');
        return;
      }

      setProxyInput('');
      setClearProxy(false);
      onSettingsUpdated(data.settings);
      onNotify(
        clearProxy
          ? 'Outbound proxy removed — Chromium will connect directly'
          : 'Outbound proxy saved — Chromium context will recycle on next scrape',
        'success'
      );
    } catch {
      onNotify('Network error saving proxy settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsCard>
      <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
        <div className="flex items-start gap-2.5">
          <GlobeLock className="w-4 h-4 text-sky-400 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-slate-100">
              Outbound Chromium Proxy
            </h3>
            <p className="text-xs text-gunmetal-muted mt-0.5">
              Route all headless Chromium requests to Google Flights through an optional HTTP, HTTPS, or SOCKS5 proxy.
            </p>
          </div>
        </div>

        {settings.hasProxy ? (
          <Tooltip
            content="Proxy credentials are masked at rest; enter a new URL to replace"
            position="top"
          >
            <span
              tabIndex={0}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded border text-xs font-mono font-semibold bg-emerald-950/60 text-emerald-300 border-emerald-800/60 cursor-help"
            >
              <span>Active: {settings.maskedProxyUrl}</span>
            </span>
          </Tooltip>
        ) : (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded border text-xs font-semibold bg-gunmetal-card text-gunmetal-muted border-gunmetal-border">
            Direct Connection
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="ofs-proxy-url"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1"
          >
            <span>Proxy Endpoint URL</span>
            <Tooltip
              content="Supported schemes: http://, https://, or socks5:// (including optional user:pass credentials)"
              position="top"
            >
              <span tabIndex={0} className="cursor-help">
                <Info className="w-3.5 h-3.5 text-slate-400" />
              </span>
            </Tooltip>
          </label>
          <input
            id="ofs-proxy-url"
            type="text"
            value={proxyInput}
            disabled={clearProxy || saving}
            onChange={(e) => setProxyInput(e.target.value)}
            placeholder={
              settings.hasProxy
                ? 'Enter new proxy URL to replace active proxy...'
                : 'http://user:pass@proxy.example.com:8080'
            }
            className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 rounded-md bg-gunmetal-canvas border border-gunmetal-border text-slate-100 placeholder-zinc-500 text-sm font-mono focus:outline-none focus:border-slate-500 disabled:opacity-50"
          />
        </div>

        {settings.hasProxy && (
          <label className="min-h-[44px] sm:min-h-0 inline-flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={clearProxy}
              disabled={saving}
              onChange={(e) => setClearProxy(e.target.checked)}
              className="w-4 h-4 accent-slate-500 rounded cursor-pointer"
            />
            <span>Remove configured proxy on save and revert to direct connections</span>
          </label>
        )}

        <div className="pt-1 flex justify-end">
          <button
            type="submit"
            disabled={!hasChanges || saving}
            className="min-h-[44px] sm:min-h-[38px] px-4 py-2 rounded-lg text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 bg-slate-800/75 hover:bg-slate-700/85 border border-slate-500/80 hover:border-slate-400 text-slate-100 hover:text-white font-semibold shadow-sm transition-colors disabled:opacity-45 disabled:pointer-events-none cursor-pointer"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>{saving ? 'Saving...' : 'Save Proxy Settings'}</span>
          </button>
        </div>
      </form>
    </SettingsCard>
  );
}