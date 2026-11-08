/**
 * Helpers for calendar dates that must not shift across timezones.
 *
 * Convention used in this project:
 * - `timestamp with time zone` columns (e.g. `turnos.fecha_hora`) travel as ISO
 *   strings and are converted to the local zone for display.
 * - `date` columns (e.g. `recetas.fecha_inicio`) travel as `YYYY-MM-DD` and must
 *   be formatted as calendar dates, never through `new Date(string)`, because
 *   that parses them as UTC midnight and renders the previous day in Chile.
 */

/** Matches a date-only value (`YYYY-MM-DD`). */
const FECHA_CALENDARIO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Parses a `YYYY-MM-DD` string into a Date at local midnight.
 * @param valor Calendar date string
 * @returns {Date | null} Date at local midnight, or null when the value is malformed
 */
export function parseFechaCalendario(valor: string): Date | null {
  const match = FECHA_CALENDARIO_RE.exec(valor.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

/**
 * Formats a calendar date (`YYYY-MM-DD`) without timezone conversion.
 * Values that are not date-only fall back to the regular Date parser so that
 * timestamps keep their expected behavior.
 * @param valor Date-only string (or ISO timestamp)
 * @param options Intl date formatting options
 * @param locale Locale for formatting
 * @returns {string} Human readable date, or an em dash when empty
 */
export function formatFechaCalendario(
  valor: string | null | undefined,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' },
  locale = 'es-CL',
): string {
  if (!valor) return '—';
  const calendario = parseFechaCalendario(valor);
  if (calendario) return calendario.toLocaleDateString(locale, options);
  const parsed = new Date(valor);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString(locale, options);
}
