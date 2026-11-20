'use client';

import type { PublicScraperSettings } from '@/types';
import AppVersionSupportCard from './general/AppVersionSupportCard';
import OutboundProxyCard from './general/OutboundProxyCard';
import SystemTimezoneCard from './general/SystemTimezoneCard';
import SettingsIntroBanner from './shared/SettingsIntroBanner';

interface Props {
  settings: PublicScraperSettings;
  timezone: string;
  onSettingsUpdated: (settings: PublicScraperSettings) => void;
  onNotify: (message: string, type?: 'success' | 'error') => void;
}

export default function GeneralTab({
  settings,
  timezone,
  onSettingsUpdated,
  onNotify,
}: Props) {
  return (
    <div className="space-y-6 pt-2">
      <SettingsIntroBanner
        title="Instance Preferences & Network Routing"
        description="View application build metadata, monitor the configured container timezone, and configure an optional outbound proxy for Chromium scrapes."
      />

      <AppVersionSupportCard />

      <SystemTimezoneCard timezone={timezone} />

      <OutboundProxyCard
        settings={settings}
        onSettingsUpdated={onSettingsUpdated}
        onNotify={onNotify}
      />
    </div>
  );
}