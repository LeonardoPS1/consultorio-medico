import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { canAccess } from '@/lib/features';
import { IntegracionesClient } from './integraciones-client';

export const metadata: Metadata = {
  title: 'Integraciones — AicoreMed',
};

/**
 *
 */
export default async function IntegracionesPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const plan = session.user?.plan ?? 'free';
  if (!canAccess(plan, 'integraciones')) {
    redirect('/dashboard');
  }

  const isAdmin = session.user?.role === 'admin';

  return <IntegracionesClient isAdmin={isAdmin} />;
}
