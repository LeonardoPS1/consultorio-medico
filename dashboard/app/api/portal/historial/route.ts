/**
 * GET /api/portal/historial — Historial médico del paciente
 * Protegido: requiere cookie portal_session
 */

import { NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal-auth';
import { db } from '@/lib/db';
import { historialMedico, medicos } from '@/drizzle/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET() {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const data = await db
    .select({
      id: historialMedico.id,
      tipo: historialMedico.tipo,
      titulo: historialMedico.titulo,
      descripcion: historialMedico.descripcion,
      diagnosticoCodigo: historialMedico.diagnosticoCodigo,
      diagnosticoDescripcion: historialMedico.diagnosticoDescripcion,
      visibleParaPaciente: historialMedico.visibleParaPaciente,
      createdAt: historialMedico.createdAt,
      medicoNombre: medicos.nombre,
    })
    .from(historialMedico)
    .leftJoin(medicos, eq(historialMedico.medicoId, medicos.id))
    .where(eq(historialMedico.pacienteId, session.pacienteId))
    .orderBy(desc(historialMedico.createdAt));

  // Filtrar solo lo visible para el paciente
  const visible = data.filter((h) => h.visibleParaPaciente !== false);

  return NextResponse.json({ historial: visible });
}
