import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { WebVitalsClient } from './rendimiento-client';

export const dynamic = 'force-dynamic';

export default async function AdminRendimientoPage() {
  const session = await auth();
  if (!session) redirect('/login');
  if (session.user.role !== 'admin') redirect('/dashboard');

  return <WebVitalsClient />;
}
