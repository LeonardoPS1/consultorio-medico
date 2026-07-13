/**
 * GET /api/portal/chat/[id]/mensajes — Lista mensajes de la conversación
 * POST /api/portal/chat/[id]/mensajes — Envía un mensaje desde el portal
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal-auth';
import { db } from '@/lib/db';
import { conversaciones, mensajes } from '@/drizzle/schema';
import { eq, and, isNull } from 'drizzle-orm';

/**
 * Determina si está fuera de horario laboral y devuelve
 * un mensaje de auto-respuesta, o null si está en horario.
 *
 * Horario laboral: Lun-Vie 9:00-18:00 (Chile)
 */
function getAutoReplyIfOutsideHours(): string | null {
  const now = new Date();
  // Ajustar a hora Chile (UTC-3 o UTC-4 según horario de verano/invierno)
  const chileOffset = -3; // -3 en verano, -4 en invierno (simplificamos a -3)
  const chileHour = (now.getUTCHours() + 24 + chileOffset) % 24;
  const chileDay = now.getUTCDay(); // 0=domingo, 6=sábado

  const isWeekend = chileDay === 0 || chileDay === 6;
  const isBeforeHours = chileHour < 9;
  const isAfterHours = chileHour >= 18;

  if (isWeekend || isAfterHours || isBeforeHours) {
    const dia = isWeekend
      ? 'hoy (fin de semana)'
      : `hoy (son las ${chileHour.toString().padStart(2, '0')}:00)`;
    return `Gracias por escribirnos ${dia}. 🕐
Nuestro horario de atención es de lunes a viernes de 9:00 a 18:00 hrs.

Te responderemos a la brevedad cuando retomemos la atención. ¡Gracias por tu paciencia! 🙏`;
  }

  return null;
}

/**
 * GET: Devuelve los mensajes de la conversación (ordenados cronológicamente).
 */
export async function GET(_request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const { id } = await paramsPromise;
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const convId = id;

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
export async function POST(request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const { id } = await paramsPromise;
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const convId = id;

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
    return NextResponse.json(
      { error: 'Mensaje demasiado largo (máximo 1000 caracteres)' },
      { status: 400 },
    );
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

  // Auto-respuesta fuera de horario laboral
  const autoReply = getAutoReplyIfOutsideHours();
  if (autoReply) {
    await db.insert(mensajes).values({
      conversacionId: convId,
      rol: 'asistente_ia',
      contenido: autoReply,
      tipo: 'texto',
    });
    // Actualizar ultimoMensaje con la auto-respuesta
    await db
      .update(conversaciones)
      .set({
        ultimoMensaje: autoReply,
        ultimoMensajeRol: 'asistente_ia',
      })
      .where(eq(conversaciones.id, convId));
  }

  return NextResponse.json({ data: msg }, { status: 201 });
}
