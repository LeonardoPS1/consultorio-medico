import { NextRequest } from 'next/server';
import { apiHandler, success } from '@/lib/api-handler';
import { parseBody } from '@/lib/validations';
import { updateTurnoSchema } from '@/lib/validations';
import { turnosService } from '@/lib/services/turnos';
import { sendSurveyWhatsApp } from '@/lib/encuestas';
import { buildGCalPayload } from '@/lib/google-calendar-sync';

export const PATCH = apiHandler(async (request: NextRequest, { params }) => {
  const body = await parseBody(request, updateTurnoSchema);
  const turno = await turnosService.update(params.id, body);

  // Encuesta post-consulta
  if (body.estado === 'atendido') {
    sendSurveyWhatsApp(params.id).catch(() => {});
  }

  // Google Calendar sync (fire-and-forget)
  try {
    const { syncTurnoToGCal } = await import('@/lib/google-calendar-sync');
    const { db } = await import('@/lib/db');
    const { pacientes, medicos } = await import('@/drizzle/schema');
    const { eq, and, sql } = await import('drizzle-orm');

    const [paciente] = await db
      .select({ nombre: pacientes.nombre, apellido: pacientes.apellido, telefono: pacientes.telefono })
      .from(pacientes)
      .where(and(eq(pacientes.id, turno.pacienteId), sql`${pacientes.deletedAt} IS NULL`))
      .limit(1);

    const [medico] = await db
      .select({ nombre: medicos.nombre })
      .from(medicos)
      .where(and(eq(medicos.id, turno.medicoId), sql`${medicos.deletedAt} IS NULL`))
      .limit(1);

    const pacienteNombre = paciente ? `${paciente.nombre} ${paciente.apellido}`.trim() : 'Paciente';
    const fechaHora = turno.fechaHora instanceof Date
      ? turno.fechaHora.toISOString()
      : new Date(turno.fechaHora).toISOString();

    let gcalAction = body.estado === 'cancelada'
      ? 'delete' as const
      : 'update' as const;

    const payload = buildGCalPayload({
      action: gcalAction,
      turnoId: params.id,
      googleCalendarEventId: turno.googleCalendarEventId,
      fechaHora,
      duracionMinutos: turno.duracionMinutos || 30,
      pacienteNombre,
      pacienteTelefono: paciente?.telefono,
      medicoNombre: medico?.nombre,
      motivo: body.motivo || turno.motivo,
    });
    syncTurnoToGCal(payload).catch(() => {});
  } catch {
    // No bloquear la respuesta
  }

  return success(turno);
});
