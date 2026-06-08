/**
 * GET  /api/admin/privacidad-config — Obtener configuración de privacidad
 * PUT /api/admin/privacidad-config — Actualizar configuración de privacidad
 *
 * Admin only — requiere sesión con rol admin
 */

import { NextRequest } from 'next/server';
import { apiHandler, success, fail } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';
import { parseBody } from '@/lib/validations';
import { db } from '@/lib/db';
import { tenants } from '@/drizzle/schema';
import type { ConfigPrivacidad } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';
const DEFAULT_CONFIG: ConfigPrivacidad = {
  periodoRetencionBajaDias: 90,
};

const putBodySchema = z.object({
  periodoRetencionBajaDias: z.number().int().min(1).max(365).optional(),
});

// ─── GET ─────────────────────────────────────────────────────

export const GET = apiHandler(async () => {
  const session = await requireAuth();
  if (session.user.role !== 'admin') fail('No autorizado', 403);

  const [tenant] = await db
    .select({ configPrivacidad: tenants.configPrivacidad })
    .from(tenants)
    .where(eq(tenants.id, DEFAULT_TENANT_ID))
    .limit(1);

  const config = (tenant?.configPrivacidad || DEFAULT_CONFIG) as ConfigPrivacidad;

  return success({ config });
});

// ─── PUT ─────────────────────────────────────────────────────

export const PUT = apiHandler(async (request: NextRequest) => {
  const session = await requireAuth();
  if (session.user.role !== 'admin') fail('No autorizado', 403);

  const body = await parseBody(request, putBodySchema);

  const [tenant] = await db
    .select({ configPrivacidad: tenants.configPrivacidad })
    .from(tenants)
    .where(eq(tenants.id, DEFAULT_TENANT_ID))
    .limit(1);

  const current = (tenant?.configPrivacidad || DEFAULT_CONFIG) as ConfigPrivacidad;

  const merged: ConfigPrivacidad = {
    ...current,
    ...body,
  };

  await db
    .update(tenants)
    .set({ configPrivacidad: merged })
    .where(eq(tenants.id, DEFAULT_TENANT_ID));

  return success({
    config: merged,
    message: 'Configuración de privacidad actualizada',
  });
});
