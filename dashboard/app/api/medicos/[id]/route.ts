import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { medicos } from '@/drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';
import { apiHandler, success, notFound, fail } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';
import { parseBody, updateMedicoSchema } from '@/lib/validations';
import { z } from 'zod';

async function requireMedicoAccess(medicoId: string) {
  const session = await requireAuth();
  const sessionMedicoId = session.user?.medicoId;
  const sessionRol = session.user?.role;
  if (sessionRol === 'admin') return;
  if (sessionMedicoId !== medicoId) fail('No autorizado', 403);
}

export const GET = apiHandler(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  await requireAuth();

  const [medico] = await db.select().from(medicos).where(eq(medicos.id, params.id));
  if (!medico) notFound('Medico no encontrado');
  return success(medico);
});

const medicoPatchSchema = updateMedicoSchema.extend({
  horarios: z.any().optional(),
});

export const PATCH = apiHandler(
  async (request: NextRequest, { params }: { params: { id: string } }) => {
    await requireMedicoAccess(params.id);

    const body = await parseBody(request, medicoPatchSchema);

    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (body.nombre !== undefined) updateData.nombre = body.nombre;
    if (body.especialidad !== undefined) updateData.especialidad = body.especialidad;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.telefono !== undefined) updateData.telefono = body.telefono;
    if (body.whatsapp !== undefined) updateData.whatsapp = body.whatsapp;
    if (body.matricula !== undefined) updateData.matricula = body.matricula;
    if (body.duracionTurnoMinutos !== undefined)
      updateData.duracionTurnoMinutos = body.duracionTurnoMinutos;
    if (body.activo !== undefined) updateData.activo = body.activo;
    if (body.horarios !== undefined) updateData.horarios = body.horarios;

    const [actualizado] = await db
      .update(medicos)
      .set(updateData)
      .where(eq(medicos.id, params.id))
      .returning();
    if (!actualizado) notFound('Medico no encontrado');

    return success(actualizado);
  },
);

export const DELETE = apiHandler(async (_req: NextRequest, { params }) => {
  await requireMedicoAccess(params.id);

  const [medico] = await db
    .select({ id: medicos.id })
    .from(medicos)
    .where(and(eq(medicos.id, params.id), sql`${medicos.deletedAt} IS NULL`))
    .limit(1);

  if (!medico) notFound('Medico no encontrado');

  await db.update(medicos).set({ deletedAt: new Date() }).where(eq(medicos.id, params.id));
  return success({ deleted: true });
});
