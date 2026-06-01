import { NextRequest, NextResponse } from 'next/server';
import { getConversacionById } from '@/lib/data-store';
import { db } from '@/lib/db';
import { conversaciones } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';

/**
 * Helper: verifica que el médico autenticado tenga acceso a esta conversación
 */
async function verifyConversacionAccess(conversacionId: string, medicoId: string | undefined, rol: string | undefined) {
  if (rol === 'admin') return;
  if (!medicoId) throw new Error('No autorizado');

  const [conv] = await db
    .select({ medicoId: conversaciones.medicoId })
    .from(conversaciones)
    .where(eq(conversaciones.id, conversacionId))
    .limit(1);

  if (!conv) throw new Error('Conversación no encontrada');
  // Si la conversación tiene medicoId asignado, verificar que sea el mismo
  if (conv.medicoId && conv.medicoId !== medicoId) {
    throw new Error('No autorizado');
  }
}

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
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'ID de conversación es obligatorio' },
        { status: 400 }
      );
    }

    const sessionMedicoId = (session.user as any)?.medicoId;
    const sessionRol = (session.user as any)?.role;
    await verifyConversacionAccess(id, sessionMedicoId, sessionRol);

    const conversacion = await getConversacionById(id);

    if (!conversacion) {
      return NextResponse.json(
        { error: 'Conversación no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(conversacion);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno';
    if (message === 'No autorizado' || message === 'Conversación no encontrada') {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    console.error('[API] Error GET /api/conversaciones/[id]:', error);
    return NextResponse.json(
      {
        error: 'Error al obtener conversación',
        ...(process.env.NODE_ENV === 'development' ? { details: (error as Error).message } : {}),
      },
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
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const sessionMedicoId = (session.user as any)?.medicoId;
    const sessionRol = (session.user as any)?.role;
    await verifyConversacionAccess(params.id, sessionMedicoId, sessionRol);

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
    const message = error instanceof Error ? error.message : 'Error interno';
    if (message === 'No autorizado' || message === 'Conversación no encontrada') {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    console.error('[API] Error PATCH /api/conversaciones/[id]:', error);
    return NextResponse.json({ error: 'Error al actualizar conversacion' }, { status: 500 });
  }
}
