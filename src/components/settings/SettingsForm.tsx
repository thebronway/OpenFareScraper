'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { SETTINGS_UPDATED_EVENT } from '@/components/Navbar';
import type { ApiKeyRecord, PublicScraperSettings } from '@/types';
import GeneralTab from './GeneralTab';
import GuardrailsTab from './GuardrailsTab';
import SecurityTab from './SecurityTab';
import {
  DEFAULT_SETTINGS_TAB,
  normalizeSettingsTab,
  SETTINGS_TABS,
  type SettingsTabId,
} from './settingsTabs';

interface SettingsFormProps {
  initialTab?: SettingsTabId;
  initialSettings: PublicScraperSettings;
  initialKeys: ApiKeyRecord[];
  timezone: string;
}

export default function SettingsForm({
  initialTab = DEFAULT_SETTINGS_TAB,
  initialSettings,
  initialKeys,
  timezone,
}: SettingsFormProps) {
  const router = useRouter();
  const params = useParams<{ tab?: string }>();
  const resolvedTab = normalizeSettingsTab(params?.tab) ?? initialTab;

  const [settings, setSettings] = useState<PublicScraperSettings>(initialSettings);
  const [keys, setKeys] = useState<ApiKeyRecord[]>(initialKeys);
  const [activeTab, setActiveTab] = useState<SettingsTabId>(resolvedTab);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  useEffect(() => {
    setActiveTab(resolvedTab);
  }, [resolvedTab]);

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' = 'success') => {
      setToast({ message, type });
      setTimeout(() => {
        setToast((prev) => (prev?.message === message ? null : prev));
      }, 3500);
    },
    []
  );

  const handleTabChange = (nextTab: SettingsTabId) => {
    if (nextTab === activeTab) return;
    setActiveTab(nextTab);
    router.push(`/settings/${nextTab}`);
  };

  const handleSettingsUpdated = useCallback(
    (nextSettings: PublicScraperSettings) => {
      setSettings(nextSettings);
      window.dispatchEvent(new Event(SETTINGS_UPDATED_EVENT));
    },
    []
  );

  const refreshKeys = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/keys', { cache: 'no-store' });
      if (res.status === 401) {
        window.location.assign('/login?next=/settings/security');
        return;
      }
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.keys)) {
          setKeys(data.keys);
        }
      }
    } catch {
      showToast('Failed to refresh API keys.', 'error');
    }
  }, [showToast]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Settings</h1>
        <p className="text-xs text-gunmetal-muted mt-0.5">
          Manage instance preferences, anti-bot scraper guardrails, admin credentials, and API keys.
        </p>
      </div>

      <div className="w-full bg-gunmetal-card p-4 sm:p-6 rounded-lg shadow-sm border border-gunmetal-border space-y-5 sm:space-y-6">
        <div
          role="tablist"
          aria-label="Settings sections"
          className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 sm:gap-0 bg-gunmetal-canvas/70 sm:bg-transparent border border-gunmetal-border sm:border-0 sm:border-b sm:border-gunmetal-border p-1.5 sm:p-0 rounded-lg sm:rounded-none"
        >
          {SETTINGS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`min-h-[44px] px-3 sm:px-4 py-2 sm:py-2.5 font-medium text-xs sm:text-sm rounded-md sm:rounded-none transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-gunmetal-border sm:bg-transparent sm:border-b-2 sm:border-slate-300 text-slate-100 font-semibold shadow-sm sm:shadow-none'
                  : 'text-gunmetal-muted hover:text-slate-300 hover:bg-gunmetal-card/60 sm:hover:bg-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'general' && (
          <GeneralTab
            settings={settings}
            timezone={timezone}
            onSettingsUpdated={handleSettingsUpdated}
            onNotify={showToast}
          />
        )}

        {activeTab === 'guardrails' && (
          <GuardrailsTab
            settings={settings}
            onSettingsUpdated={handleSettingsUpdated}
            onNotify={showToast}
          />
        )}

        {activeTab === 'security' && (
          <SecurityTab
            keys={keys}
            onRefreshKeys={refreshKeys}
            onSettingsUpdated={handleSettingsUpdated}
            onNotify={showToast}
          />
        )}
      </div>

      {toast && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:bottom-5 sm:right-5 z-50">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl shadow-black/80 backdrop-blur-md text-sm font-semibold max-w-full sm:max-w-md ${
              toast.type === 'success'
                ? 'bg-gunmetal-card/95 border-emerald-500/80 text-slate-100 ring-1 ring-emerald-500/40'
                : 'bg-gunmetal-card/95 border-rose-500/80 text-slate-100 ring-1 ring-rose-500/40'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}