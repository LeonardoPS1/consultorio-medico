/**
 * Genera y descarga un archivo .ics para agregar un turno al calendario.
 * Funciona con Google Calendar, Outlook, Apple Calendar, etc.
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
    d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const paciente = turno.paciente || 'Paciente';
  const medico = turno.medico || 'Médico';
  const descripcion = [
    turno.motivo || turno.tipoConsulta || 'Consulta médica',
    medico ? `Dr/a. ${medico}` : '',
  ].filter(Boolean).join(' | ');

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
