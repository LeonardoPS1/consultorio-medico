/**
 * GET /api/ia/sugerencias — Sugerencias contextuales para el asistente IA flotante.
 *
 * Retorna las sugerencias disponibles para la página actual,
 * filtradas por las categorías habilitadas en la config del tenant.
 */

import { apiHandler, success } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';
import { getSugerencias, getAlertasProactivas } from '@/lib/ia/asistente-prompts';
import { buildContextoDB } from '@/lib/ia/asistente-context';

export const dynamic = 'force-dynamic';
import { db } from '@/lib/db';
import { tenants } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import type { ConfigIa } from '@/drizzle/schema';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';

export const GET = apiHandler(async (request) => {
  const session = await requireAuth();
  const usuarioId = session.user.id as string;

  const { searchParams } = new URL(request.url);
  const ruta = searchParams.get('ruta') || '/dashboard';
  const incluirAlertas = searchParams.get('alertas') === 'true';

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

  // ─── Alertas proactivas (solo modo activo) ─────────────────
  let alertas: ReturnType<typeof getAlertasProactivas> = [];
  if (incluirAlertas) {
    const datosDB = await buildContextoDB(usuarioId, ruta, true);
    alertas = getAlertasProactivas(datosDB);
  }

  return success({ sugerencias, alertas });
});
