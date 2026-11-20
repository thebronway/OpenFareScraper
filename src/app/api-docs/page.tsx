import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import ApiReferenceViewer from '@/components/apiDocs/ApiReferenceViewer';
import { ADMIN_COOKIE_NAME, isAdminSessionValid } from '@/utils/auth';
import packageInfo from '../../../package.json';

export const dynamic = 'force-dynamic';

export default function ApiDocsPage() {
  const token = cookies().get(ADMIN_COOKIE_NAME)?.value;
  if (!isAdminSessionValid(token)) {
    redirect('/login?next=/api-docs');
  }

  return <ApiReferenceViewer specVersion={packageInfo.version} />;
}