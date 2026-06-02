/**
 * Portal Dashboard — Página dinámica con [telefono]
 * Server component: verifica sesión, obtiene datos completos y pasa al client.
 */

import { getPortalSession } from '@/lib/portal-auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { pacientes, turnos, recetas, medicos } from '@/drizzle/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { PortalDashboardClient } from './portal-dashboard-client';

export const dynamic = 'force-dynamic';

export default async function PortalDashboardPage({
  params,
}: {
  params: { telefono: string };
}) {
  const session = await getPortalSession();
  if (!session) {
    redirect('/portal');
  }

  // Validar que el telefono del URL coincida con la sesión
  const cleanParam = params.telefono.replace(/[\s\-()]/g, '');
  const cleanSession = session.telefono.replace(/[\s\-()]/g, '');
  if (cleanParam !== cleanSession) {
    redirect('/portal');
  }

  // Obtener datos completos del paciente
  const [paciente] = await db
    .select({
      id: pacientes.id,
      nombre: pacientes.nombre,
      apellido: pacientes.apellido,
      telefono: pacientes.telefono,
      email: pacientes.email,
      obraSocial: pacientes.obraSocial,
    })
    .from(pacientes)
    .where(eq(pacientes.id, session.pacienteId))
    .limit(1);

  if (!paciente) redirect('/portal');

  // Obtener turnos del paciente con nombre del médico
  const turnosData = await db
    .select({
      id: turnos.id,
      fechaHora: sql<string>`${turnos.fechaHora}::text`,
      hora: sql<string>`TO_CHAR(${turnos.fechaHora}, 'HH24:MI')`,
      estado: turnos.estado,
      tipoConsulta: turnos.tipoConsulta,
      motivo: turnos.motivo,
      medicoNombre: medicos.nombre,
      duracionMinutos: turnos.duracionMinutos,
    })
    .from(turnos)
    .leftJoin(medicos, eq(turnos.medicoId, medicos.id))
    .where(eq(turnos.pacienteId, session.pacienteId))
    .orderBy(desc(turnos.fechaHora));

  // Obtener recetas del paciente con nombre del médico
  const recetasData = await db
    .select({
      id: recetas.id,
      medicamento: recetas.medicamento,
      dosis: recetas.dosis,
      frecuencia: recetas.frecuencia,
      duracion: recetas.duracion,
      indicaciones: recetas.indicaciones,
      estado: recetas.estado,
      fechaInicio: recetas.fechaInicio,
      fechaFin: recetas.fechaFin,
      medicoNombre: medicos.nombre,
    })
    .from(recetas)
    .leftJoin(medicos, eq(recetas.medicoId, medicos.id))
    .where(eq(recetas.pacienteId, session.pacienteId))
    .orderBy(desc(recetas.fechaInicio));

  const portalData = {
    paciente,
    turnos: turnosData,
    recetas: recetasData,
    stats: {
      totalTurnos: turnosData.length,
      totalRecetas: recetasData.length,
    },
  };

  return <PortalDashboardClient data={portalData} />;
}
