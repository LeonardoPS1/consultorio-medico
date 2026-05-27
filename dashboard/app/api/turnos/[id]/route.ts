import { NextRequest } from 'next/server';
import { apiHandler, success, notFound } from '@/lib/api-handler';
import { parseBody } from '@/lib/validations';
import { updateTurnoSchema } from '@/lib/validations';
import { turnosService } from '@/lib/services/turnos';
import { sendSurveyWhatsApp } from '@/lib/encuestas';
import { buildGCalPayload, syncTurnoToGCal } from '@/lib/google-calendar-sync';
import { db } from '@/lib/db';
import { turnos, pacientes, medicos } from '@/drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';

/**
 * GET /api/turnos/[id] - Detalle individual de turno
 */
export const GET = apiHandler(async (_req: NextRequest, { params }) => {
  const [turno] = await db
    .select({
      id: turnos.id,
      fechaHora: turnos.fechaHora,
      estado: turnos.estado,
      motivo: turnos.motivo,
      tipoConsulta: turnos.tipoConsulta,
      duracionMinutos: turnos.duracionMinutos,
      pacienteId: turnos.pacienteId,
      medicoId: turnos.medicoId,
      googleCalendarEventId: turnos.googleCalendarEventId,
      fuente: turnos.fuente,
      canceladoPor: turnos.canceladoPor,
      motivoCancelacion: turnos.motivoCancelacion,
      createdAt: turnos.createdAt,
      updatedAt: turnos.updatedAt,
      pacienteNombre: pacientes.nombre,
      pacienteApellido: pacientes.apellido,
      pacienteTelefono: pacientes.telefono,
      medicoNombre: medicos.nombre,
      medicoEspecialidad: medicos.especialidad,
    })
    .from(turnos)
    .leftJoin(pacientes, eq(turnos.pacienteId, pacientes.id))
    .leftJoin(medicos, eq(turnos.medicoId, medicos.id))
    .where(and(eq(turnos.id, params.id), sql`${turnos.deletedAt} IS NULL`))
    .limit(1);

  if (!turno) notFound('Turno no encontrado');
  return success(turno);
});

/**
 * DELETE /api/turnos/[id] - Soft-delete de turno
 */
export const DELETE = apiHandler(async (_req: NextRequest, { params }) => {
  const [turno] = await db
    .select()
    .from(turnos)
    .where(and(eq(turnos.id, params.id), sql`${turnos.deletedAt} IS NULL`))
    .limit(1);

  if (!turno) notFound('Turno no encontrado');

  // Soft delete
  await db.update(turnos).set({ deletedAt: new Date() }).where(eq(turnos.id, params.id));

  // Google Calendar sync: eliminar evento (fire-and-forget)
  try {
    const pacienteNombre = turno.pacienteId
      ? (await db
          .select({ nombre: pacientes.nombre, apellido: pacientes.apellido })
          .from(pacientes).where(eq(pacientes.id, turno.pacienteId)).limit(1))
          .map(p => `${p.nombre} ${p.apellido}`.trim())[0] || 'Paciente'
      : 'Paciente';

    const medicoNombre = turno.medicoId
      ? (await db.select({ nombre: medicos.nombre }).from(medicos).where(eq(medicos.id, turno.medicoId)).limit(1))[0]?.nombre
      : undefined;

    const payload = buildGCalPayload({
      action: 'delete',
      turnoId: params.id,
      googleCalendarEventId: turno.googleCalendarEventId,
      fechaHora: turno.fechaHora instanceof Date
        ? turno.fechaHora.toISOString()
        : new Date(turno.fechaHora).toISOString(),
      duracionMinutos: turno.duracionMinutos || 30,
      pacienteNombre,
      medicoNombre,
    });
    syncTurnoToGCal(payload).catch(() => {});
  } catch {
    // No bloquear respuesta
  }

  return success({ deleted: true });
});

export const PATCH = apiHandler(async (request: NextRequest, { params }) => {
  const body = await parseBody(request, updateTurnoSchema);
  const turno = await turnosService.update(params.id, body);

  // Encuesta post-consulta
  if (body.estado === 'atendido') {
    sendSurveyWhatsApp(params.id).catch(() => {});
  }

  // Google Calendar sync (fire-and-forget)
  try {
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

    const gcalAction = body.estado === 'cancelada'
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
