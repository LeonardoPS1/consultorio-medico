import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { recetas } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { recetasService } from '@/lib/services/recetas';
import { apiHandler, success, notFound, fail } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';
import { parseBody, updateRecetaSchema } from '@/lib/validations';

export const GET = apiHandler(async (request: NextRequest, { params }: { params: { id: string } }) => {
  const session = await requireAuth();
  const sessionMedicoId = session?.user?.medicoId;
  const sessionRol = session?.user?.role;

  const receta = await recetasService.obtener(params.id);

  if (!receta) {
    notFound('Receta no encontrada');
  }

  if (sessionRol !== 'admin' && sessionMedicoId && receta.medicoId !== sessionMedicoId) {
    fail('No autorizado', 403);
  }

  return success(receta);
});

export const PATCH = apiHandler(async (request: NextRequest, { params }: { params: { id: string } }) => {
  const session = await requireAuth();
  const sessionMedicoId = session?.user?.medicoId;
  const sessionRol = session?.user?.role;

  const body = await parseBody(request, updateRecetaSchema);

  const existente = await db
    .select({ id: recetas.id, medicoId: recetas.medicoId })
    .from(recetas)
    .where(eq(recetas.id, params.id))
    .limit(1);

  if (existente.length === 0) {
    notFound('Receta no encontrada');
  }

  if (sessionRol !== 'admin' && sessionMedicoId && existente[0].medicoId !== sessionMedicoId) {
    fail('No autorizado', 403);
  }

  const actualizada = await recetasService.actualizar(params.id, body);

  return success(actualizada);
});

export const DELETE = apiHandler(async (_request: NextRequest, { params }: { params: { id: string } }) => {
  const session = await requireAuth();
  const sessionMedicoId = session?.user?.medicoId;
  const sessionRol = session?.user?.role;

  const existente = await db
    .select({ id: recetas.id, medicoId: recetas.medicoId })
    .from(recetas)
    .where(eq(recetas.id, params.id))
    .limit(1);

  if (existente.length === 0) {
    notFound('Receta no encontrada');
  }

  if (sessionRol !== 'admin' && sessionMedicoId && existente[0].medicoId !== sessionMedicoId) {
    fail('No autorizado', 403);
  }

  const actualizada = await recetasService.actualizar(params.id, { estado: 'historial' as const });

  return success(actualizada);
});
