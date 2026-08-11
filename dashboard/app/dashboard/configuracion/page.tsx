import { redirect } from 'next/navigation';
import { getEffectiveSession } from '@/lib/auth-effective';
import { ConfiguracionClient } from './configuracion-client';

export const dynamic = 'force-dynamic';

/**
 *
 */
export default async function ConfiguracionPage() {
  const session = await getEffectiveSession();
  if (!session) redirect('/login');

  return <ConfiguracionClient />;
}
