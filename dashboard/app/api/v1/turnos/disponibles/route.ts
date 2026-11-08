import { and, eq, inArray, isNull, lt, notInArray, or, sql } from 'drizzle-orm';
import { horariosAtencion, medicos, sucursales, turnos } from '@/drizzle/schema';
import { db } from '@/lib/db';
import { API_SCOPES } from '@/lib/public-api-auth';
import {
  publicApiHandler,
  jsonResponse,
  errorResponse,
  type AuthenticatedRequest,
} from '@/lib/public-api-handler';
import { resolveTenantTimezone } from '@/lib/tenant-time';
import { zonedDateTimeToUtc } from '@/lib/zoned-time';

/** Appointment states that do not occupy a slot. */
const ESTADOS_INACTIVOS: Array<typeof turnos.$inferSelect.estado> = ['cancelada', 'no_asistio'];

/** Default appointment length when the doctor has no explicit duration. */
const DURACION_DEFAULT_MIN = 30;

/** Day names as stored in `horarios_atencion.dia`. */
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

/** `YYYY-MM-DD`. */
const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

/** UUID v4-ish shape check, enough to reject junk before hitting the DB. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Returns the weekday name for a calendar date without depending on the
 * server timezone.
 * @param fecha Date in `YYYY-MM-DD` format
 */
