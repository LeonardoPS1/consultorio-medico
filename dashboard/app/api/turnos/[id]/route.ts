import { NextRequest } from 'next/server';
import { apiHandler, success, notFound, fail } from '@/lib/api-handler';
import { parseBody, updateTurnoSchema } from '@/lib/validations';
import { turnosService } from '@/lib/services/turnos';
import { sendSurveyWhatsApp } from '@/lib/encuestas';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { turnos, pacientes, medicos } from '@/drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';

/**
 * GET /api/turnos/[id] - Detalle individual de turno
 */
export const GET = apiHandler(async (_req: NextRequest, { params }) => {
  const session = await auth();
  const sessionMedicoId = (session?.user as any)?.medicoId;
  const sessionRol = (session?.user as any)?.role;

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
    .where(and(
      eq(turnos.id, params.id),
      sessionRol !== 'admin' && sessionMedicoId ? eq(turnos.medicoId, sessionMedicoId) : undefined,
      sql`${turnos.deletedAt} IS NULL`,
    ))
    .limit(1);

  if (!turno) notFound('Turno no encontrado');
  return success(turno);
});

/**
 * DELETE /api/turnos/[id] - Soft-delete de turno con sync GCal
 */
export const DELETE = apiHandler(async (_req: NextRequest, { params }) => {
  const session = await auth();
  const sessionMedicoId = (session?.user as any)?.medicoId;
  const sessionRol = (session?.user as any)?.role;

  // Verificar que el turno pertenece al médico (o es admin)
  const [turno] = await db
    .select({ id: turnos.id, medicoId: turnos.medicoId })
    .from(turnos)
    .where(eq(turnos.id, params.id))
    .limit(1);

  if (!turno) notFound('Turno no encontrado');
  if (sessionRol !== 'admin' && sessionRol !== 'secretaria' && turno.medicoId !== sessionMedicoId) {
    fail('No autorizado');
  }

  const result = await turnosService.delete(params.id);
  return success(result);
});

export const PATCH = apiHandler(async (request: NextRequest, { params }) => {
  const session = await auth();
  const sessionMedicoId = (session?.user as any)?.medicoId;
  const sessionRol = (session?.user as any)?.role;

  // Verificar que el turno pertenece al médico (o es admin)
  const [turno] = await db
    .select({ id: turnos.id, medicoId: turnos.medicoId })
    .from(turnos)
    .where(eq(turnos.id, params.id))
    .limit(1);

  if (!turno) notFound('Turno no encontrado');
  if (sessionRol !== 'admin' && sessionRol !== 'secretaria' && turno.medicoId !== sessionMedicoId) {
    fail('No autorizado');
  }

  const body = await parseBody(request, updateTurnoSchema);
  // Si se quiere skip de la auto-asignación de lista de espera, pasarlo al servicio
  const updated = await turnosService.update(params.id, body);

  // Encuesta post-consulta
  if (body.estado === 'atendido') {
    sendSurveyWhatsApp(params.id).catch(() => {});
  }

// El sync a Google Calendar ahora lo maneja turnosService.update()

  return success(updated);
});
