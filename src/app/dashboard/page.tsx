import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import DashboardClient from '@/components/dashboard/DashboardClient';
import { getOverallApiKeyUsage } from '@/db/apiKeys';
import { getRecentScrapeLogs, getRollingUsageCounts } from '@/db/logs';
import { getPublicSettings } from '@/db/settings';
import { getBrowserSessionStats } from '@/scraper/browserManager';
import { ADMIN_COOKIE_NAME, isAdminSessionValid } from '@/utils/auth';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  const token = cookies().get(ADMIN_COOKIE_NAME)?.value;
  if (!isAdminSessionValid(token)) {
    redirect('/login?next=/dashboard');
  }

  const settings = getPublicSettings();
  const browserStats = getBrowserSessionStats();
  const overallUsage = getOverallApiKeyUsage();
  const logs = getRecentScrapeLogs(50);
  const rollingCounts = getRollingUsageCounts();

  return (
    <DashboardClient
      initialSettings={settings}
      initialBrowserStats={browserStats}
      initialOverallUsage={overallUsage}
      initialLogs={logs}
      initialUsage={{
        hourlyUsed: rollingCounts.hourlyUsed,
        hourlyLimit: settings.maxRequestsPerHour,
        dailyUsed: rollingCounts.dailyUsed,
        dailyLimit: settings.maxRequestsPerDay,
      }}
    />
  );
}