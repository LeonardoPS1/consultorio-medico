import { eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { recetas } from '@/drizzle/schema';
import { requireAuth } from '@/lib/api-auth';
import { apiHandler, success, notFound, fail } from '@/lib/api-handler';
import { CACHE_TAGS, revalidate } from '@/lib/data-cache';
import { db } from '@/lib/db';
import { recetasService } from '@/lib/services/recetas';

export const POST = apiHandler(
  async (_request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) => {
    const { id } = await paramsPromise;
    const session = await requireAuth();
    const sessionMedicoId = session?.user?.medicoId;
    const sessionRol = session?.user?.role;

    const existente = await db
      .select({ id: recetas.id, medicoId: recetas.medicoId, estado: recetas.estado })
      .from(recetas)
      .where(eq(recetas.id, id))
      .limit(1);

    if (existente.length === 0) {
      notFound('Receta no encontrada');
    }

    if (sessionRol !== 'admin' && sessionMedicoId && existente[0].medicoId !== sessionMedicoId) {
      fail('No autorizado', 403);
    }

    const estadosNoRenovables = ['anulada', 'renovada', 'historial'];
    if (estadosNoRenovables.includes(existente[0].estado)) {
      fail('La receta no puede renovarse desde su estado actual', 400);
    }

    const renovada = await recetasService.renovar(id, sessionMedicoId ?? undefined);

    revalidate([CACHE_TAGS.RECETAS, CACHE_TAGS.PACIENTES, CACHE_TAGS.DASHBOARD_STATS]);
    return success(renovada);
  },
);
