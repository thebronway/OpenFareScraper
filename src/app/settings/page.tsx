import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE_NAME, isAdminSessionValid } from '@/utils/auth';

export const dynamic = 'force-dynamic';

export default function SettingsIndexPage() {
  const token = cookies().get(ADMIN_COOKIE_NAME)?.value;
  if (!isAdminSessionValid(token)) {
    redirect('/login?next=/settings/general');
  }
  redirect('/settings/general');
}