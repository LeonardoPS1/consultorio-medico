/**
 * GET /api/portal/reportes — Estadísticas personales del paciente
 * Protegido: requiere cookie portal_session
 *
 * Returns:
 * - totalVisitas: número total de visitas
 * - visitasEsteMes: visitas en el mes actual
 * - visitasPorTipo: desglose por tipo de consulta
 * - visitasPorMes: últimos 12 meses
 * - totalGastado: suma de precios de turnos pagados
 * - recetasActivas: recetas activas actualmente
 * - ultimaVisita: fecha de la última visita
 */

import { NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal-auth';
import { db } from '@/lib/db';
import { turnos, recetas, medicos } from '@/drizzle/schema';
import { eq, and, desc, sql, count } from 'drizzle-orm';

export async function GET() {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const pacienteId = session.pacienteId;

  // Total visitas (turnos atendidos)
  const [totalData] = await db
    .select({ value: count() })
    .from(turnos)
    .where(
      and(
        eq(turnos.pacienteId, pacienteId),
        sql`${turnos.estado} IN ('atendido', 'completada')`,
        sql`${turnos.deletedAt} IS NULL`,
      ),
    );

  const totalVisitas = Number(totalData?.value || 0);

  // Visitas este mes
  const inicioMes = sql`DATE_TRUNC('month', NOW())`;
  const [mesData] = await db
    .select({ value: count() })
    .from(turnos)
    .where(
      and(
        eq(turnos.pacienteId, pacienteId),
        sql`${turnos.estado} IN ('atendido', 'completada')`,
        sql`${turnos.deletedAt} IS NULL`,
        sql`${turnos.fechaHora} >= ${inicioMes}`,
      ),
    );

  const visitasEsteMes = Number(mesData?.value || 0);

  // Visitas por tipo de consulta
  const visitasPorTipo = await db
    .select({
      tipo: turnos.tipoConsulta,
      value: count(),
    })
    .from(turnos)
    .where(
      and(
        eq(turnos.pacienteId, pacienteId),
        sql`${turnos.estado} IN ('atendido', 'completada')`,
        sql`${turnos.deletedAt} IS NULL`,
      ),
    )
    .groupBy(turnos.tipoConsulta);

  // Visitas por mes (últimos 12)
  const visitasPorMesRaw = await db
    .select({
      mes: sql<string>`TO_CHAR(${turnos.fechaHora}, 'YYYY-MM')`,
      value: count(),
    })
    .from(turnos)
    .where(
      and(
        eq(turnos.pacienteId, pacienteId),
        sql`${turnos.estado} IN ('atendido', 'completada')`,
        sql`${turnos.deletedAt} IS NULL`,
        sql`${turnos.fechaHora} >= NOW() - INTERVAL '12 months'`,
      ),
    )
    .groupBy(sql`TO_CHAR(${turnos.fechaHora}, 'YYYY-MM')`)
    .orderBy(sql`TO_CHAR(${turnos.fechaHora}, 'YYYY-MM')`);

  // Total gastado (suma de precios en turnos pagados)
  const [gastadoData] = await db
    .select({
      value: sql<string>`COALESCE(SUM(${turnos.precio}::numeric), 0)`,
    })
    .from(turnos)
    .where(
      and(
        eq(turnos.pacienteId, pacienteId),
        eq(turnos.pagado, true),
        sql`${turnos.deletedAt} IS NULL`,
      ),
    );

  const totalGastado = Number(gastadoData?.value || 0);

  // Recetas activas
  const [recetasData] = await db
    .select({ value: count() })
    .from(recetas)
    .where(and(eq(recetas.pacienteId, pacienteId), eq(recetas.estado, 'activa')));

  const recetasActivas = Number(recetasData?.value || 0);

  // Última visita
  const [ultima] = await db
    .select({
      fecha: sql<string>`${turnos.fechaHora}::text`,
      medicoNombre: medicos.nombre,
    })
    .from(turnos)
    .leftJoin(medicos, eq(turnos.medicoId, medicos.id))
    .where(
      and(
        eq(turnos.pacienteId, pacienteId),
        sql`${turnos.estado} = 'atendido'`,
        sql`${turnos.deletedAt} IS NULL`,
      ),
    )
    .orderBy(desc(turnos.fechaHora))
    .limit(1);

  return NextResponse.json({
    totalVisitas,
    visitasEsteMes,
    visitasPorTipo: visitasPorTipo.map((v) => ({
      tipo: v.tipo,
      value: Number(v.value),
    })),
    visitasPorMes: visitasPorMesRaw.map((v) => ({
      mes: v.mes,
      value: Number(v.value),
    })),
    totalGastado,
    recetasActivas,
    ultimaVisita: ultima ? { fecha: ultima.fecha, medico: ultima.medicoNombre } : null,
  });
}
