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
import { apiHandler, ok, fail } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';
import { parseBody } from '@/lib/validations';
import { db } from '@/lib/db';
import { usuarios, userFeatureOverrides } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

// ─── GET ─────────────────────────────────────────────────────

export const GET = apiHandler(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAuth();
    if (session.user.role !== 'admin') fail('No autorizado', 403);

    const { id: userId } = await params;

    const overrides = await db
      .select({
        featureId: userFeatureOverrides.featureId,
      })
      .from(userFeatureOverrides)
      .where(eq(userFeatureOverrides.usuarioId, userId));

    // El cliente espera un array plano de featureIds
    return ok({
      featureIds: overrides.map((o) => o.featureId),
    });
  },
);

// ─── PATCH ───────────────────────────────────────────────────

export const PATCH = apiHandler(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAuth();
    if (session.user.role !== 'admin') fail('No autorizado', 403);

    const { id: userId } = await params;

    const body = await parseBody(
      request,
      z.object({
        featureIds: z.array(z.string()),
      }),
    );

    // Primero, eliminar todos los overrides existentes para este usuario
    await db.delete(userFeatureOverrides).where(eq(userFeatureOverrides.usuarioId, userId));

    // Luego, insertar los nuevos overrides
    if (body.featureIds.length > 0) {
      const values = body.featureIds.map((featureId) => ({
        usuarioId: userId,
        featureId,
      }));

      await db.insert(userFeatureOverrides).values(values);
    }

    return ok({
      success: true,
    });
  },
);
