import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { medicos } from '@/drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';
import { apiHandler, success, notFound } from '@/lib/api-handler';
import { auth } from '@/lib/auth';

/**
 * Helper: solo admin o el propio médico puede modificar/eliminar
 */
async function requireMedicoAccess(medicoId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('No autorizado');
  const sessionMedicoId = (session.user as any)?.medicoId;
  const sessionRol = (session.user as any)?.role;
  if (sessionRol === 'admin') return;
  if (sessionMedicoId !== medicoId) throw new Error('No autorizado');
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const [medico] = await db.select().from(medicos).where(eq(medicos.id, params.id));
    if (!medico) return NextResponse.json({ error: 'Medico no encontrado' }, { status: 404 });
    return NextResponse.json({ data: medico });
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener medico' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireMedicoAccess(params.id);

    const body = await request.json();
    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json({ error: 'Envia al menos un campo' }, { status: 400 });
    }

    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (body.nombre !== undefined) updateData.nombre = body.nombre;
    if (body.especialidad !== undefined) updateData.especialidad = body.especialidad;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.telefono !== undefined) updateData.telefono = body.telefono;
    if (body.whatsapp !== undefined) updateData.whatsapp = body.whatsapp;
    if (body.matricula !== undefined) updateData.matricula = body.matricula;
    if (body.duracionTurnoMinutos !== undefined) updateData.duracionTurnoMinutos = body.duracionTurnoMinutos;
    if (body.activo !== undefined) updateData.activo = body.activo;
    if (body.horarios !== undefined) updateData.horarios = body.horarios;

    const [actualizado] = await db.update(medicos).set(updateData).where(eq(medicos.id, params.id)).returning();
    if (!actualizado) return NextResponse.json({ error: 'Medico no encontrado' }, { status: 404 });

    return NextResponse.json({ data: actualizado });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno';
    if (message === 'No autorizado') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    console.error('[API] Error PATCH /api/medicos:', error);
    return NextResponse.json({ error: 'Error al actualizar medico' }, { status: 500 });
  }
}

/** DELETE /api/medicos/[id] - Soft-delete de médico */
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
