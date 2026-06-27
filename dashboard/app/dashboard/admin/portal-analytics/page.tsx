import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { PortalAnalyticsClient } from './portal-analytics-client';

export const dynamic = 'force-dynamic';

export default async function PortalAnalyticsPage() {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    redirect('/dashboard');
  }

  return <PortalAnalyticsClient />;
}
