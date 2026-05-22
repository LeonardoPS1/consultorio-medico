import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { turnos } from '@/drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';

/**
 * PATCH /api/turnos/[id]
 *
 * Actualiza un turno (cambiar estado, editar, cancelar).
 *
 * Body (JSON): campos a actualizar
 * - estado: string (opcional)
 * - fechaHora: string (ISO, opcional)
 * - duracionMinutos: number (opcional)
 * - motivo: string (opcional)
 * - tipoConsulta: string (opcional)
 * - motivoCancelacion: string (opcional, para cancelaciones)
 *
 * GET /api/turnos/[id]
 *
 * Obtiene un turno por ID.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const [turno] = await db
      .select()
      .from(turnos)
      .where(and(eq(turnos.id, params.id), sql`${turnos.deletedAt} IS NULL`));

    if (!turno) {
      return NextResponse.json(
        { error: 'Turno no encontrado' },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: turno });
  } catch (error) {
    console.error('[API] Error GET /api/turnos/[id]:', error);
    return NextResponse.json(
      { error: 'Error al obtener turno' },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/turnos/[id]
 *
 * Actualiza un turno existente.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json();

    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json(
        { error: 'Enviá al menos un campo para actualizar' },
        { status: 400 },
      );
    }

    // Verificar que el turno existe
    const existente = await db
      .select()
      .from(turnos)
      .where(and(eq(turnos.id, params.id), sql`${turnos.deletedAt} IS NULL`))
      .limit(1);

    if (existente.length === 0) {
      return NextResponse.json(
        { error: 'Turno no encontrado' },
        { status: 404 },
      );
    }

    // Preparar datos de actualización
    const updateData: Record<string, any> = { updatedAt: new Date() };

    // Si se cancela, registrar motivo y canceladoPor
    if (body.estado === 'cancelada') {
      updateData.estado = 'cancelada';
      updateData.canceladoPor = 'dashboard';
      updateData.motivoCancelacion = body.motivoCancelacion || null;
    } else if (body.estado) {
      updateData.estado = body.estado;
    }

    // Actualizar otros campos
    if (body.fecha && body.hora) {
      updateData.fechaHora = new Date(`${body.fecha}T${body.hora}:00.000Z`);
    } else if (body.fechaHora) {
      updateData.fechaHora = new Date(body.fechaHora);
    }
    if (body.duracionMinutos) updateData.duracionMinutos = body.duracionMinutos;
    if (body.motivo !== undefined) updateData.motivo = body.motivo;
    if (body.tipoConsulta !== undefined) updateData.tipoConsulta = body.tipoConsulta;
    if (body.pacienteId) updateData.pacienteId = body.pacienteId;
    if (body.medicoId) updateData.medicoId = body.medicoId;

    const [actualizado] = await db
      .update(turnos)
      .set(updateData)
      .where(eq(turnos.id, params.id))
      .returning();

    return NextResponse.json({ data: actualizado });
  } catch (error) {
    console.error('[API] Error PATCH /api/turnos/[id]:', error);
    return NextResponse.json(
      { error: 'Error al actualizar turno' },
      { status: 500 },
    );
  }
}
