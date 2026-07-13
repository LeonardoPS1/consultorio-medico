/**
 * GET /api/portal/turnos/[id]/ics — Genera archivo .ics para agregar al calendario
 * Protegido: requiere cookie portal_session
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal-auth';
import { db } from '@/lib/db';
import { turnos, medicos, pacientes } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { generateIcs } from '@/lib/ics';

export async function GET(_request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const { id } = await paramsPromise;
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const turnoId = id;

  const [turno] = await db
    .select({
      id: turnos.id,
      fechaHora: turnos.fechaHora,
      duracionMinutos: turnos.duracionMinutos,
      motivo: turnos.motivo,
      medicoNombre: medicos.nombre,
      medicoEspecialidad: medicos.especialidad,
      pacienteNombre: pacientes.nombre,
    })
    .from(turnos)
    .leftJoin(medicos, eq(turnos.medicoId, medicos.id))
    .leftJoin(pacientes, eq(turnos.pacienteId, pacientes.id))
    .where(and(eq(turnos.id, turnoId), eq(turnos.pacienteId, session.pacienteId)))
    .limit(1);

  if (!turno) {
    return NextResponse.json({ error: 'Turno no encontrado' }, { status: 404 });
  }

  const dtstart = new Date(turno.fechaHora);
  const dtend = new Date(dtstart.getTime() + (turno.duracionMinutos || 30) * 60 * 1000);

  const icsContent = generateIcs({
    uid: `turno-${turno.id}@consultorio`,
    dtstart,
    dtend,
    summary: `Consulta - ${turno.medicoNombre} (${turno.medicoEspecialidad})`,
    description: turno.motivo
      ? `Motivo: ${turno.motivo}\nPaciente: ${turno.pacienteNombre}`
      : `Consulta con ${turno.medicoNombre} - ${turno.pacienteNombre}`,
    location: 'Consultorio Médico',
    organizerName: turno.medicoNombre ?? undefined,
  });

  return new NextResponse(icsContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="consulta-${turno.id}.ics"`,
      'Cache-Control': 'no-cache',
    },
  });
}
