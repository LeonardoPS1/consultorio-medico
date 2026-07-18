import { NextRequest } from 'next/server';
import { apiHandler, success, ok } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';
import { db } from '@/lib/db';
import { tenants } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { getTenantRegional } from '@/lib/services/tenant';
import { PAISES } from '@/lib/regions-data';

export const GET = apiHandler(async (request: NextRequest) => {
  await requireAuth();

  const tenantId = request.headers.get('x-tenant-id') || undefined;
  const config = await getTenantRegional(tenantId);
  return success(config);
});

export const POST = apiHandler(async (request: NextRequest) => {
  await requireAuth();

  const tenantId = request.headers.get('x-tenant-id');
  if (!tenantId || tenantId === '00000000-0000-0000-0000-000000000000') {
    return ok({ message: 'No se puede configurar regionalización en tenant por defecto' });
  }

  const body = await request.json();
  const { pais } = body;

  if (!pais || !PAISES[pais]) {
    return ok({ message: 'País no válido. Usar CL o AR' });
  }

  const paisConfig = PAISES[pais];
  const configRegional = {
    pais: paisConfig.codigo,
    moneda: paisConfig.moneda,
    documentoId: paisConfig.documentoId,
    sistemaSalud: paisConfig.sistemaSalud,
    regiones: pais.toLowerCase(),
  };

  await db
    .update(tenants)
    .set({ configRegional: configRegional as any, updatedAt: new Date() })
    .where(eq(tenants.id, tenantId));

  return ok({ data: configRegional, message: `Configuración regional actualizada a ${paisConfig.nombre}` });
});
