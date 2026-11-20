import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import SettingsForm from '@/components/settings/SettingsForm';
import { normalizeSettingsTab } from '@/components/settings/settingsTabs';
import { listApiKeys } from '@/db/apiKeys';
import { getPublicSettings } from '@/db/settings';
import { ADMIN_COOKIE_NAME, isAdminSessionValid } from '@/utils/auth';

export const dynamic = 'force-dynamic';

export default function SettingsTabPage({
  params,
}: {
  params: { tab: string };
}) {
  const normalizedTab = normalizeSettingsTab(params.tab);
  if (!normalizedTab) {
    redirect('/settings/general');
  }

  const token = cookies().get(ADMIN_COOKIE_NAME)?.value;
  if (!isAdminSessionValid(token)) {
    redirect(`/login?next=/settings/${normalizedTab}`);
  }

  const settings = getPublicSettings();
  const keys = listApiKeys();
  const timezone =
    process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  return (
    <SettingsForm
      initialTab={normalizedTab}
      initialSettings={settings}
      initialKeys={keys}
      timezone={timezone}
    />
  );
}