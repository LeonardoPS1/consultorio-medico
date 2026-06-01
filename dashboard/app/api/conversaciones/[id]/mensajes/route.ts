import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import {
  getMensajesByConversacion,
  createMensaje,
  getConversacionById,
} from '@/lib/data-store';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { conversaciones } from '@/drizzle/schema';

/**
 * GET /api/conversaciones/[id]/mensajes
 *
 * Obtiene todos los mensajes de una conversación, ordenados cronológicamente.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    const sessionMedicoId = (session?.user as any)?.medicoId;
    const sessionRol = (session?.user as any)?.role;

    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'ID de conversación es obligatorio' },
        { status: 400 }
      );
    }

    // Verificar que la conversación existe y pertenece al médico
    const conversacion = await getConversacionById(id);
    if (!conversacion) {
      return NextResponse.json(
        { error: 'Conversación no encontrada' },
        { status: 404 }
      );
    }

    // IDOR check: médico solo puede ver sus propias conversaciones
    if (sessionRol !== 'admin' && sessionMedicoId && conversacion.medicoId !== sessionMedicoId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    const mensajes = await getMensajesByConversacion(id);

    return NextResponse.json({
      data: mensajes,
      total: mensajes.length,
      conversacionId: id,
    });
  } catch (error) {
    console.error('[API] Error GET /api/conversaciones/[id]/mensajes:', error);
    return NextResponse.json(
      { error: 'Error al obtener mensajes', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/conversaciones/[id]/mensajes
 *
 * Agrega un mensaje a una conversación existente.
 *
 * Body:
 * {
 *   rol: string (obligatorio: "paciente" | "asistente_ia" | "medico" | "secretaria" | "sistema"),
 *   contenido: string (obligatorio),
 *   tipo: string (opcional, default "texto"),
 *   intencion: string (opcional),
 *   confianzaIntencion: number (opcional),
 *   twilioSid: string (opcional)
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    const sessionMedicoId = (session?.user as any)?.medicoId;
    const sessionRol = (session?.user as any)?.role;

    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'ID de conversación es obligatorio' },
        { status: 400 }
      );
    }

    // Verificar que la conversación existe y pertenece al médico
    const conversacion = await getConversacionById(id);
    if (!conversacion) {
      return NextResponse.json(
        { error: 'Conversación no encontrada' },
        { status: 404 }
      );
    }

    // IDOR check
    if (sessionRol !== 'admin' && sessionMedicoId && conversacion.medicoId !== sessionMedicoId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validación
    if (!body.rol) {
      return NextResponse.json(
        { error: 'El rol del mensaje es obligatorio' },
        { status: 400 }
      );
    }
    if (!body.contenido) {
      return NextResponse.json(
        { error: 'El contenido del mensaje es obligatorio' },
        { status: 400 }
      );
    }

    const rolesValidos = ['paciente', 'asistente_ia', 'medico', 'secretaria', 'sistema'];
    if (!rolesValidos.includes(body.rol)) {
      return NextResponse.json(
        { error: `Rol inválido. Debe ser uno de: ${rolesValidos.join(', ')}` },
        { status: 400 }
      );
    }

    const mensaje = await createMensaje({
      conversacionId: id,
      rol: body.rol,
      contenido: body.contenido,
      contenidoProcesado: body.contenidoProcesado,
      tipo: body.tipo || 'texto',
      intencion: body.intencion,
      confianzaIntencion: body.confianzaIntencion,
      twilioSid: body.twilioSid,
      twilioStatus: body.twilioStatus,
      n8nExecutionId: body.n8nExecutionId,
      metadata: body.metadata || {},
    });

    return NextResponse.json(mensaje, { status: 201 });
  } catch (error) {
    console.error('[API] Error POST /api/conversaciones/[id]/mensajes:', error);
    return NextResponse.json(
      { error: 'Error al crear mensaje', details: (error as Error).message },
      { status: 500 }
    );
  }
}
