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
import { z } from 'zod';
import {
  publicApiHandler,
  jsonResponse,
  errorResponse,
  type AuthenticatedRequest,
} from '@/lib/public-api-handler';
import { API_SCOPES } from '@/lib/public-api-auth';
import { turnosService } from '@/lib/services/turnos';

const turnoSchema = z.object({
  pacienteId: z.string().uuid(),
  medicoId: z.string().uuid(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD'),
  hora: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
  tipoConsulta: z.enum(['presencial', 'virtual', 'telefonica']).optional().default('presencial'),
  motivo: z.string().optional(),
  duracionMinutos: z.number().int().min(5).max(240).optional().default(30),
});

export const POST = publicApiHandler(
  async (request: AuthenticatedRequest) => {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return errorResponse('Body inválido. Enviar JSON válido.', 400);
    }

    // Validar campos con Zod
    const parsed = turnoSchema.safeParse(body);
    if (!parsed.success) {
      const errores = parsed.error.flatten().fieldErrors;
      return errorResponse(
        `Campos inválidos: ${Object.entries(errores)
          .map(([k, v]) => `${k}: ${v?.join(', ')}`)
          .join('; ')}`,
        400,
      );
    }

    try {
      const turno = await turnosService.create({
        pacienteId: parsed.data.pacienteId,
        medicoId: parsed.data.medicoId,
        fecha: parsed.data.fecha,
        hora: parsed.data.hora,
        tipoConsulta: parsed.data.tipoConsulta,
        motivo: parsed.data.motivo,
        duracionMinutos: parsed.data.duracionMinutos,
      });

      // Devolver el turno creado (sin datos sensibles)
      return jsonResponse(
        {
          id: turno.id,
          pacienteId: turno.pacienteId,
          medicoId: turno.medicoId,
          fechaHora: turno.fechaHora,
          estado: turno.estado,
          motivo: turno.motivo,
        },
        201,
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Error al crear el turno';
      return errorResponse(message, 400);
    }
  },
  { scopes: [API_SCOPES.TURNOS_WRITE], maxRequests: 30, windowMs: 60_000 },
);

export { OPTIONS } from '@/lib/public-api-handler';
