/**
 * GET  /api/admin/features — Obtener toggles actuales del tenant
 * PATCH /api/admin/features — Activar/desactivar features (MERGE)
 *
 * Admin only — requiere sesión con rol admin
 *
 * IMPORTANTE: PATCH hace MERGE con los toggles existentes en DB.
 * Siempre devuelve el estado completo después de la operación,
 * incluyendo features guardados con true (habilitados).
 */

import { eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { tenants } from '@/drizzle/schema';
import { requireAuth } from '@/lib/api-auth';
import { apiHandler, success, fail } from '@/lib/api-handler';
import { db } from '@/lib/db';
import { FEATURE_PLAN } from '@/lib/features';
import { parseBody } from '@/lib/validations';

const ALL_FEATURES = Object.keys(FEATURE_PLAN);

// ─── GET ─────────────────────────────────────────────────────

export const GET = apiHandler(async () => {
  const session = await requireAuth();
  if (session.user.role !== 'admin') fail('No autorizado', 403);
  const tenantId = (session.user as { tenantId?: string }).tenantId;
  if (!tenantId) fail('Tenant no encontrado', 400);

  const [tenant] = await db
    .select({ featuresEnabled: tenants.featuresEnabled })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  const saved = (tenant?.featuresEnabled || {}) as Record<string, boolean>;
  const merged: Record<string, boolean> = {};
  for (const f of ALL_FEATURES) {
    merged[f] = saved[f] !== false;
  }

  return success({ features: merged });
});

// ─── PATCH ───────────────────────────────────────────────────

export const PATCH = apiHandler(async (request: NextRequest) => {
  const session = await requireAuth();
  if (session.user.role !== 'admin') fail('No autorizado', 403);
  const tenantId = (session.user as { tenantId?: string }).tenantId;
  if (!tenantId) fail('Tenant no encontrado', 400);

  const body = await parseBody(request, z.record(z.string(), z.boolean()));

  const [tenant] = await db
    .select({ featuresEnabled: tenants.featuresEnabled })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  const current = (tenant?.featuresEnabled || {}) as Record<string, boolean>;

  const merged: Record<string, boolean> = { ...current };
  for (const [key, value] of Object.entries(body)) {
    merged[key] = value;
  }

  await db.update(tenants).set({ featuresEnabled: merged }).where(eq(tenants.id, tenantId));

  return success({
    features: merged,
    message: 'Toggles actualizados',
  });
});
