/**
 * GET /api/portal/encuestas — Lista encuestas del paciente (portal)
 * Protegido: requiere cookie portal_session
 */

import { NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal-auth';
import { db } from '@/lib/db';
import { historialMedico, turnos, medicos } from '@/drizzle/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function GET() {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const list = await db
    .select({
      id: historialMedico.id,
      titulo: historialMedico.titulo,
      descripcion: historialMedico.descripcion,
      createdAt: historialMedico.createdAt,
      archivos: historialMedico.archivos,
      turnoId: historialMedico.turnoId,
      medicoNombre: medicos.nombre,
    })
    .from(historialMedico)
    .leftJoin(turnos, eq(historialMedico.turnoId, turnos.id))
    .leftJoin(medicos, eq(turnos.medicoId, medicos.id))
    .where(
      and(
        eq(historialMedico.pacienteId, session.pacienteId),
        eq(historialMedico.tipo, 'encuesta'),
      ),
    )
    .orderBy(desc(historialMedico.createdAt));

  return NextResponse.json(list);
}