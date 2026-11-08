/**
 * Utilidades de fecha con zona horaria.
 *
 * El sistema almacena `fechaHora` en UTC, pero la percepción del consultorio
 * es hora local (America/Santiago). Estas funciones permiten calcular los
 * límites de un día calendario en una zona específica y expresarlos como
 * instantes UTC (Date) para usar en consultas a la base de datos.
 */

export const DEFAULT_CLINIC_TZ = 'America/Santiago';

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(tz: string): Intl.DateTimeFormat {
  let fmt = formatterCache.get(tz);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    formatterCache.set(tz, fmt);
  }
  return fmt;
}

/**
 * Devuelve 'YYYY-MM-DD' (día calendario) de `date` en la zona `tz`.
 * @param date
 * @param tz
 */
export function zonedDateStr(date: Date, tz: string = DEFAULT_CLINIC_TZ): string {
  return getFormatter(tz).format(date);
}

const offsetFormatterCache = new Map<string, Intl.DateTimeFormat>();

function getOffsetFormatter(tz: string): Intl.DateTimeFormat {
  let fmt = offsetFormatterCache.get(tz);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    offsetFormatterCache.set(tz, fmt);
  }
  return fmt;
}

function tzOffsetMs(date: Date, tz: string): number {
  const parts = getOffsetFormatter(tz).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? '0');
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  );
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/**
 * Convierte una fecha y hora de pared (`YYYY-MM-DD` + `HH:mm`) interpretadas en
 * la zona `tz` al instante UTC equivalente.
 *
 * Se usa para agendar turnos: la hora que elige el usuario es hora de la clínica,
 * no del servidor. Se recalcula el offset una segunda vez para resolver los
 * cambios de horario de verano.
 * @param dateStr Fecha local en formato `YYYY-MM-DD`
 * @param timeStr Hora local en formato `HH:mm`
 * @param tz Zona horaria IANA de la clínica
 */
export function zonedDateTimeToUtc(
  dateStr: string,
  timeStr: string,
  tz: string = DEFAULT_CLINIC_TZ,
): Date {
  const hhmm = timeStr.length === 5 ? timeStr : timeStr.padStart(5, '0');
  const naive = Date.parse(`${dateStr}T${hhmm}:00Z`);
  if (Number.isNaN(naive)) {
    throw new Error(`Fecha u hora inválida: ${dateStr} ${timeStr}`);
  }

  let safeTz = tz;
  try {
    getOffsetFormatter(tz);
  } catch {
    safeTz = DEFAULT_CLINIC_TZ;
  }

  const firstGuess = naive - tzOffsetMs(new Date(naive), safeTz);
  const refined = naive - tzOffsetMs(new Date(firstGuess), safeTz);
  return new Date(refined);
}

/**
 * Calcula el inicio y el fin (instantes UTC) del día calendario local de
 * `date` en la zona `tz`. Maneja cambios de DST buscando el instante exacto
 * donde cambia la fecha local.
 * @param date
 * @param tz
 */
export function getZonedDayRange(
  date: Date,
  tz: string = DEFAULT_CLINIC_TZ,
): { start: Date; end: Date } {
  let fmt: Intl.DateTimeFormat;
  try {
    fmt = getFormatter(tz);
  } catch {
    fmt = getFormatter(DEFAULT_CLINIC_TZ);
  }

  const todayStr = fmt.format(date);
  const naive = Date.parse(`${todayStr}T00:00:00Z`);

  let startMs = naive;
  for (let t = naive - 16 * 3600_000; t <= naive + 16 * 3600_000; t += 3600_000) {
    if (fmt.format(new Date(t)) === todayStr) {
      startMs = t;
      break;
    }
  }
  while (fmt.format(new Date(startMs - 60_000)) === todayStr) startMs -= 60_000;

  let endMs = startMs + 24 * 3600_000;
  while (fmt.format(new Date(endMs)) === todayStr) endMs += 60_000;
  while (fmt.format(new Date(endMs - 60_000)) !== todayStr) endMs -= 60_000;

  return { start: new Date(startMs), end: new Date(endMs) };
}
