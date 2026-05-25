/**
 * PATCH /api/portal/turnos/[id] — Cancelar turno
 * Protegido: requiere cookie portal_session
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal-auth';
import { db } from '@/lib/db';
import { turnos } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const turnoId = params.id;
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {}

  const nuevoEstado = (body.estado as string) || 'cancelada';

  // Solo permitir cancelación desde el portal
  if (!['cancelada'].includes(nuevoEstado)) {
    return NextResponse.json({ error: 'Solo se permite cancelar turnos' }, { status: 403 });
  }

  // Verificar que el turno pertenece al paciente
  const [turno] = await db
    .select({ id: turnos.id, estado: turnos.estado })
    .from(turnos)
    .where(and(eq(turnos.id, turnoId), eq(turnos.pacienteId, session.pacienteId)))
    .limit(1);

  if (!turno) {
    return NextResponse.json({ error: 'Turno no encontrado' }, { status: 404 });
  }

  if (turno.estado === 'cancelada') {
    return NextResponse.json({ error: 'El turno ya fue cancelado' }, { status: 400 });
  }

  if (turno.estado === 'atendido') {
    return NextResponse.json({ error: 'No se puede cancelar un turno ya atendido' }, { status: 400 });
  }

  const motivo = (body.motivo as string) || 'Cancelado por el paciente';

  await db
    .update(turnos)
    .set({
      estado: 'cancelada',
      canceladoPor: session.pacienteId,
      motivoCancelacion: motivo,
    })
    .where(eq(turnos.id, turnoId));

  return NextResponse.json({ success: true, estado: 'cancelada' });
}
