/**
 * GET /api/portal/certificados — Lista certificados del paciente (portal)
 * Protegido: requiere cookie portal_session
 * Filtra solo visibleParaPaciente = true y tipo = 'certificado'
 */

import { NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal-auth';
import { db } from '@/lib/db';
import { historialMedico, medicos } from '@/drizzle/schema';
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
      tipo: historialMedico.tipo,
      createdAt: historialMedico.createdAt,
      hashVerificacion: historialMedico.hashVerificacion,
      medicoNombre: medicos.nombre,
    })
    .from(historialMedico)
    .leftJoin(medicos, eq(historialMedico.medicoId, medicos.id))
    .where(
      and(
        eq(historialMedico.pacienteId, session.pacienteId),
        eq(historialMedico.tipo, 'certificado'),
        eq(historialMedico.visibleParaPaciente, true),
      ),
    )
    .orderBy(desc(historialMedico.createdAt));

  return NextResponse.json(list);
}
