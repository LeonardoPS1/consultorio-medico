/**
 * Generador de archivos .ics (iCalendar) para adjuntar en WhatsApp.
 */

export interface IcsEventInput {
  uid: string;
  dtstart: Date;
  dtend: Date;
  summary: string;
  description?: string;
  location?: string;
  organizerName?: string;
}

/**
 * Genera el contenido textual de un archivo .ics
 * con zona horaria Santiago de Chile.
 */
export function generateIcs(event: IcsEventInput): string {
  const formatDt = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}T${hours}${minutes}${seconds}`;
  };

  const now = new Date();
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ConsultorioMedico//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Consultorio Médico',
    'BEGIN:VTIMEZONE',
    'TZID:America/Santiago',
    'BEGIN:STANDARD',
    'DTSTART:20240406T000000',
    'TZOFFSETFROM:-0300',
    'TZOFFSETTO:-0400',
    'TZNAME:CLT',
    'END:STANDARD',
    'BEGIN:DAYLIGHT',
    'DTSTART:20240907T000000',
    'TZOFFSETFROM:-0400',
    'TZOFFSETTO:-0300',
    'TZNAME:CLST',
    'END:DAYLIGHT',
    'END:VTIMEZONE',
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTART;TZID=America/Santiago:${formatDt(event.dtstart)}`,
    `DTEND;TZID=America/Santiago:${formatDt(event.dtend)}`,
    `SUMMARY:${escapeIcsText(event.summary)}`,
  ];

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
  }
  if (event.location) {
    lines.push(`LOCATION:${escapeIcsText(event.location)}`);
  }
  if (event.organizerName) {
    lines.push(`ORGANIZER;CN=${escapeIcsText(event.organizerName)}`);
  }

  lines.push(`DTSTAMP:${formatDt(now)}Z`);
  lines.push('END:VEVENT');
  lines.push('END:VCALENDAR');

  // iCalendar requiere \r\n como fin de línea
  return lines.join('\r\n') + '\r\n';
}

/**
 * Escapa caracteres especiales según RFC 5545.
 */
function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

// ─── Cliente: descarga directa de .ics ──────────────────────────

/**
 * Genera y descarga un archivo .ics para agregar un turno al calendario.
 * Función client-side (usa Blob/URL.createObjectURL).
 */
export function descargarICS(turno: {
  id: string;
  fechaHora: string;
  duracionMinutos: number;
  paciente?: string;
  medico?: string;
  motivo?: string | null;
  tipoConsulta?: string;
}) {
  const inicio = new Date(turno.fechaHora);
  const fin = new Date(inicio.getTime() + (turno.duracionMinutos || 30) * 60000);

  const formatICSDate = (d: Date) =>
    d
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '');

  const paciente = turno.paciente || 'Paciente';
  const medico = turno.medico || 'Médico';
  const descripcion = [
    turno.motivo || turno.tipoConsulta || 'Consulta médica',
    medico ? `Dr/a. ${medico}` : '',
  ]
    .filter(Boolean)
    .join(' | ');

  const uid = `${turno.id}@consultorio-medico`;

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Consultorio Medico//Turnos//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `DTSTART:${formatICSDate(inicio)}`,
    `DTEND:${formatICSDate(fin)}`,
    `UID:${uid}`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `SUMMARY:Turno: ${paciente}`,
    `DESCRIPTION:${descripcion}`,
    `LOCATION:Consultorio Médico`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `turno-${paciente.replace(/\s+/g, '-').toLowerCase()}-${inicio.toISOString().split('T')[0]}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
