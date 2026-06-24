/**
 * Portal Dashboard — Vista principal del paciente
 * Server component: verifica sesión, obtiene datos completos,
 * incluyendo turnos con médico, recetas e historial.
 * Todo en un solo page con tabs en el client.
 */

import { getPortalSession } from '@/lib/portal-auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { pacientes, turnos, recetas, historialMedico, medicos } from '@/drizzle/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import PortalDashboardClient from './portal-dashboard-client';

export const dynamic = 'force-dynamic';

export default async function PortalDashboardPage() {
  const session = await getPortalSession();
  if (!session) redirect('/portal');

  // 1. Datos del paciente (con campos chilenos)
  const [paciente] = await db
    .select({
      id: pacientes.id,
      nombre: pacientes.nombre,
      apellido: pacientes.apellido,
      telefono: pacientes.telefono,
      email: pacientes.email,
      rut: pacientes.rut,
      sistemaSalud: pacientes.sistemaSalud,
      region: pacientes.region,
      comuna: pacientes.comuna,
      direccion: pacientes.direccion,
    })
    .from(pacientes)
    .where(eq(pacientes.id, session.pacienteId))
    .limit(1);

  if (!paciente) redirect('/portal');

  // 2. Turnos con nombre del médico
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

  // 3. Recetas con nombre del médico
  const recetasData = await db
    .select({
      id: recetas.id,
      medicamento: recetas.medicamento,
      dosis: recetas.dosis,
      frecuencia: recetas.frecuencia,
      duracion: recetas.duracion,
      indicaciones: recetas.indicaciones,
      estado: recetas.estado,
      fechaInicio: sql<string>`${recetas.fechaInicio}::text`,
      fechaFin: sql<string | null>`${recetas.fechaFin}::text`,
      medicoNombre: medicos.nombre,
    })
    .from(recetas)
    .leftJoin(medicos, eq(recetas.medicoId, medicos.id))
    .where(eq(recetas.pacienteId, session.pacienteId))
    .orderBy(desc(recetas.fechaInicio));

  // 4. Historial médico (solo visible para paciente)
  const historialData = await db
    .select({
      id: historialMedico.id,
      titulo: historialMedico.titulo,
      descripcion: historialMedico.descripcion,
      tipo: historialMedico.tipo,
      createdAt: sql<string>`${historialMedico.createdAt}::text`,
    })
    .from(historialMedico)
    .where(
      sql`${historialMedico.pacienteId} = ${session.pacienteId} AND ${historialMedico.visibleParaPaciente} = true`,
    )
    .orderBy(desc(historialMedico.createdAt));

  // 5. Turnos atendidos sin encuesta (para Calificá tu atención)
  const turnosSinEncuesta = await db
    .select({
      id: turnos.id,
      fechaHora: sql<string>`${turnos.fechaHora}::text`,
      hora: sql<string>`TO_CHAR(${turnos.fechaHora}, 'HH24:MI')`,
      medicoNombre: medicos.nombre,
    })
    .from(turnos)
    .leftJoin(medicos, eq(turnos.medicoId, medicos.id))
    .leftJoin(
      historialMedico,
      and(eq(historialMedico.turnoId, turnos.id), eq(historialMedico.tipo, 'encuesta')),
    )
    .where(
      and(
        eq(turnos.pacienteId, session.pacienteId),
        eq(turnos.estado, 'atendido'),
        sql`${turnos.deletedAt} IS NULL`,
        sql`${historialMedico.id} IS NULL`,
      ),
    )
    .orderBy(desc(turnos.fechaHora))
    .limit(5);

  return (
    <PortalDashboardClient
      paciente={paciente}
      turnos={turnosData}
      recetas={recetasData}
      historial={historialData}
      turnosSinEncuesta={turnosSinEncuesta}
    />
  );
}
