/**
 * GET /api/user/feature-overrides — Obtener overrides del usuario autenticado
 *
 * Usado por el frontend para consultar qué features tiene override
 * y así pasarlos a canAccessWithUserOverrides().
 */

import { apiHandler, success } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';
import { db } from '@/lib/db';
import { userFeatureOverrides } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';

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
