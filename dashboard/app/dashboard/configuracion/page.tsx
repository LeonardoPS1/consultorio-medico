import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ConfiguracionClient } from './configuracion-client';

export const dynamic = 'force-dynamic';

export default async function ConfiguracionPage() {
  const session = await auth();
  if (!session) redirect('/login');

  return <ConfiguracionClient />;
}
