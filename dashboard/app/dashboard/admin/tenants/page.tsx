import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { tenants } from '@/drizzle/schema';
import { desc } from 'drizzle-orm';
import { TenantsClient } from './tenants-client';

export const dynamic = 'force-dynamic';

export default async function AdminTenantsPage() {
  const session = await auth();
  if (!session || session.user.role !== 'admin') redirect('/dashboard');

  const rows = await db
    .select({
      id: tenants.id,
      nombre: tenants.nombre,
      subdomain: tenants.subdomain,
      activo: tenants.activo,
      createdAt: tenants.createdAt,
    })
    .from(tenants)
    .orderBy(desc(tenants.createdAt));

  const initialTenants = rows.map((r) => ({
    ...r,
    createdAt: r.createdAt?.toISOString?.() ?? String(r.createdAt ?? ''),
  }));

  return <TenantsClient initialTenants={initialTenants} />;
}
