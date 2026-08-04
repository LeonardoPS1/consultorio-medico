import { eq, and, gte, lt, isNull } from 'drizzle-orm';
import { turnos } from '@/drizzle/schema';
import { db } from '@/lib/db';
import { API_SCOPES } from '@/lib/public-api-auth';
import {
  publicApiHandler,
  jsonResponse,
  errorResponse,
  type AuthenticatedRequest,
} from '@/lib/public-api-handler';
import { createTurnoSchema } from '@/lib/validations';

async function handler(request: AuthenticatedRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Body JSON inválido', 400);
  }

  const parsed = createTurnoSchema.safeParse(body);
  if (!parsed.success) {
    const messages = parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
    return errorResponse(`Datos inválidos: ${messages}`, 400);
  }

  const { pacienteId, medicoId, fecha, hora, motivo, tipoConsulta } = parsed.data;
  const fechaHora = new Date(`${fecha}T${hora}:00`);

  const conflicto = await db
    .select({ id: turnos.id })
    .from(turnos)
    .where(
      and(
        eq(turnos.medicoId, medicoId),
        gte(turnos.fechaHora, fechaHora),
        lt(turnos.fechaHora, new Date(fechaHora.getTime() + 60 * 60 * 1000)),
        isNull(turnos.deletedAt),
      ),
    )
    .limit(1);

  if (conflicto.length > 0) {
    return errorResponse('El horario no está disponible', 409);
  }

  const turnoTipo = tipoConsulta === 'telemedicina' ? 'telemedicina' : 'consulta';

  const [turno] = await db
    .insert(turnos)
    .values({
      pacienteId,
      medicoId,
      fechaHora,
      motivo: motivo || null,
      tipoConsulta: turnoTipo as 'consulta' | 'telemedicina',
      estado: 'pendiente' as const,
      duracionMinutos: 30,
    })
    .returning();

  return jsonResponse(turno, 201);
}

export const POST = publicApiHandler(handler, {
  scopes: [API_SCOPES.TURNOS_WRITE],
});

export { OPTIONS } from '@/lib/public-api-handler';
