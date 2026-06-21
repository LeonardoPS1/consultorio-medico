/**
 * GET /api/portal/recetas — Recetas del paciente autenticado
 * Protegido: requiere cookie portal_session
 */

import { NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal-auth';
import { db } from '@/lib/db';
import { recetas, medicos } from '@/drizzle/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET() {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const data = await db
    .select({
      id: recetas.id,
      estado: recetas.estado,
      medicamento: recetas.medicamento,
      dosis: recetas.dosis,
      frecuencia: recetas.frecuencia,
      duracion: recetas.duracion,
      indicaciones: recetas.indicaciones,
      fechaInicio: recetas.fechaInicio,
      fechaFin: recetas.fechaFin,
      medicoNombre: medicos.nombre,
      medicoEspecialidad: medicos.especialidad,
      hashVerificacion: recetas.hashVerificacion,
    })
    .from(recetas)
    .leftJoin(medicos, eq(recetas.medicoId, medicos.id))
    .where(eq(recetas.pacienteId, session.pacienteId))
    .orderBy(desc(recetas.createdAt));

  return NextResponse.json({ recetas: data });
}
