/**
 * Portal Turnos — Lista de turnos del paciente
 * Server component con DB directo (no self-fetch).
 */

import { getPortalSession } from '@/lib/portal-auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { turnos, medicos } from '@/drizzle/schema';
import { eq, desc, sql } from 'drizzle-orm';
import PortalTurnosClient from './portal-turnos-client';

export const dynamic = 'force-dynamic';

interface Turno {
  id: string;
  fechaHora: string;
  hora: string;
  estado: string;
  motivo?: string;
  tipoConsulta: string;
  duracionMinutos: number;
  linkVideollamada?: string;
  medicoNombre: string;
  medicoEspecialidad: string;
  pagado: boolean;
}

export default async function PortalTurnosPage() {
  const session = await getPortalSession();
  if (!session) redirect('/portal');

  const turnosData = await db
    .select({
      id: turnos.id,
      fechaHora: sql<string>`${turnos.fechaHora}::text`,
      hora: sql<string>`TO_CHAR(${turnos.fechaHora}, 'HH24:MI')`,
      estado: turnos.estado,
      motivo: turnos.motivo,
      tipoConsulta: turnos.tipoConsulta,
      duracionMinutos: turnos.duracionMinutos,
      linkVideollamada: turnos.linkVideollamada,
      medicoNombre: sql<string>`COALESCE(${medicos.nombre}, '')`,
      medicoEspecialidad: sql<string>`COALESCE(${medicos.especialidad}, '')`,
      pagado: turnos.pagado,
    })
    .from(turnos)
    .leftJoin(medicos, eq(turnos.medicoId, medicos.id))
    .where(eq(turnos.pacienteId, session.pacienteId))
    .orderBy(desc(turnos.fechaHora))
    .limit(50);

  return <PortalTurnosClient
    turnos={turnosData.map((t) => ({
      ...t,
      motivo: t.motivo ?? undefined,
      linkVideollamada: t.linkVideollamada ?? undefined,
    }))}
  />;
}
