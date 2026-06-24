import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { servicios } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { apiHandler, success, notFound, fail } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';
import { parseBody, updateServicioSchema } from '@/lib/validations';

function extractId(request: NextRequest): string {
  const parts = request.nextUrl.pathname.split('/').filter(Boolean);
  return parts.pop()!;
}

export const GET = apiHandler(async (request: NextRequest) => {
  await requireAuth();
  const id = extractId(request);

  const [servicio] = await db.select().from(servicios).where(eq(servicios.id, id));
  if (!servicio) notFound('Servicio no encontrado');
  return success(servicio);
});

export const PATCH = apiHandler(async (request: NextRequest) => {
  await requireAuth();
  const id = extractId(request);

  const body = await parseBody(request, updateServicioSchema);
  if (!body || Object.keys(body).length === 0) {
    fail('Envia al menos un campo');
  }

  const updateData: Record<string, any> = { updatedAt: new Date() };
  if (body.nombre !== undefined) updateData.nombre = body.nombre;
  if (body.descripcion !== undefined) updateData.descripcion = body.descripcion;
  if (body.duracionMinutos !== undefined) updateData.duracionMinutos = body.duracionMinutos;
  if (body.precio !== undefined) updateData.precio = body.precio;
  if (body.activo !== undefined) updateData.activo = body.activo;

  const [actualizado] = await db
    .update(servicios)
    .set(updateData)
    .where(eq(servicios.id, id))
    .returning();
  if (!actualizado) notFound('Servicio no encontrado');

  return success(actualizado);
});
