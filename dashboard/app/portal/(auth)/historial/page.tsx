/**
 * Portal Historial — Historial médico del paciente
 * Server component con DB directo (no self-fetch).
 */

import { getPortalSession } from '@/lib/portal-auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { historialMedico, medicos } from '@/drizzle/schema';
import { eq, desc, sql } from 'drizzle-orm';
import PortalHistorialClient from './portal-historial-client';

export const dynamic = 'force-dynamic';

interface HistorialEntry {
  id: string;
  tipo: string;
  titulo: string;
  descripcion: string;
  diagnosticoCodigo: string | null;
  diagnosticoDescripcion: string | null;
  createdAt: string;
  medicoNombre: string;
}

export default async function PortalHistorialPage() {
  const session = await getPortalSession();
  if (!session) redirect('/portal');

  const data = await db
    .select({
      id: historialMedico.id,
      tipo: historialMedico.tipo,
      titulo: historialMedico.titulo,
      descripcion: sql<string>`COALESCE(${historialMedico.descripcion}, '')`,
      diagnosticoCodigo: historialMedico.diagnosticoCodigo,
      diagnosticoDescripcion: historialMedico.diagnosticoDescripcion,
      visibleParaPaciente: historialMedico.visibleParaPaciente,
      createdAt: sql<string>`${historialMedico.createdAt}::text`,
      medicoNombre: sql<string>`COALESCE(${medicos.nombre}, '')`,
    })
    .from(historialMedico)
    .leftJoin(medicos, eq(historialMedico.medicoId, medicos.id))
    .where(eq(historialMedico.pacienteId, session.pacienteId))
    .orderBy(desc(historialMedico.createdAt));

  const visible = data
    .filter((h) => h.visibleParaPaciente !== false)
    .map((h) => ({
      ...h,
      diagnosticoCodigo: h.diagnosticoCodigo ?? undefined,
      diagnosticoDescripcion: h.diagnosticoDescripcion ?? undefined,
    }));

  return <PortalHistorialClient historial={visible} />;
}