function diaSemana(fecha: string): string {
  const [y, m, d] = fecha.split('-').map(Number);
  return DIAS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

/**
 * Parses `HH:mm` or `HH:mm:ss` into minutes since midnight.
 * @param time Time string from `horarios_atencion`
 * @returns Minutes since midnight, or null when the value is malformed
 */
function minutosDelDia(time: string | null): number | null {
  if (!time) return null;
  const parts = time.split(':').map(Number);
  if (parts.length < 2 || parts.some(Number.isNaN)) return null;
  const [h, min] = parts;
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/**
 * Formats minutes since midnight as `HH:mm`.
 * @param minutos Minutes since midnight
 */
function formatearHora(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Lists available appointment slots for a date.
 *
 * Slots are generated from the branch opening hours using the doctor's real
 * appointment length, interpreted in the tenant's timezone, and filtered
 * against every overlapping appointment (not just exact start times).
 * @param request
 */
async function handler(request: AuthenticatedRequest) {
  const tenantId = request.tenantId;
  const params = request.nextUrl.searchParams;

  const fecha = params.get('fecha');
  if (!fecha || !FECHA_RE.test(fecha)) {
    return errorResponse('fecha es obligatoria (formato YYYY-MM-DD)', 400);
  }

  const medicoId = params.get('medicoId');
  const sucursalId = params.get('sucursalId');

  if (medicoId && !UUID_RE.test(medicoId)) {
    return errorResponse('medicoId inválido', 400);
  }
  if (sucursalId && !UUID_RE.test(sucursalId)) {
    return errorResponse('sucursalId inválido', 400);
  }

  const timezone = await resolveTenantTimezone(tenantId);

  // ── Doctor scope ──────────────────────────────────────────────────────────
  let duracionMinutos = DURACION_DEFAULT_MIN;
  let sucursalObjetivo = sucursalId ?? null;

  if (medicoId) {
    const [medico] = await db
      .select({
        id: medicos.id,
        sucursalId: medicos.sucursalId,
        duracionTurnoMinutos: medicos.duracionTurnoMinutos,
        tenantId: sucursales.tenantId,
      })
      .from(medicos)
      .leftJoin(sucursales, eq(medicos.sucursalId, sucursales.id))
      .where(and(eq(medicos.id, medicoId), isNull(medicos.deletedAt)))
      .limit(1);

    // A doctor from another tenant is reported as missing.
    if (!medico || (medico.tenantId && medico.tenantId !== tenantId)) {
      return errorResponse('Médico no encontrado', 404);
    }

    if (medico.duracionTurnoMinutos && medico.duracionTurnoMinutos > 0) {
      duracionMinutos = medico.duracionTurnoMinutos;
    }
    sucursalObjetivo = sucursalObjetivo ?? medico.sucursalId ?? null;
  }

  // ── Opening hours for that weekday ────────────────────────────────────────
  const dia = diaSemana(fecha);
  const condiciones = [
    inArray(horariosAtencion.dia, [dia, dia.toLowerCase()]),
    eq(horariosAtencion.activo, true),
    or(eq(horariosAtencion.tenantId, tenantId), eq(sucursales.tenantId, tenantId)) ?? sql`false`,
  ];

  if (sucursalObjetivo) {
    condiciones.push(eq(horariosAtencion.sucursalId, sucursalObjetivo));
  }

  const horarios = await db
    .select({
      inicio: horariosAtencion.inicio,
      fin: horariosAtencion.fin,
      inicio2: horariosAtencion.inicio2,
      fin2: horariosAtencion.fin2,
      sucursalId: horariosAtencion.sucursalId,
      tipo: horariosAtencion.tipo,
    })
    .from(horariosAtencion)
    .leftJoin(sucursales, eq(horariosAtencion.sucursalId, sucursales.id))
    .where(and(...condiciones));

  if (horarios.length === 0) {
    return jsonResponse([]);
  }

  // ── Occupied intervals for the day ────────────────────────────────────────
  const dayStart = zonedDateTimeToUtc(fecha, '00:00', timezone);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const ocupadosCond = [
    lt(turnos.fechaHora, new Date(dayEnd.getTime() + 24 * 60 * 60 * 1000)),
    sql`${turnos.fechaHora} + make_interval(mins => ${turnos.duracionMinutos}) > ${dayStart}`,
    isNull(turnos.deletedAt),
    notInArray(turnos.estado, ESTADOS_INACTIVOS),
  ];
  if (medicoId) {
    ocupadosCond.push(eq(turnos.medicoId, medicoId));
  }

  const ocupados = await db
    .select({ fechaHora: turnos.fechaHora, duracionMinutos: turnos.duracionMinutos })
    .from(turnos)
    .where(and(...ocupadosCond));

  const intervalos = ocupados.map((t) => ({
    inicio: t.fechaHora.getTime(),
    fin: t.fechaHora.getTime() + (t.duracionMinutos ?? DURACION_DEFAULT_MIN) * 60_000,
  }));

  const ahora = Date.now();
  const disponibles: Array<{
    fecha: string;
    hora: string;
    horaFin: string;
    duracionMinutos: number;
    sucursalId: string | null;
    medicoId: string | null;
    tipo: string | null;
  }> = [];

  for (const horario of horarios) {
    const bloques: Array<[string | null, string | null]> = [
      [horario.inicio, horario.fin],
      [horario.inicio2, horario.fin2],
    ];

    for (const [inicio, fin] of bloques) {
      const desde = minutosDelDia(inicio);
      const hasta = minutosDelDia(fin);
      if (desde === null || hasta === null || hasta <= desde) continue;

      for (let min = desde; min + duracionMinutos <= hasta; min += duracionMinutos) {
        const horaStr = formatearHora(min);
        let inicioSlot: Date;
        try {
          inicioSlot = zonedDateTimeToUtc(fecha, horaStr, timezone);
        } catch {
          continue;
        }

        const ini = inicioSlot.getTime();
        const finSlot = ini + duracionMinutos * 60_000;
        if (ini < ahora) continue;

        const solapa = intervalos.some((i) => i.inicio < finSlot && i.fin > ini);
        if (solapa) continue;

        disponibles.push({
          fecha,
          hora: horaStr,
          horaFin: formatearHora(min + duracionMinutos),
          duracionMinutos,
          sucursalId: horario.sucursalId,
          medicoId: medicoId ?? null,
          tipo: horario.tipo,
        });
      }
    }
  }

  return jsonResponse(disponibles);
}

export const GET = publicApiHandler(handler, {
  scopes: [API_SCOPES.TURNOS_READ],
});

export { OPTIONS } from '@/lib/public-api-handler';
