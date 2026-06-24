/**
 * GET /api/v1/turnos/:id — Estado de un turno
 *
 * Scope requerido: turnos:read
 * Público: Sí (con API key)
 */

import { db } from '@/lib/db';
import { turnos, pacientes, medicos } from '@/drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';
import {
  publicApiHandler,
  jsonResponse,
  errorResponse,
  type AuthenticatedRequest,
} from '@/lib/public-api-handler';
import { API_SCOPES } from '@/lib/public-api-auth';

async function handler(
  request: AuthenticatedRequest,
  context?: { params: Record<string, string> },
) {
  const turnoId = context?.params?.id;

  if (!turnoId) {
    return errorResponse('ID de turno requerido', 400);
  }

  const result = await db
    .select({
      id: turnos.id,
      pacienteId: turnos.pacienteId,
      medicoId: turnos.medicoId,
      fechaHora: turnos.fechaHora,
      estado: turnos.estado,
      motivo: turnos.motivo,
      tipoConsulta: turnos.tipoConsulta,
      duracionMinutos: turnos.duracionMinutos,
      notasPaciente: turnos.notasPaciente,
      pacienteNombre: pacientes.nombre,
      medicoNombre: medicos.nombre,
    })
    .from(turnos)
    .leftJoin(pacientes, eq(turnos.pacienteId, pacientes.id))
    .leftJoin(medicos, eq(turnos.medicoId, medicos.id))
    .where(and(eq(turnos.id, turnoId), sql`${turnos.deletedAt} IS NULL`))
    .limit(1);

  if (result.length === 0) {
    return errorResponse('Turno no encontrado', 404);
  }

  return jsonResponse({ turno: result[0] });
}

export const GET = publicApiHandler(handler, {
  scopes: [API_SCOPES.TURNOS_READ],
});

export { OPTIONS } from '@/lib/public-api-handler';
