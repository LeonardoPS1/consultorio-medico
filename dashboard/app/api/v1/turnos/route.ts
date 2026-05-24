/**
 * POST /api/v1/turnos — Crear un turno
 *
 * Body: { pacienteId, medicoId, fecha, hora, motivo?, tipoConsulta?, duracionMinutos? }
 * Scope requerido: turnos:write
 * Público: Sí (con API key)
 *
 * Nota: para crear turnos desde el dashboard usar POST /api/turnos (con sesión).
 * Este endpoint permite a sistemas externos agendar turnos con API key.
 */

import { db } from '@/lib/db';
import { turnos } from '@/drizzle/schema';
import { publicApiHandler, jsonResponse, errorResponse, type AuthenticatedRequest } from '@/lib/public-api-handler';
import { API_SCOPES } from '@/lib/public-api-auth';
import { turnosService } from '@/lib/services/turnos';

export const POST = publicApiHandler(
  async (request: AuthenticatedRequest) => {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return errorResponse('Body inválido. Enviar JSON válido.', 400);
    }

    // Validar campos requeridos
    const pacienteId = body.pacienteId as string | undefined;
    const medicoId = body.medicoId as string | undefined;
    const fecha = body.fecha as string | undefined;
    const hora = body.hora as string | undefined;

    if (!pacienteId || !medicoId || !fecha || !hora) {
      return errorResponse(
        'Campos requeridos: pacienteId, medicoId, fecha (YYYY-MM-DD), hora (HH:MM)',
        400,
      );
    }

    try {
      const turno = await turnosService.create({
        pacienteId,
        medicoId,
        fecha,
        hora,
        tipoConsulta: (body.tipoConsulta as 'presencial' | 'virtual' | 'telefonica') || 'presencial',
        motivo: (body.motivo as string) || undefined,
        duracionMinutos: (body.duracionMinutos as number) || 30,
      });

      // Devolver el turno creado (sin datos sensibles)
      return jsonResponse({
        id: turno.id,
        pacienteId: turno.pacienteId,
        medicoId: turno.medicoId,
        fechaHora: turno.fechaHora,
        estado: turno.estado,
        motivo: turno.motivo,
      }, 201);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Error al crear el turno';
      return errorResponse(message, 400);
    }
  },
  { scopes: [API_SCOPES.TURNOS_WRITE], maxRequests: 30, windowMs: 60_000 },
);

export { OPTIONS } from '@/lib/public-api-handler';
