/**
 * GET /api/portal/chat/[id]/mensajes — Lista mensajes de la conversación
 * POST /api/portal/chat/[id]/mensajes — Envía un mensaje desde el portal
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal-auth';
import { db } from '@/lib/db';
import { conversaciones, mensajes } from '@/drizzle/schema';
import { eq, and, isNull, desc } from 'drizzle-orm';

/**
 * GET: Devuelve los mensajes de la conversación (ordenados cronológicamente).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const convId = params.id;

  // Verificar que la conversación pertenezca al paciente
  const [conv] = await db
    .select()
    .from(conversaciones)
    .where(
      and(
        eq(conversaciones.id, convId),
        eq(conversaciones.pacienteId, session.pacienteId),
        isNull(conversaciones.deletedAt),
      ),
    )
    .limit(1);

  if (!conv) {
    return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 });
  }

  const listaMensajes = await db
    .select()
    .from(mensajes)
    .where(eq(mensajes.conversacionId, convId))
    .orderBy(mensajes.createdAt)
    .limit(100);

  return NextResponse.json({ data: listaMensajes });
}

/**
 * POST: Envía un mensaje del paciente en la conversación.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const convId = params.id;

  // Verificar que la conversación pertenezca al paciente
  const [conv] = await db
    .select()
    .from(conversaciones)
    .where(
      and(
        eq(conversaciones.id, convId),
        eq(conversaciones.pacienteId, session.pacienteId),
        isNull(conversaciones.deletedAt),
      ),
    )
    .limit(1);

  if (!conv) {
    return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 });
  }

  const body = await request.json();
  const { contenido } = body;

  if (!contenido || typeof contenido !== 'string' || contenido.trim().length === 0) {
    return NextResponse.json({ error: 'El contenido es obligatorio' }, { status: 400 });
  }

  if (contenido.length > 1000) {
    return NextResponse.json({ error: 'Mensaje demasiado largo (máximo 1000 caracteres)' }, { status: 400 });
  }

  // Crear el mensaje
  const [msg] = await db
    .insert(mensajes)
    .values({
      conversacionId: convId,
      rol: 'paciente',
      contenido: contenido.trim(),
      tipo: 'texto',
    })
    .returning();

  // Actualizar ultimoMensaje en la conversación
  await db
    .update(conversaciones)
    .set({
      ultimoMensaje: contenido.trim(),
      ultimoMensajeRol: 'paciente',
      ultimaInteraccion: new Date(),
    })
    .where(eq(conversaciones.id, convId));

  return NextResponse.json({ data: msg }, { status: 201 });
}
