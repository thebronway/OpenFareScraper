import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import LoginForm from '@/components/auth/LoginForm';
import { getSettings } from '@/db/settings';
import { ADMIN_COOKIE_NAME, isAdminSessionValid } from '@/utils/auth';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const token = cookies().get(ADMIN_COOKIE_NAME)?.value;
  if (isAdminSessionValid(token)) {
    redirect('/dashboard');
  }

  const settings = getSettings();
  const hasAdminPassword = Boolean(settings.adminPasswordHash);

  return (
    <Suspense fallback={null}>
      <LoginForm hasAdminPassword={hasAdminPassword} />
    </Suspense>
  );
}