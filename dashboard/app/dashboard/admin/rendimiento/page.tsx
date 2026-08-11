import { redirect } from 'next/navigation';
import { getEffectiveSession } from '@/lib/auth-effective';
import { WebVitalsClient } from './rendimiento-client';

export const dynamic = 'force-dynamic';

/**
 *
 */
export default async function AdminRendimientoPage() {
  const session = await getEffectiveSession();
  if (!session) redirect('/login');
  if (session.user.role !== 'admin') redirect('/dashboard');

  return <WebVitalsClient />;
}
