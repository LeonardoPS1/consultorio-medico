import { eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { tenants } from '@/drizzle/schema';
import type { ConfigRegional } from '@/drizzle/tenant';
import { requireAuth } from '@/lib/api-auth';
import { apiHandler, success, ok } from '@/lib/api-handler';
import { db } from '@/lib/db';
import { PAISES } from '@/lib/regions-data';
import { getTenantRegional } from '@/lib/services/tenant';

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
  const configRegional: ConfigRegional = {
    pais: paisConfig.codigo,
    moneda: paisConfig.moneda,
    documentoId: paisConfig.documentoId,
    sistemaSalud: paisConfig.sistemaSalud,
    regiones: pais.toLowerCase(),
  };

  await db
    .update(tenants)
    .set({ configRegional, updatedAt: new Date() })
    .where(eq(tenants.id, tenantId));

  return ok({ data: configRegional, message: `Configuración regional actualizada a ${paisConfig.nombre}` });
});
