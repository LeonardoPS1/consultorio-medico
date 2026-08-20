/**
 * GET /api/portal/reportes — Estadísticas personales del paciente
 * Protegido: requiere cookie portal_session
 *
 * Returns:
 * - totalVisitas: número total de visitas
 * - visitasEsteMes: visitas en el mes actual
 * - visitasPorTipo: desglose por tipo de consulta
 * - visitasPorMes: últimos 12 meses
 * - recetasActivas: recetas activas actualmente
 * - ultimaVisita: fecha de la última visita
 * - proximosTurnos: próximos turnos programados
 * - cancelacionesMes: cancelaciones del mes actual
 * - recetasRenovadas: recetas renovadas vs total
 * - diasDesdeUltimaVisita: días desde la última visita
 * - proximoControlRecomendado: días para próximo control sugerido
 */

import { eq, and, desc, sql, count, asc, gte, lt } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { turnos, recetas, medicos, recetaEstadoEnum } from '@/drizzle/schema';
import { db } from '@/lib/db';
import { getPortalSession } from '@/lib/portal-auth';

/**
 *
 */
export async function GET() {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const pacienteId = session.pacienteId;
  const now = new Date();
  const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
  const inicioMesStr = inicioMes.toISOString();

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
  const [mesData] = await db
    .select({ value: count() })
    .from(turnos)
    .where(
      and(
        eq(turnos.pacienteId, pacienteId),
        sql`${turnos.estado} IN ('atendido', 'completada')`,
        sql`${turnos.deletedAt} IS NULL`,
        sql`${turnos.fechaHora} >= ${inicioMesStr}`,
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

  // Recetas activas
  const [recetasData] = await db
    .select({ value: count() })
    .from(recetas)
    .where(and(eq(recetas.pacienteId, pacienteId), eq(recetas.estado, recetaEstadoEnum.enumValues[1]))); // 'emitida'

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

  // Próximos turnos (programados, no cancelados)
  const proximosTurnosRaw = await db
    .select({
      id: turnos.id,
      fechaHora: sql<string>`${turnos.fechaHora}::text`,
      medicoNombre: medicos.nombre,
      tipoConsulta: turnos.tipoConsulta,
      motivo: turnos.motivo,
    })
    .from(turnos)
    .leftJoin(medicos, eq(turnos.medicoId, medicos.id))
    .where(
      and(
        eq(turnos.pacienteId, pacienteId),
        sql`${turnos.estado} NOT IN ('cancelada', 'no_asistio')`,
        sql`${turnos.deletedAt} IS NULL`,
        sql`${turnos.fechaHora} >= NOW()`,
      ),
    )
    .orderBy(asc(turnos.fechaHora))
    .limit(5);

  // Cancelaciones este mes
  const [cancelacionesData] = await db
    .select({ value: count() })
    .from(turnos)
    .where(
      and(
        eq(turnos.pacienteId, pacienteId),
        eq(turnos.estado, 'cancelada'),
        sql`${turnos.deletedAt} IS NULL`,
        sql`${turnos.updatedAt} >= ${inicioMesStr}`,
      ),
    );

  const cancelacionesMes = Number(cancelacionesData?.value || 0);

  // Recetas renovadas vs total (adherencia)
  const [recetasTotalData] = await db
    .select({ value: count() })
    .from(recetas)
    .where(eq(recetas.pacienteId, pacienteId));

  const [recetasRenovadasData] = await db
    .select({ value: count() })
    .from(recetas)
    .where(
      and(
        eq(recetas.pacienteId, pacienteId),
        eq(recetas.estado, recetaEstadoEnum.enumValues[2]), // 'renovada'
      ),
    );

  const recetasTotal = Number(recetasTotalData?.value || 0);
  const recetasRenovadas = Number(recetasRenovadasData?.value || 0);
  const adherenciaRecetas = recetasTotal > 0 ? Math.round((recetasRenovadas / recetasTotal) * 100) : 0;

  // Días desde última visita
  let diasDesdeUltimaVisita: number | null = null;
  if (ultima?.fecha) {
    const ultimaFecha = new Date(ultima.fecha);
    const diffTime = now.getTime() - ultimaFecha.getTime();
    diasDesdeUltimaVisita = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  // Próximo control recomendado (90 días después de última visita, o 180 si no hay visitas)
  let proximoControlRecomendado: number | null = null;
  if (diasDesdeUltimaVisita !== null) {
    proximoControlRecomendado = Math.max(0, 90 - diasDesdeUltimaVisita);
  } else if (totalVisitas > 0) {
    proximoControlRecomendado = 180;
  }

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
    recetasActivas,
    ultimaVisita: ultima ? { fecha: ultima.fecha, medico: ultima.medicoNombre } : null,
    proximosTurnos: proximosTurnosRaw.map((t) => ({
      id: t.id,
      fechaHora: t.fechaHora,
      medicoNombre: t.medicoNombre,
      tipoConsulta: t.tipoConsulta,
      motivo: t.motivo,
    })),
    cancelacionesMes,
    recetasTotal,
    recetasRenovadas,
    adherenciaRecetas,
    diasDesdeUltimaVisita,
    proximoControlRecomendado,
  });
}
