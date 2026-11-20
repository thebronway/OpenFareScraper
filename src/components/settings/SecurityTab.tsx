'use client';

import type { ApiKeyRecord, PublicScraperSettings } from '@/types';
import AdminPasswordCard from './security/AdminPasswordCard';
import ApiKeysCard from './security/ApiKeysCard';
import SettingsIntroBanner from './shared/SettingsIntroBanner';

interface Props {
  keys: ApiKeyRecord[];
  onRefreshKeys: () => Promise<void>;
  onSettingsUpdated: (settings: PublicScraperSettings) => void;
  onNotify: (message: string, type?: 'success' | 'error') => void;
}

export default function SecurityTab({
  keys,
  onRefreshKeys,
  onSettingsUpdated,
  onNotify,
}: Props) {
  return (
    <div className="space-y-6 pt-2">
      <SettingsIntroBanner
        title="Admin Credentials & Public API Keys"
        description="Rotate your administrator console password and mint or revoke SHA-256 hashed bearer API keys for REST integrations."
      />

      <AdminPasswordCard
        onSettingsUpdated={onSettingsUpdated}
        onNotify={onNotify}
      />

      <ApiKeysCard
        keys={keys}
        onRefresh={onRefreshKeys}
        onNotify={onNotify}
      />
    </div>
  );
}