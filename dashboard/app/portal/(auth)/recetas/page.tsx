/**
 * Portal Recetas — Lista de recetas del paciente
 * Server component con DB directo (no self-fetch).
 */

import { eq, desc, sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { recetas, medicos } from '@/drizzle/schema';
import { db } from '@/lib/db';
import { getPortalSession } from '@/lib/portal-auth';
import PortalRecetasClient from './portal-recetas-client';

export const dynamic = 'force-dynamic';

/**
 *
 */
export default async function PortalRecetasPage() {
  const session = await getPortalSession();
  if (!session) redirect('/portal');

  const recetasData = await db
    .select({
      id: recetas.id,
      estado: recetas.estado,
      medicamento: recetas.medicamento,
      dosis: recetas.dosis,
      frecuencia: recetas.frecuencia,
      duracion: sql<string>`COALESCE(${recetas.duracion}, '')`,
      indicaciones: sql<string>`COALESCE(${recetas.indicaciones}, '')`,
      fechaInicio: sql<string>`COALESCE(${recetas.fechaInicio}::text, '')`,
      fechaFin: sql<string>`COALESCE(${recetas.fechaFin}::text, '')`,
      medicoNombre: sql<string>`COALESCE(${medicos.nombre}, '')`,
      medicoEspecialidad: sql<string>`COALESCE(${medicos.especialidad}, '')`,
    })
    .from(recetas)
    .leftJoin(medicos, eq(recetas.medicoId, medicos.id))
    .where(eq(recetas.pacienteId, session.pacienteId))
    .orderBy(desc(recetas.createdAt));

  const pacienteNombre = `${session.nombre} ${session.apellido}`.trim();

  return <PortalRecetasClient recetas={recetasData} pacienteNombre={pacienteNombre} />;
}
