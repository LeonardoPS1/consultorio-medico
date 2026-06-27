import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { sucursales } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { SucursalesClient } from './sucursales-client';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';

export const dynamic = 'force-dynamic';

export default async function AdminSucursalesPage() {
  const session = await auth();
  if (!session || session.user.role !== 'admin') redirect('/dashboard');

  const initialList = await db
    .select()
    .from(sucursales)
    .where(eq(sucursales.tenantId, DEFAULT_TENANT_ID))
    .orderBy(sucursales.nombre);

  return <SucursalesClient initialList={initialList} />;
}
