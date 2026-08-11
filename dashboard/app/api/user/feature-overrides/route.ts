/**
 * GET /api/user/feature-overrides — Obtener overrides del usuario autenticado
 *
 * Usado por el frontend para consultar qué features tiene override
 * y así pasarlos a canAccessWithUserOverrides().
 */

import { eq } from 'drizzle-orm';
import { userFeatureOverrides } from '@/drizzle/schema';
import { requireAuth } from '@/lib/api-auth';
import { apiHandler, success } from '@/lib/api-handler';
import { db } from '@/lib/db';

export const GET = apiHandler(async () => {
  const session = await requireAuth();
  const userId = session.user.id!;

  const overrides = await db
    .select({ featureId: userFeatureOverrides.featureId })
    .from(userFeatureOverrides)
    .where(eq(userFeatureOverrides.usuarioId, userId));

  const overrideSet = new Set(overrides.map((o) => o.featureId));

  return success({ featureIds: Array.from(overrideSet) });
});
