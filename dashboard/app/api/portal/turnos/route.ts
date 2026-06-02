/**
 * GET /api/portal/turnos — Turnos del paciente autenticado
 * Protegido: requiere cookie portal_session
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal-auth';
import { db } from '@/lib/db';
import { turnos, medicos } from '@/drizzle/schema';
import { eq, desc, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50');

  const data = await db
    .select({
      id: turnos.id,
      fechaHora: turnos.fechaHora,
      hora: sql<string>`TO_CHAR(${turnos.fechaHora}, 'HH24:MI')`,
      estado: turnos.estado,
      motivo: turnos.motivo,
      tipoConsulta: turnos.tipoConsulta,
      duracionMinutos: turnos.duracionMinutos,
      notasPaciente: turnos.notasPaciente,
      medicoNombre: medicos.nombre,
      medicoEspecialidad: medicos.especialidad,
    })
    .from(turnos)
    .leftJoin(medicos, eq(turnos.medicoId, medicos.id))
    .where(eq(turnos.pacienteId, session.pacienteId))
    .orderBy(desc(turnos.fechaHora))
    .limit(limit);

  return NextResponse.json({ turnos: data });
}
