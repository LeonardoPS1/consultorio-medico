import { eq, and } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { bloqueosAgenda } from '@/drizzle/schema';
import { db } from '@/lib/db';

/**
 * DELETE /api/medicos/[id]/bloqueos/[bloqueoId]
 * Elimina un bloqueo de agenda.
 * @param {NextRequest} _request - La solicitud HTTP entrante.
 * @param {object} root0 - Contexto de la ruta.
 * @param {Promise<{ id: string; bloqueoId: string }>} root0.params - Promesa con los parámetros dinámicos de la ruta.
 * @returns {Promise<NextResponse>} Confirmación de eliminación o un error.
 */
export async function DELETE(
  _request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string; bloqueoId: string }> },
): Promise<NextResponse> {
  const { id, bloqueoId } = await paramsPromise;
  try {
    const result = await db
      .delete(bloqueosAgenda)
      .where(and(eq(bloqueosAgenda.id, bloqueoId), eq(bloqueosAgenda.medicoId, id)));

    if (result.length === 0) {
      return NextResponse.json({ error: 'Bloqueo no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error DELETE bloqueo:', error);
    return NextResponse.json({ error: 'Error al eliminar bloqueo' }, { status: 500 });
  }
}

/**
 * PATCH /api/medicos/[id]/bloqueos/[bloqueoId]
 * Actualiza un bloqueo existente (titulo, fechas, tipo).
 * @param {NextRequest} request - La solicitud HTTP entrante.
 * @param {object} root0 - Contexto de la ruta.
 * @param {Promise<{ id: string; bloqueoId: string }>} root0.params - Promesa con los parámetros dinámicos de la ruta.
 * @returns {Promise<NextResponse>} El bloqueo actualizado o un error.
 */
export async function PATCH(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string; bloqueoId: string }> },
): Promise<NextResponse> {
  const { id, bloqueoId } = await paramsPromise;
  try {
    const body = (await request.json()) as {
      titulo?: string;
      fechaInicio?: string;
      fechaFin?: string;
      tipo?: string;
      motivo?: string | null;
    };
    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json({ error: 'Envia al menos un campo' }, { status: 400 });
    }

    const updateData: Partial<typeof bloqueosAgenda.$inferInsert> = {};
    if (body.titulo !== undefined) updateData.titulo = body.titulo;
    if (body.fechaInicio) updateData.fechaInicio = new Date(body.fechaInicio);
    if (body.fechaFin) updateData.fechaFin = new Date(body.fechaFin);
    if (body.tipo !== undefined) updateData.tipo = body.tipo;
    if (body.motivo !== undefined) updateData.motivo = body.motivo;

    // Validar que fechaInicio <= fechaFin si se envían ambas
    const inicio = updateData.fechaInicio;
    const fin = updateData.fechaFin;
    if (inicio && fin && inicio > fin) {
      return NextResponse.json(
        { error: 'fechaInicio debe ser anterior a fechaFin' },
        { status: 400 },
      );
    }

    const [actualizado] = await db
      .update(bloqueosAgenda)
      .set(updateData)
      .where(and(eq(bloqueosAgenda.id, bloqueoId), eq(bloqueosAgenda.medicoId, id)))
      .returning();

    if (!actualizado) {
      return NextResponse.json({ error: 'Bloqueo no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ data: actualizado });
  } catch (error) {
    console.error('[API] Error PATCH bloqueo:', error);
    return NextResponse.json({ error: 'Error al actualizar bloqueo' }, { status: 500 });
  }
}
