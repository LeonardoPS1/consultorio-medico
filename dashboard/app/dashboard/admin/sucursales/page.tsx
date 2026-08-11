import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { sucursales } from '@/drizzle/schema';
import { getEffectiveSession } from '@/lib/auth-effective';
import { db } from '@/lib/db';
import { SucursalesClient } from './sucursales-client';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';

export const dynamic = 'force-dynamic';

/**
 *
 */
export default async function AdminSucursalesPage() {
  const session = await getEffectiveSession();
  if (!session || session.user.role !== 'admin') redirect('/dashboard');

  const initialList = await db
    .select()
    .from(sucursales)
    .where(eq(sucursales.tenantId, DEFAULT_TENANT_ID))
    .orderBy(sucursales.nombre);

  return <SucursalesClient initialList={initialList} />;
}
