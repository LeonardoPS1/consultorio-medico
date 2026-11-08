import { and, eq, isNull, lt, notInArray, sql } from 'drizzle-orm';
import { medicos, pacientes, turnos } from '@/drizzle/schema';
import { sucursales } from '@/drizzle/tenant';
import { db } from '@/lib/db';
import { safeError } from '@/lib/logger';
import { API_SCOPES } from '@/lib/public-api-auth';
import {
  publicApiHandler,
  jsonResponse,
  errorResponse,
  type AuthenticatedRequest,
} from '@/lib/public-api-handler';
import { resolveTenantTimezone } from '@/lib/tenant-time';
import { createTurnoSchema } from '@/lib/validations';
import { zonedDateTimeToUtc } from '@/lib/zoned-time';

/** Appointment states that do not occupy a slot. */
const ESTADOS_INACTIVOS: Array<typeof turnos.$inferSelect.estado> = ['cancelada', 'no_asistio'];

async function handler(request: AuthenticatedRequest) {
  const tenantId = request.tenantId;

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

  // ── Tenant ownership of the referenced rows ───────────────────────────────
  // Both `pacientes` and `medicos` reach their tenant through `sucursales`.
  // A row resolvable to a different tenant is reported as missing so the caller
  // cannot probe foreign ids.
  const [paciente] = await db
    .select({
      id: pacientes.id,
      sucursalId: pacientes.sucursalId,
      tenantId: sucursales.tenantId,
    })
    .from(pacientes)
    .leftJoin(sucursales, eq(pacientes.sucursalId, sucursales.id))
    .where(and(eq(pacientes.id, pacienteId), isNull(pacientes.deletedAt)))
    .limit(1);

  if (!paciente) {
    return errorResponse('Paciente no encontrado', 404);
  }
  if (paciente.tenantId && paciente.tenantId !== tenantId) {
    return errorResponse('Paciente no encontrado', 404);
  }

  const [medico] = await db
    .select({
      id: medicos.id,
      sucursalId: medicos.sucursalId,
      tenantId: sucursales.tenantId,
      duracionTurnoMinutos: medicos.duracionTurnoMinutos,
    })
    .from(medicos)
    .leftJoin(sucursales, eq(medicos.sucursalId, sucursales.id))
    .where(and(eq(medicos.id, medicoId), isNull(medicos.deletedAt)))
    .limit(1);

  if (!medico) {
    return errorResponse('Médico no encontrado', 404);
  }
  if (medico.tenantId && medico.tenantId !== tenantId) {
    return errorResponse('Médico no encontrado', 404);
  }

  // ── Slot computation in the clinic timezone ──────────────────────────────
  const timezone = await resolveTenantTimezone(tenantId);

  let fechaHora: Date;
  try {
    fechaHora = zonedDateTimeToUtc(fecha, hora, timezone);
  } catch {
    return errorResponse('Fecha u hora inválida', 400);
  }

  const duracionMinutos =
    Number.isFinite(medico.duracionTurnoMinutos) && medico.duracionTurnoMinutos > 0
      ? medico.duracionTurnoMinutos
      : 30;
  const fechaHoraFin = new Date(fechaHora.getTime() + duracionMinutos * 60_000);

  // True overlap: an existing appointment blocks the new one when it starts
  // before it ends AND it ends after it starts. Using each row's own duration
  // catches appointments that began earlier but are still running.
  const conflicto = await db
    .select({ id: turnos.id })
    .from(turnos)
    .where(
      and(
        eq(turnos.medicoId, medicoId),
        isNull(turnos.deletedAt),
        notInArray(turnos.estado, ESTADOS_INACTIVOS),
        lt(turnos.fechaHora, fechaHoraFin),
        sql`${turnos.fechaHora} + make_interval(mins => ${turnos.duracionMinutos}) > ${fechaHora}`,
      ),
    )
    .limit(1);

  if (conflicto.length > 0) {
    return errorResponse('El horario no está disponible', 409);
  }

  const turnoTipo = tipoConsulta === 'telemedicina' ? 'telemedicina' : 'consulta';

  try {
    const [turno] = await db
      .insert(turnos)
      .values({
        pacienteId,
        medicoId,
        fechaHora,
        duracionMinutos,
        motivo: motivo || null,
        tipoConsulta: turnoTipo as 'consulta' | 'telemedicina',
        estado: 'pendiente' as const,
        sucursalId: paciente.sucursalId ?? medico.sucursalId ?? null,
      })
      .returning();

    return jsonResponse(turno, 201);
  } catch (e) {
    // The partial unique index on (medico_id, fecha_hora) turns a concurrent
    // double booking into error 23505.
    const code = (e as { code?: string } | null)?.code;
    if (code === '23505') {
      return errorResponse('El horario no está disponible', 409);
    }
    safeError('[PublicAPI] Error al crear turno:', e);
    return errorResponse('No se pudo crear el turno', 500);
  }
}

export const POST = publicApiHandler(handler, {
  scopes: [API_SCOPES.TURNOS_WRITE],
});

export { OPTIONS } from '@/lib/public-api-handler';
