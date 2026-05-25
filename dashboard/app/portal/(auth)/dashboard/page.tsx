/**
 * Portal Dashboard — Vista principal del paciente
 * Server component: verifica sesión, obtiene datos, muestra KPIs.
 */

import { getPortalSession } from '@/lib/portal-auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { turnos, recetas } from '@/drizzle/schema';
import { eq, sql, desc } from 'drizzle-orm';
import PortalDashboardClient from './portal-dashboard-client';

export default async function PortalDashboardPage() {
  const session = await getPortalSession();
  if (!session) redirect('/portal');

  // Stats
  const [turnosCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(turnos)
    .where(eq(turnos.pacienteId, session.pacienteId));

  const [proximos] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(turnos)
    .where(
      sql`${turnos.pacienteId} = ${session.pacienteId} AND ${turnos.estado} IN ('pendiente', 'confirmada')`,
    );

  const [recetasCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(recetas)
    .where(eq(recetas.pacienteId, session.pacienteId));

  const [ultimoTurno] = await db
    .select({ fechaHora: turnos.fechaHora, estado: turnos.estado })
    .from(turnos)
    .where(eq(turnos.pacienteId, session.pacienteId))
    .orderBy(desc(turnos.fechaHora))
    .limit(1);

  return (
    <PortalDashboardClient
      paciente={session}
      stats={{
        totalTurnos: turnosCount?.count || 0,
        proximosTurnos: proximos?.count || 0,
        totalRecetas: recetasCount?.count || 0,
      }}
      ultimoTurno={ultimoTurno || null}
    />
  );
}
