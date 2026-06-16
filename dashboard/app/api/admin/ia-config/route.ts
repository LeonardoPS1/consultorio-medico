/**
 * GET  /api/admin/ia-config — Obtener configuración del asistente IA
 * PUT /api/admin/ia-config — Actualizar configuración del asistente IA
 *
 * Admin only — requiere sesión con rol admin
 * Almacena prompt, maxTokens y temperatura en tenants.config_ia (JSONB)
 */

import { NextRequest } from 'next/server';
import { apiHandler, success, fail } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';
import { parseBody } from '@/lib/validations';
import { db } from '@/lib/db';
import { tenants } from '@/drizzle/schema';
import type { ConfigIa } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';
const DEFAULT_CONFIG: ConfigIa = {
  prompt: 'Sos el asistente virtual del consultorio médico. Respondés mensajes de WhatsApp de forma amable y profesional en español argentino. Si detectás una urgencia, priorizala y notificá al médico.',
  maxTokens: 300,
  temperatura: 0.3,
};

const putBodySchema = z.object({
  prompt: z.string().min(10).max(2000).optional(),
  maxTokens: z.number().int().min(50).max(4000).optional(),
  temperatura: z.number().min(0).max(2).optional(),
});

// ─── GET ─────────────────────────────────────────────────────

export const GET = apiHandler(async () => {
  const session = await requireAuth();
  if (session.user.role !== 'admin') fail('No autorizado', 403);

  const [tenant] = await db
    .select({ configIa: tenants.configIa })
    .from(tenants)
    .where(eq(tenants.id, DEFAULT_TENANT_ID))
    .limit(1);

  const config = (tenant?.configIa && typeof tenant.configIa === 'object' && tenant.configIa.prompt ? tenant.configIa : DEFAULT_CONFIG) as ConfigIa;

  return success({ config });
});

// ─── PUT ─────────────────────────────────────────────────────

export const PUT = apiHandler(async (request: NextRequest) => {
  const session = await requireAuth();
  if (session.user.role !== 'admin') fail('No autorizado', 403);

  const body = await parseBody(request, putBodySchema);

  const [tenant] = await db
    .select({ configIa: tenants.configIa })
    .from(tenants)
    .where(eq(tenants.id, DEFAULT_TENANT_ID))
    .limit(1);

  const current = (tenant?.configIa && typeof tenant.configIa === 'object' && tenant.configIa.prompt ? tenant.configIa : DEFAULT_CONFIG) as ConfigIa;

  const merged: ConfigIa = {
    ...current,
    ...body,
  };

  await db
    .update(tenants)
    .set({ configIa: merged })
    .where(eq(tenants.id, DEFAULT_TENANT_ID));

  return success({
    config: merged,
    message: 'Configuración del asistente IA actualizada',
  });
});
