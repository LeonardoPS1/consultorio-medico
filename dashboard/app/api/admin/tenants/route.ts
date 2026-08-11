import { desc } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { tenants } from '@/drizzle/schema';
import { requireAuth } from '@/lib/api-auth';
import { apiHandler, success, created, fail, conflict } from '@/lib/api-handler';
import { db } from '@/lib/db';
import { crearTenant } from '@/lib/services/tenant';
import { parseBody, createTenantSchema } from '@/lib/validations';

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

  try {
    await crearTenant({ nombre: body.nombre, subdomain: body.subdomain });
  } catch (e) {
    if (e instanceof Error && e.message === 'El subdominio ya está en uso') {
      conflict('El subdominio ya está en uso');
    }
    throw e;
  }

  return created({ ok: true });
});
