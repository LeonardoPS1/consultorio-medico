/**
 * GET    /api/admin/users/[id]/feature-overrides — Obtener overrides de un usuario
 * PATCH  /api/admin/users/[id]/feature-overrides — Actualizar overrides de un usuario
 *
 * Admin only. Permite habilitar features de planes superiores
 * para usuarios específicos.
 *
 * Body PATCH: { featureIds: string[] } — lista de features a override
 */

import { NextRequest } from 'next/server';
import { apiHandler, success, fail } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';
import { parseBody } from '@/lib/validations';
import { db } from '@/lib/db';
import { userFeatureOverrides, usuarios } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { FEATURE_PLAN } from '@/lib/features';

// ─── GET ─────────────────────────────────────────────────────

export const GET = apiHandler(async (
  _request: NextRequest,
  { params }: { params: { id: string } },
) => {
  const session = await requireAuth();
  if (session.user.role !== 'admin') fail('No autorizado', 403);

  const { id } = params;

  // Verificar que el usuario existe
  const [user] = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(eq(usuarios.id, id))
    .limit(1);
  if (!user) fail('Usuario no encontrado', 404);

  // Obtener overrides
  const overrides = await db
    .select({ featureId: userFeatureOverrides.featureId })
    .from(userFeatureOverrides)
    .where(eq(userFeatureOverrides.usuarioId, id));

  const overrideSet = new Set(overrides.map((o) => o.featureId));

  return success({ featureIds: Array.from(overrideSet) });
});

// ─── PATCH ───────────────────────────────────────────────────

const updateSchema = z.object({
  featureIds: z.array(z.string()),
});

export const PATCH = apiHandler(async (
  request: NextRequest,
  { params }: { params: { id: string } },
) => {
  const session = await requireAuth();
  if (session.user.role !== 'admin') fail('No autorizado', 403);

  const { id } = params;

  // Verificar que el usuario existe
  const [user] = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(eq(usuarios.id, id))
    .limit(1);
  if (!user) fail('Usuario no encontrado', 404);

  const body = await parseBody(request, updateSchema);
  const { featureIds } = body;

  // Validar que todos los featureIds sean conocidos
  const validFeatures = Object.keys(FEATURE_PLAN);
  for (const f of featureIds) {
    if (!validFeatures.includes(f)) {
      fail(`Feature desconocido: ${f}`);
    }
  }

  // Reemplazar todos los overrides del usuario en una transacción
  await db.transaction(async (tx) => {
    // Eliminar overrides existentes
    await tx
      .delete(userFeatureOverrides)
      .where(eq(userFeatureOverrides.usuarioId, id));

    // Insertar nuevos overrides
    if (featureIds.length > 0) {
      await tx.insert(userFeatureOverrides).values(
        featureIds.map((featureId) => ({
          usuarioId: id,
          featureId,
        })),
      );
    }
  });

  return success({
    featureIds,
    message: 'Overrides actualizados',
  });
});
