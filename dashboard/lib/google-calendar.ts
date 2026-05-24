/**
 * Google Calendar — Generador de enlaces para eventos de calendario.
 *
 * - `generateGCalUrl()`: Genera un link que abre Google Calendar con los datos del turno pre-cargados.
 * - Sin OAuth: funciona con cualquier cuenta de Google al hacer clic.
 * - El n8n workflow `workflow-08-google-calendar` puede usarse para auto-sync con OAuth.
 */

import { format, addMinutes } from 'date-fns';

// ─── Tipos ─────────────────────────────────────────────────

export interface GCalEventData {
  /** Título del evento (ej: "Turno: Juan Pérez") */
  text: string;
  /** Fecha y hora ISO del turno */
  fechaHora: string;
  /** Duración en minutos (default: 30) */
  duracionMinutos?: number;
  /** Nombre del médico */
  medico?: string;
  /** Motivo o tipo de consulta */
  motivo?: string | null;
  /** Ubicación física */
  ubicacion?: string;
}

// ─── Generar URL de Google Calendar ────────────────────────

/**
 * Genera una URL que abre Google Calendar con los datos del evento pre-cargados.
 *
 * Formato de fechas: YYYYMMDDTHHMMSS/YYYYMMDDTHHMMSS (UTC)
 *
 * Ejemplo de uso:
 * ```tsx
 * <a href={generateGCalUrl(turno)} target="_blank" rel="noopener noreferrer">
 *   Agregar a Google Calendar
 * </a>
 * ```
 */
export function generateGCalUrl(data: GCalEventData): string {
  const inicio = new Date(data.fechaHora);
  const fin = addMinutes(inicio, data.duracionMinutos ?? 30);

  const fmtGCal = (d: Date) =>
    d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const dates = `${fmtGCal(inicio)}/${fmtGCal(fin)}`;

  // Construir descripción
  const detalles = [
    data.motivo || 'Consulta médica',
    data.medico ? `Médico: ${data.medico}` : '',
    `Duración: ${data.duracionMinutos || 30} min`,
  ]
    .filter(Boolean)
    .join('\n');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: data.text,
    dates,
  });

  if (detalles) params.set('details', detalles);
  if (data.ubicacion) params.set('location', data.ubicacion);
  else params.set('location', 'Consultorio');

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// ─── Helper para crear el text del evento ──────────────────

/**
 * Formatea el texto para el evento de Google Calendar
 */
export function formatGCalEventText(paciente: string, tipo?: string): string {
  return tipo
    ? `Consulta: ${paciente} (${tipo})`
    : `Consulta: ${paciente}`;
}
