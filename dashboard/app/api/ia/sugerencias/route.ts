/**
 * GET /api/ia/sugerencias — Sugerencias contextuales para el asistente IA flotante.
 *
 * Retorna las sugerencias disponibles para la página actual,
 * filtradas por las categorías habilitadas en la config del tenant.
 */

import { apiHandler, success } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';
import { getSugerencias } from '@/lib/ia/asistente-prompts';

export const dynamic = 'force-dynamic';
import { db } from '@/lib/db';
import { tenants } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import type { ConfigIa } from '@/drizzle/schema';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';

export const GET = apiHandler(async (request) => {
  await requireAuth();

  const { searchParams } = new URL(request.url);
  const ruta = searchParams.get('ruta') || '/dashboard';

  // ─── Cargar config del tenant ─────────────────────────────
  const [tenant] = await db
    .select({ configIa: tenants.configIa })
    .from(tenants)
    .where(eq(tenants.id, DEFAULT_TENANT_ID))
    .limit(1);

  const configIa = (
    tenant?.configIa && typeof tenant.configIa === 'object' && 'prompt' in tenant.configIa
      ? tenant.configIa
      : null
  ) as ConfigIa | null;

  // ─── Obtener sugerencias filtradas ─────────────────────────
  const sugerencias = getSugerencias(ruta, configIa?.sugerenciasHabilitadas);

  return success({ sugerencias });
});
