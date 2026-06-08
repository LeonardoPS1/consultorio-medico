/**
 * PATCH /api/portal/turnos/[id] — Cancelar turno
 * Protegido: requiere cookie portal_session
 */

import { NextRequest } from 'next/server';
import { apiHandler, ok, fail, notFound } from '@/lib/api-handler';
import { getPortalSession } from '@/lib/portal-auth';
import { parseBody, portalTurnoUpdateSchema } from '@/lib/validations';
import { db } from '@/lib/db';
import { turnos } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';

export const PATCH = apiHandler(async (
  request: NextRequest,
  { params }: { params: { id: string } },
) => {
  const session = await getPortalSession();
  if (!session) fail('No autorizado', 401);

  const turnoId = params.id;
  const body = await parseBody(request, portalTurnoUpdateSchema);

  const nuevoEstado = body.estado || 'cancelada';

  if (!['cancelada'].includes(nuevoEstado)) {
    fail('Solo se permite cancelar turnos', 403);
  }

  const [turno] = await db
    .select({ id: turnos.id, estado: turnos.estado })
    .from(turnos)
    .where(and(eq(turnos.id, turnoId), eq(turnos.pacienteId, session.pacienteId)))
    .limit(1);

  if (!turno) notFound('Turno no encontrado');

  if (turno.estado === 'cancelada') {
    fail('El turno ya fue cancelado', 400);
  }

  if (turno.estado === 'atendido') {
    fail('No se puede cancelar un turno ya atendido', 400);
  }

  const motivo = body.motivo || 'Cancelado por el paciente';

  await db
    .update(turnos)
    .set({
      estado: 'cancelada',
      canceladoPor: session.pacienteId,
      motivoCancelacion: motivo,
    })
    .where(eq(turnos.id, turnoId));

  return ok({ success: true, estado: 'cancelada' });
});
