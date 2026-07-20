import { db } from '@/lib/db';
import { turnos, pacientes, medicos } from '@/drizzle/schema';
import { sql, eq, and, gte, lte, isNull } from 'drizzle-orm';
import type { Periodo, ComplianceData, ComplianceMetricas, TiempoEsperaMes, CumplimientoMedico } from '@/app/dashboard/compliance/types';

const DIAS_PLAZO = 30;

function dateRange(periodo: Periodo): { desde: Date; hasta: Date } {
  const hasta = new Date();
  const desde = new Date();
  if (periodo === 'semana') {
    desde.setDate(desde.getDate() - 7);
  } else {
    desde.setMonth(desde.getMonth() - 12);
  }
  return { desde, hasta };
}

function formatMonthLabel(d: Date): string {
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return `${meses[d.getMonth()]} ${d.getFullYear()}`;
}

export async function getComplianceData(periodo: Periodo, sucursalId?: string): Promise<ComplianceData> {
  const { desde, hasta } = dateRange(periodo);

  const filtrosBase = [
    gte(turnos.fechaHora, desde),
    lte(turnos.fechaHora, hasta),
    isNull(turnos.deletedAt),
  ];
  if (sucursalId) {
    filtrosBase.push(eq(turnos.sucursalId, sucursalId));
  }

  // ── 1. Métricas generales ──
  const [metricasRaw] = await db
    .select({
      total: sql<number>`count(*)::int`,
      atendidos: sql<number>`count(*) filter (where ${turnos.estado} in ('atendido','completada'))::int`,
      noShows: sql<number>`count(*) filter (where ${turnos.estado} = 'no_asistio')::int`,
      cancelados: sql<number>`count(*) filter (where ${turnos.estado} = 'cancelada')::int`,
      esperaTotal: sql<number>`coalesce(sum(extract(epoch from ${turnos.fechaHora} - ${turnos.createdAt}) / 86400), 0)::int`,
      atendidosConFecha: sql<number>`count(*) filter (where ${turnos.estado} in ('atendido','completada') and ${turnos.createdAt} is not null)::int`,
    })
    .from(turnos)
    .where(and(...filtrosBase));

  const total = metricasRaw.total || 0;
  const atendidos = metricasRaw.atendidos || 0;
  const noShows = metricasRaw.noShows || 0;
  const cancelados = metricasRaw.cancelados || 0;
  const atendidosConFecha = metricasRaw.atendidosConFecha || 0;
  const esperaTotal = metricasRaw.esperaTotal || 0;

  const tiempoEsperaPromedio = atendidosConFecha > 0 ? +(esperaTotal / atendidosConFecha).toFixed(1) : 0;

  // ── 2. Periodo anterior ──
  const diffMs = hasta.getTime() - desde.getTime();
  const desdeAnterior = new Date(desde.getTime() - diffMs);
  const hastaAnterior = new Date(desde.getTime() - 1);

  const filtrosAnterior = [
    gte(turnos.fechaHora, desdeAnterior),
    lte(turnos.fechaHora, hastaAnterior),
    isNull(turnos.deletedAt),
  ];
  if (sucursalId) {
    filtrosAnterior.push(eq(turnos.sucursalId, sucursalId));
  }

  const [anterior] = await db
    .select({
      atendidos: sql<number>`count(*) filter (where ${turnos.estado} in ('atendido','completada'))::int`,
      esperaTotal: sql<number>`coalesce(sum(extract(epoch from ${turnos.fechaHora} - ${turnos.createdAt}) / 86400), 0)::int`,
      atendidosConFecha: sql<number>`count(*) filter (where ${turnos.estado} in ('atendido','completada') and ${turnos.createdAt} is not null)::int`,
    })
    .from(turnos)
    .where(and(...filtrosAnterior));

  const antAtendidos = anterior.atendidosConFecha || 0;
  const antEsperaTotal = anterior.esperaTotal || 0;
  const tiempoAnterior = antAtendidos > 0 ? +(antEsperaTotal / antAtendidos).toFixed(1) : 0;

  // ── 3. Tendencias mensuales ──
  const tendencias: TiempoEsperaMes[] = [];
  const rawTendencias = await db.execute(sql`
    SELECT
      date_trunc('month', fecha_hora) as mes,
      avg(extract(epoch from fecha_hora - created_at) / 86400)::numeric(6,1) as promedio,
      max(extract(epoch from fecha_hora - created_at) / 86400)::numeric(6,1) as maximo,
      min(extract(epoch from fecha_hora - created_at) / 86400)::numeric(6,1) as minimo,
      (count(*) filter (where estado in ('atendido','completada') and extract(epoch from fecha_hora - created_at) / 86400 <= ${DIAS_PLAZO}) * 100.0 / nullif(count(*) filter (where estado in ('atendido','completada')), 0))::numeric(5,1) as cumplimiento
    FROM turnos
    WHERE fecha_hora >= ${desde}
      AND fecha_hora <= ${hasta}
      AND deleted_at IS NULL
      ${sucursalId ? sql`AND sucursal_id = ${sucursalId}` : sql``}
      AND created_at IS NOT NULL
      AND estado IN ('atendido', 'completada', 'no_asistio', 'cancelada')
    GROUP BY date_trunc('month', fecha_hora)
    ORDER BY mes ASC
  `);

  for (const row of rawTendencias as unknown as Array<{
    mes: Date; promedio: string; maximo: string; minimo: string; cumplimiento: string | null;
  }>) {
    tendencias.push({
      label: formatMonthLabel(new Date(row.mes)),
      promedio: Number(row.promedio) || 0,
      maximo: Number(row.maximo) || 0,
      minimo: Number(row.minimo) || 0,
      cumplimiento: Number(row.cumplimiento) || 0,
    });
  }

  // ── 4. Por médico ──
  const rawPorMedico = await db.execute(sql`
    SELECT
      t.medico_id,
      COALESCE(m.nombre, 'Sin asignar') as medico_nombre,
      count(*) filter (where t.estado in ('atendido','completada'))::int as turnos_atendidos,
      avg(extract(epoch from t.fecha_hora - t.created_at) / 86400)::numeric(6,1) as promedio_espera,
      (count(*) filter (where t.estado in ('atendido','completada') and extract(epoch from t.fecha_hora - t.created_at) / 86400 <= ${DIAS_PLAZO}) * 100.0 / nullif(count(*) filter (where t.estado in ('atendido','completada')), 0))::numeric(5,1) as cumplimiento
    FROM turnos t
    LEFT JOIN medicos m ON m.id = t.medico_id
    WHERE t.fecha_hora >= ${desde}
      AND t.fecha_hora <= ${hasta}
      AND t.deleted_at IS NULL
      ${sucursalId ? sql`AND t.sucursal_id = ${sucursalId}` : sql``}
      AND t.created_at IS NOT NULL
    GROUP BY t.medico_id, m.nombre
    ORDER BY turnos_atendidos DESC
  `);

  const porMedico: CumplimientoMedico[] = (rawPorMedico as unknown as Array<{
    medico_id: string; medico_nombre: string; turnos_atendidos: number; promedio_espera: string; cumplimiento: string | null;
  }>).map(r => ({
    medicoId: r.medico_id,
    medicoNombre: r.medico_nombre,
    turnosAtendidos: r.turnos_atendidos,
    promedioEspera: Number(r.promedio_espera) || 0,
    cumplimiento: Number(r.cumplimiento) || 0,
  }));

  // ── 5. Distribución de cancelaciones ──
  const rawCancelaciones = await db.execute(sql`
    SELECT
      COALESCE(NULLIF(t.motivo_cancelacion, ''), 'Sin motivo') as motivo,
      count(*)::int as cantidad
    FROM turnos t
    WHERE t.estado = 'cancelada'
      AND t.fecha_hora >= ${desde}
      AND t.fecha_hora <= ${hasta}
      AND t.deleted_at IS NULL
      ${sucursalId ? sql`AND t.sucursal_id = ${sucursalId}` : sql``}
    GROUP BY motivo
    ORDER BY cantidad DESC
  `);

  const distribucionCancelacion = (rawCancelaciones as unknown as Array<{ motivo: string; cantidad: number }>).map(r => ({
    motivo: r.motivo,
    cantidad: r.cantidad,
  }));

  // ── Calcular métricas ──
  const cumplimientoPlazos = atendidos > 0
    ? Math.round((atendidos / (atendidos + noShows + cancelados)) * 100)
    : 0;
  const noShowRate = total > 0 ? Math.round((noShows / total) * 100) : 0;
  const cancelacionRate = total > 0 ? Math.round((cancelados / total) * 100) : 0;

  const metricas: ComplianceMetricas = {
    tiempoEsperaPromedio,
    cumplimientoPlazos,
    noShowRate,
    cancelacionRate,
    tendenciaTiempo: tiempoAnterior > 0 ? +(tiempoEsperaPromedio - tiempoAnterior).toFixed(1) : 0,
    tendenciaCumplimiento: 0,
  };

  return {
    metricas,
    tendencias,
    porMedico,
    distribucionCancelacion,
  };
}

