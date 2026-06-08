import { NextRequest } from 'next/server';
import { apiHandler, success, created, fail, conflict } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';
import { parseBody, createTenantSchema } from '@/lib/validations';
import { db } from '@/lib/db';
import { tenants } from '@/drizzle/schema';
import { eq, desc } from 'drizzle-orm';

// GET /api/admin/tenants - Listar todos los tenants
export const GET = apiHandler(async () => {
  const session = await requireAuth();
  if (session.user.role !== 'admin') fail('No autorizado', 403);

  const result = await db
    .select({
      id: tenants.id,
      nombre: tenants.nombre,
      subdomain: tenants.subdomain,
      activo: tenants.activo,
      createdAt: tenants.createdAt,
    })
    .from(tenants)
    .orderBy(desc(tenants.createdAt));

  return success(result);
});

// POST /api/admin/tenants - Crear nuevo tenant
export const POST = apiHandler(async (request: NextRequest) => {
  const session = await requireAuth();
  if (session.user.role !== 'admin') fail('No autorizado', 403);

  const body = await parseBody(request, createTenantSchema);

  const existing = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.subdomain, body.subdomain))
    .limit(1);

  if (existing.length > 0) conflict('El subdominio ya está en uso');

  await db.insert(tenants).values({
    nombre: body.nombre.trim(),
    subdomain: body.subdomain.trim(),
  });

  return created({ ok: true });
});
