/**
 * GET /api/portal/chat — Obtiene o crea la conversación del paciente portal
 * POST /api/portal/chat — Crea conversación y envía primer mensaje
 */

import { NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal-auth';
import { db } from '@/lib/db';
import { conversaciones } from '@/drizzle/schema';
import { eq, and, isNull } from 'drizzle-orm';

/**
 * GET: Busca una conversación activa para el paciente, o crea una nueva.
 */
export async function GET() {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  // Buscar conversación existente (web o cualquier canal)
  let [conv] = await db
    .select()
    .from(conversaciones)
    .where(
      and(
        eq(conversaciones.pacienteId, session.pacienteId),
        eq(conversaciones.estado, 'activa'),
        isNull(conversaciones.deletedAt),
      ),
    )
    .limit(1);

  // Si no existe, crear una nueva
  if (!conv) {
    [conv] = await db
      .insert(conversaciones)
      .values({
        pacienteId: session.pacienteId,
        canal: 'web',
        estado: 'activa',
      })
      .returning();
  }

  return NextResponse.json({ data: conv });
}
