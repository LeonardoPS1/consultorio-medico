import { NextRequest, NextResponse } from 'next/server';
import { getConversacionById } from '@/lib/data-store';
import { db } from '@/lib/db';
import { conversaciones } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';

/**
 * GET /api/conversaciones/[id]
 *
 * Obtiene una conversación por ID, incluyendo datos del paciente.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'ID de conversación es obligatorio' },
        { status: 400 }
      );
    }

    const conversacion = await getConversacionById(id);

    if (!conversacion) {
      return NextResponse.json(
        { error: 'Conversación no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(conversacion);
  } catch (error) {
    console.error('[API] Error GET /api/conversaciones/[id]:', error);
    return NextResponse.json(
      { error: 'Error al obtener conversación', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/conversaciones/[id]
 *
 * Actualiza una conversación: cambiar estado, opt-out, último mensaje, etc.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json({ error: 'Envia al menos un campo' }, { status: 400 });
    }

    const updateData: Record<string, any> = { updatedAt: new Date() };

    if (body.estado !== undefined) updateData.estado = body.estado;
    if (body.optOut !== undefined) {
      updateData.optOut = body.optOut;
      if (body.optOut) updateData.optOutAt = new Date();
    }
    if (body.ultimoMensaje !== undefined) updateData.ultimoMensaje = body.ultimoMensaje;
    if (body.ultimoMensajeRol !== undefined) updateData.ultimoMensajeRol = body.ultimoMensajeRol;
    if (body.ultimaIntencion !== undefined) updateData.ultimaIntencion = body.ultimaIntencion;
    if (body.ultimaInteraccion !== undefined) updateData.ultimaInteraccion = new Date(body.ultimaInteraccion);
    if (body.medicoId !== undefined) updateData.medicoId = body.medicoId;
    if (body.proximoRecordatorio !== undefined) updateData.proximoRecordatorio = body.proximoRecordatorio ? new Date(body.proximoRecordatorio) : null;

    const [actualizada] = await db
      .update(conversaciones)
      .set(updateData)
      .where(eq(conversaciones.id, params.id))
      .returning();

    if (!actualizada) {
      return NextResponse.json({ error: 'Conversacion no encontrada' }, { status: 404 });
    }

    return NextResponse.json({ data: actualizada });
  } catch (error) {
    console.error('[API] Error PATCH /api/conversaciones/[id]:', error);
    return NextResponse.json({ error: 'Error al actualizar conversacion' }, { status: 500 });
  }
}
