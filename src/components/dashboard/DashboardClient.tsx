'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { ApiUsageCard } from '@/components/ApiUsageCard';
import { EngineStatusCard } from '@/components/EngineStatusCard';
import { LiveTestScrapeCard } from '@/components/LiveTestScrapeCard';
import { SETTINGS_UPDATED_EVENT } from '@/components/Navbar';
import { ScrapeLogsCard } from '@/components/ScrapeLogsCard';
import type {
  OverallApiKeyUsage,
  PublicScraperSettings,
  ScrapeLogEntry,
  UsageQuotaStats,
} from '@/types';

interface DashboardClientProps {
  initialSettings: PublicScraperSettings;
  initialBrowserStats: {
    active: boolean;
    scrapesSinceLaunch: number;
  };
  initialOverallUsage: OverallApiKeyUsage;
  initialLogs: ScrapeLogEntry[];
  initialUsage: UsageQuotaStats;
}

export default function DashboardClient({
  initialSettings,
  initialBrowserStats,
  initialOverallUsage,
  initialLogs,
  initialUsage,
}: DashboardClientProps) {
  const [settings, setSettings] = useState<PublicScraperSettings>(initialSettings);
  const [browserStats, setBrowserStats] = useState(initialBrowserStats);
  const [overallUsage, setOverallUsage] = useState<OverallApiKeyUsage>(initialOverallUsage);
  const [logs, setLogs] = useState<ScrapeLogEntry[]>(initialLogs);
  const [usage, setUsage] = useState<UsageQuotaStats>(initialUsage);
  const [refreshing, setRefreshing] = useState(false);

  const refreshDashboardData = useCallback(async () => {
    setRefreshing(true);
    try {
      const [settingsRes, keysRes, logsRes] = await Promise.all([
        fetch('/api/admin/settings', { cache: 'no-store' }),
        fetch('/api/admin/keys', { cache: 'no-store' }),
        fetch('/api/admin/logs?limit=50', { cache: 'no-store' }),
      ]);

      if (
        settingsRes.status === 401 ||
        keysRes.status === 401 ||
        logsRes.status === 401
      ) {
        window.location.assign('/login?next=/dashboard');
        return;
      }

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSettings(settingsData.settings);
        if (settingsData.browserStats) {
          setBrowserStats(settingsData.browserStats);
        }
      }
      if (keysRes.ok) {
        const keysData = await keysRes.json();
        if (keysData.overallUsage) {
          setOverallUsage(keysData.overallUsage);
        }
      }
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(logsData.logs);
        if (logsData.usage) {
          setUsage((prev) => ({
            ...prev,
            hourlyUsed: logsData.usage.hourlyUsed,
            dailyUsed: logsData.usage.dailyUsed,
          }));
        }
      }
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void refreshDashboardData();
      }
    }, 15000);
    return () => clearInterval(timer);
  }, [refreshDashboardData]);

  const handleSettingsUpdated = useCallback((nextSettings: PublicScraperSettings) => {
    setSettings(nextSettings);
    window.dispatchEvent(new Event(SETTINGS_UPDATED_EVENT));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>
          <p className="text-xs text-gunmetal-muted mt-0.5">
            Headless Chromium engine health, rolling quota telemetry, API key usage, and live scrape verification.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void refreshDashboardData()}
          disabled={refreshing}
          className="min-h-[44px] sm:min-h-[38px] px-4 py-2 rounded-lg text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 bg-gunmetal-canvas hover:bg-gunmetal-border border border-gunmetal-border text-slate-300 hover:text-white font-semibold transition-colors disabled:opacity-45 disabled:pointer-events-none cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh Telemetry'}</span>
        </button>
      </div>

      <EngineStatusCard
        settings={settings}
        usage={{
          ...usage,
          hourlyLimit: settings.maxRequestsPerHour,
          dailyLimit: settings.maxRequestsPerDay,
        }}
        browserStats={browserStats}
        onSettingsUpdated={handleSettingsUpdated}
      />

      <ApiUsageCard usage={overallUsage} />

      <LiveTestScrapeCard
        globalPaused={settings.globalPaused}
        onScrapeCompleted={refreshDashboardData}
      />

      <ScrapeLogsCard logs={logs} onRefresh={refreshDashboardData} />
    </div>
  );
}