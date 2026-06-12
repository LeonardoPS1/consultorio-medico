/**
 * GET  /api/admin/users/[id]/feature-overrides — Obtener overrides de usuario
 * PATCH /api/admin/users/[id]/feature-overrides — Actualizar overrides de usuario
 *
 * Admin only — requiere sesión con rol admin
 *
 * Los overrides de usuario permiten que un admin habilite features de planes
 * superiores para usuarios específicos.
 */

import { NextRequest } from 'next/server';
import { apiHandler, success, fail } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';
import { parseBody } from '@/lib/validations';
import { db } from '@/lib/db';
import { usuarios, userFeatureOverrides } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

// ─── GET ─────────────────────────────────────────────────────

export const GET = apiHandler(async (request: NextRequest, { params }: { params: { id: string } }) => {
  const session = await requireAuth();
  if (session.user.role !== 'admin') fail('No autorizado', 403);

  const { id: userId } = params;

  const overrides = await db
    .select({
      featureId: userFeatureOverrides.featureId,
    })
    .from(userFeatureOverrides)
    .where(eq(userFeatureOverrides.usuarioId, userId));

  return success({
    overrides: overrides.map(o => ({
      featureId: o.featureId,
      enabled: true, // Por defecto, todos los overrides habilitan la feature
    })),
  });
});

// ─── PATCH ───────────────────────────────────────────────────

export const PATCH = apiHandler(async (request: NextRequest, { params }: { params: { id: string } }) => {
  const session = await requireAuth();
  if (session.user.role !== 'admin') fail('No autorizado', 403);

  const { id: userId } = params;

  const body = await parseBody(request, z.object({
    overrides: z.array(z.object({
      featureId: z.string(),
      enabled: z.boolean().optional().default(true),
    })),
  }));

  // Primero, eliminar todos los overrides existentes para este usuario
  await db
    .delete(userFeatureOverrides)
    .where(eq(userFeatureOverrides.usuarioId, userId));

  // Luego, insertar los nuevos overrides (solo features habilitadas)
  const enabledOverrides = body.overrides.filter(o => o.enabled !== false);
  if (enabledOverrides.length > 0) {
    const values = enabledOverrides.map(o => ({
      usuarioId: userId,
      featureId: o.featureId,
    }));

    await db.insert(userFeatureOverrides).values(values);
  }

  return success({
    message: 'Overrides de usuario actualizados',
    overrides: enabledOverrides,
  });
});