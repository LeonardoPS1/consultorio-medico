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
      linkVideollamada: turnos.linkVideollamada,
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

/**
 * POST /api/portal/turnos — Crear turno desde el portal
 * Protegido: requiere cookie portal_session + validaciones.
 */
export async function POST(request: NextRequest) {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { medicoId, servicioId, fechaHora, motivo } = body;

    if (!medicoId || !servicioId || !fechaHora) {
      return NextResponse.json(
        { error: 'medicoId, servicioId y fechaHora son requeridos' },
        { status: 400 },
      );
    }

    const { crearTurnoPortal } = await import('@/lib/services/portal-booking');
    const turno = await crearTurnoPortal({
      pacienteId: session.pacienteId,
      medicoId,
      servicioId,
      fechaHora,
      motivo: motivo || null,
    });

    return NextResponse.json({ success: true, turno }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al crear turno';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