export async function getDemoComplianceData(periodo: Periodo): Promise<ComplianceData> {
  const tendencias: TiempoEsperaMes[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    tendencias.push({
      label: formatMonthLabel(d),
      promedio: +(8 + Math.random() * 10).toFixed(1),
      maximo: +(15 + Math.random() * 20).toFixed(1),
      minimo: +(1 + Math.random() * 3).toFixed(1),
      cumplimiento: +(70 + Math.random() * 25).toFixed(1),
    });
  }

  const doctores = ['Dra. María González', 'Dr. Carlos Muñoz', 'Dra. Ana Soto', 'Dr. Pedro Ramírez'];
  const porMedico: CumplimientoMedico[] = doctores.map((nombre, i) => ({
    medicoId: `demo-${i}`,
    medicoNombre: nombre,
    turnosAtendidos: 50 + Math.floor(Math.random() * 200),
    promedioEspera: +(6 + Math.random() * 12).toFixed(1),
    cumplimiento: +(65 + Math.random() * 30).toFixed(1),
  }));

  return {
    metricas: {
      tiempoEsperaPromedio: +(8 + Math.random() * 8).toFixed(1),
      cumplimientoPlazos: 72 + Math.floor(Math.random() * 20),
      noShowRate: 8 + Math.floor(Math.random() * 10),
      cancelacionRate: 5 + Math.floor(Math.random() * 8),
      tendenciaTiempo: +(Math.random() * 4 - 2).toFixed(1),
      tendenciaCumplimiento: +(Math.random() * 10 - 5).toFixed(1),
    },
    tendencias,
    porMedico,
    distribucionCancelacion: [
      { motivo: 'Paciente reprogramó', cantidad: 30 + Math.floor(Math.random() * 20) },
      { motivo: 'Emergencia médica', cantidad: 10 + Math.floor(Math.random() * 10) },
      { motivo: 'Problemas personales', cantidad: 15 + Math.floor(Math.random() * 15) },
      { motivo: 'Olvido', cantidad: 8 + Math.floor(Math.random() * 8) },
      { motivo: 'Sin motivo registrado', cantidad: 5 + Math.floor(Math.random() * 10) },
    ],
    _demo: true,
  };
}
