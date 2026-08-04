// ============================================================
// Benchmark Anónimo entre Clínicas (Tarea 2)
// ============================================================
//
// Calcula promedios anónimos de tasa de no-show, ocupación y NPS
// agrupados por rango de tamaño de clínica (bucket de pacientes activos).
//
// Regla de privacidad: un bucket SOLO se expone si contiene >= 5 tenants
// con datos suficientes, para que el promedio no permita inferir el dato
// de un tenant específico (mínimo 5 para proteger la identidad).
//
// Corre en ops-console usando OPS_DATABASE_URL (bypass RLS) sobre
// public.* (tenants, sucursales, pacientes, turnos, historial_medico).
// ============================================================

import { getDb } from '@/lib/db'
import { sql, desc } from 'drizzle-orm'
import { benchmarkSnapshot } from '@/drizzle/schema'

// ─── Constantes ───────────────────────────────────────────

/** Ventana histórica para métricas (días) */
export const VENTANA_DIAS = 90
/** Mínimo de clínicas con datos por bucket para exponer el benchmark */
export const UMBRAL_TENANTS = 5
/** Mínimo de turnos de un tenant para considerarlo "con datos suficientes" */
export const MIN_TURNOS_TENANT = 10

/** Buckets de tamaño de clínica basados en pacientes activos */
export const BUCKETS: Array<{ min: number; max: number; label: string; range: string }> = [
  { min: 0, max: 99, label: 'pequeña', range: '0-99' },
  { min: 100, max: 499, label: 'mediana', range: '100-499' },
  { min: 500, max: 1499, label: 'grande', range: '500-1499' },
  { min: 1500, max: Infinity, label: 'muy grande', range: '1500+' },
]

export function bucketForPacientes(pacientes: number): { label: string; range: string } {
  for (const b of BUCKETS) {
    if (pacientes >= b.min && pacientes <= b.max) return { label: b.label, range: b.range }
  }
  return { label: 'muy grande', range: '1500+' }
}

// ─── Tipos ────────────────────────────────────────────────

export interface BenchmarkTenantMetric {
  tenantId: string
  tenantNombre: string
  pacientesActivos: number
  totalTurnos: number
  noShows: number
  completados: number
  cancelados: number
  nps: number | null
}

export interface BenchmarkBucket {
  bucketLabel: string
  bucketRange: string
  tenantCount: number
  avgNoShow: number
  avgOcupacion: number
  avgNps: number | null
}

export interface BenchmarkCalculado {
  buckets: BenchmarkBucket[]
  tenantCountTotal: number
  calculatedAt: string
}

/** Métricas de un tenant específico (usado por el dashboard para comparar) */
export interface TenantComparativa {
  tenantId: string
  tenantNombre: string
  pacientesActivos: number
  totalTurnos: number
  noShowRate: number
  ocupacion: number
  nps: number | null
  bucketLabel: string
  bucketRange: string
  benchMark: BenchmarkBucket | null
}

// ─── Funciones ───────────────────────────────────────────

/**
 * Calcula métricas individuales (no agregadas) para cada tenant activo.
 * Usa OPS_DATABASE_URL → bypass RLS, consulta public.* directamente.
 *
 * - no-show rate = no_asistio / (completada + no_asistio)
 * - ocupación   = (completada + no_asistio) / (completada + no_asistio + cancelada)
 * - NPS         = (promotores(5) - detractores(<=2)) / respondentes * 100
 *
 * Los tenants con < MIN_TURNOS_TENANT turnos se descartan (insuficiente dato).
 */
export async function calcularMetricasTenants(): Promise<BenchmarkTenantMetric[]> {
  const db = getDb()

  const result = await db.execute(sql`
    WITH turnos_t AS (
      SELECT
        s.tenant_id,
        COUNT(*) FILTER (WHERE t.estado = 'no_asistio') AS no_shows,
        COUNT(*) FILTER (WHERE t.estado = 'completada') AS completados,
        COUNT(*) FILTER (WHERE t.estado = 'cancelada') AS cancelados,
        COUNT(*) AS total_turnos
      FROM public.turnos t
      JOIN public.sucursales s ON s.id = t.sucursal_id
      WHERE t.fecha_hora >= NOW() - INTERVAL '${VENTANA_DIAS} days'
        AND t.deleted_at IS NULL
      GROUP BY s.tenant_id
    ),
    pac_t AS (
      SELECT s.tenant_id, COUNT(*) AS pacientes_activos
      FROM public.pacientes p
      JOIN public.sucursales s ON s.id = p.sucursal_id
      WHERE p.deleted_at IS NULL
      GROUP BY s.tenant_id
    ),
    nps_t AS (
      SELECT
        s.tenant_id,
        COUNT(*) AS nps_total,
        COUNT(*) FILTER (WHERE puntaje = 5) AS nps_promotores,
        COUNT(*) FILTER (WHERE puntaje <= 2) AS nps_detractores
      FROM (
        SELECT
          (substring(hm.titulo FROM '(\\d+)/5')::int) AS puntaje,
          hm.paciente_id
        FROM public.historial_medico hm
        WHERE hm.tipo = 'encuesta'
          AND hm.titulo ~ '^Encuesta de satisfacción - \\d/5$'
      ) e
      JOIN public.pacientes p ON p.id = e.paciente_id
      JOIN public.sucursales s ON s.id = p.sucursal_id
      GROUP BY s.tenant_id
    )
    SELECT
      t.id AS tenant_id,
      t.nombre AS tenant_nombre,
      COALESCE(pt.pacientes_activos, 0) AS pacientes_activos,
      COALESCE(tt.total_turnos, 0) AS total_turnos,
      COALESCE(tt.no_shows, 0) AS no_shows,
      COALESCE(tt.completados, 0) AS completados,
      COALESCE(tt.cancelados, 0) AS cancelados,
      CASE
        WHEN COALESCE(nt.nps_total, 0) > 0
        THEN ROUND((COALESCE(nt.nps_promotores, 0) - COALESCE(nt.nps_detractores, 0))::numeric / nt.nps_total * 100, 1)
        ELSE NULL
      END AS nps
    FROM public.tenants t
    LEFT JOIN turnos_t tt ON tt.tenant_id = t.id
    LEFT JOIN pac_t pt ON pt.tenant_id = t.id
    LEFT JOIN nps_t nt ON nt.tenant_id = t.id
    WHERE t.activo = true
  `)

  const rows = result as unknown as Array<{
    tenant_id: string
    tenant_nombre: string
    pacientes_activos: number
    total_turnos: number
    no_shows: number
    completados: number
    cancelados: number
    nps: number | null
  }>

  // Filtrar tenants con datos suficientes
  return rows
    .filter((r) => Number(r.total_turnos) >= MIN_TURNOS_TENANT)
    .map((r) => ({
      tenantId: r.tenant_id,
      tenantNombre: r.tenant_nombre,
      pacientesActivos: Number(r.pacientes_activos),
      totalTurnos: Number(r.total_turnos),
      noShows: Number(r.no_shows),
      completados: Number(r.completados),
      cancelados: Number(r.cancelados),
      nps: r.nps == null ? null : Number(r.nps),
    }))
}

/**
 * Agrega las métricas por tenant en buckets de tamaño y calcula promedios.
 * Solo expone buckets con >= UMBRAL_TENANTS tenants (regla anti-identificación).
 */
export function agregarBenchmark(metrics: BenchmarkTenantMetric[]): BenchmarkCalculado {
  const porBucket = new Map<string, BenchmarkTenantMetric[]>()
  for (const m of metrics) {
    const bucket = bucketForPacientes(m.pacientesActivos)
    const key = bucket.label
    const arr = porBucket.get(key)
    if (arr) arr.push(m)
    else porBucket.set(key, [m])
  }

  const buckets: BenchmarkBucket[] = []
  for (const b of BUCKETS) {
    const arr = porBucket.get(b.label) ?? []
    if (arr.length < UMBRAL_TENANTS) continue // umbral anti-inferencia
    const avgNoShow = promedio(arr.map((m) => tasaNoShow(m)))
    const avgOcupacion = promedio(arr.map((m) => tasaOcupacion(m)))
    const npsVals = arr.map((m) => m.nps).filter((n): n is number => typeof n === 'number')
    const avgNps = npsVals.length > 0 ? promedio(npsVals) : null
    buckets.push({
      bucketLabel: b.label,
      bucketRange: b.range,
      tenantCount: arr.length,
      avgNoShow,
      avgOcupacion,
      avgNps,
    })
  }

  return {
    buckets,
    tenantCountTotal: arrTotal(metrics),
    calculatedAt: new Date().toISOString(),
  }
}

/** Recalcula el benchmark, guarda snapshot y retorna el resultado */
export async function recalcularBenchmark(): Promise<BenchmarkCalculado> {
  const metrics = await calcularMetricasTenants()
  const calculado = agregarBenchmark(metrics)

  const db = getDb()
  // Guardar snapshot de cada bucket expuesto (solo agregados, nunca datos por tenant)
  for (const bucket of calculado.buckets) {
    const bInfo = BUCKETS.find((b) => b.label === bucket.bucketLabel)!
    await db.insert(benchmarkSnapshot).values({
      bucketLabel: bucket.bucketLabel,
      bucketRange: bInfo.range,
      tenantCount: bucket.tenantCount,
      avgNoShow: String(bucket.avgNoShow),
      avgOcupacion: String(bucket.avgOcupacion),
      avgNps: bucket.avgNps != null ? String(bucket.avgNps) : null,
    })
  }

  // Limpiar snapshots de runs anteriores (conservar solo el último run para
  // evitar crecimiento sin límite de la tabla)
  await db
    .delete(benchmarkSnapshot)
    .where(sql`${benchmarkSnapshot.createdAt} <> (SELECT MAX(${benchmarkSnapshot.createdAt}) FROM ${benchmarkSnapshot})`)

  return calculado
}

/** Devuelve el snapshot más reciente con TODOS los buckets de ese run */
export async function getBenchmarkActivo(): Promise<BenchmarkCalculado> {
  const db = getDb()
  const rows = await db
    .select()
    .from(benchmarkSnapshot)
    .where(
      sql`${benchmarkSnapshot.createdAt} = (SELECT MAX(${benchmarkSnapshot.createdAt}) FROM ${benchmarkSnapshot})`,
    )
    .orderBy(desc(benchmarkSnapshot.createdAt))

  if (rows.length === 0) {
    // Sin snapshots persistidos: calcular on-demand
    return recalcularBenchmark()
  }

  const buckets: BenchmarkBucket[] = rows.map((snapShot) => ({
    bucketLabel: snapShot.bucketLabel,
    bucketRange: snapShot.bucketRange,
    tenantCount: snapShot.tenantCount,
    avgNoShow: Number(snapShot.avgNoShow ?? 0),
    avgOcupacion: Number(snapShot.avgOcupacion ?? 0),
    avgNps: snapShot.avgNps != null ? Number(snapShot.avgNps) : null,
  }))

  return {
    buckets,
    tenantCountTotal: buckets.reduce((acc, b) => acc + b.tenantCount, 0),
    calculatedAt: rows[0]?.createdAt?.toISOString() ?? new Date().toISOString(),
  }
}

/** Devuelve las métricas de un tenant específico + su bucket de comparación */
export async function getComparativaTenant(tenantId: string): Promise<TenantComparativa | null> {
  const db = getDb()
  const result = await db.execute(sql`
    WITH turnos_t AS (
      SELECT
        COUNT(*) FILTER (WHERE t.estado = 'no_asistio') AS no_shows,
        COUNT(*) FILTER (WHERE t.estado = 'completada') AS completados,
        COUNT(*) FILTER (WHERE t.estado = 'cancelada') AS cancelados,
        COUNT(*) AS total_turnos
      FROM public.turnos t
      WHERE t.sucursal_id IN (
        SELECT id FROM public.sucursales WHERE tenant_id = ${tenantId}
      )
      AND t.fecha_hora >= NOW() - INTERVAL '${VENTANA_DIAS} days'
      AND t.deleted_at IS NULL
    ),
    pac_t AS (
      SELECT COUNT(*) AS pacientes_activos
      FROM public.pacientes p
      WHERE p.sucursal_id IN (
        SELECT id FROM public.sucursales WHERE tenant_id = ${tenantId}
      )
      AND p.deleted_at IS NULL
    ),
    nps_t AS (
      SELECT
        COUNT(*) AS nps_total,
        COUNT(*) FILTER (WHERE puntaje = 5) AS nps_promotores,
        COUNT(*) FILTER (WHERE puntaje <= 2) AS nps_detractores
      FROM (
        SELECT (substring(hm.titulo FROM '(\\d+)/5')::int) AS puntaje
        FROM public.historial_medico hm
        WHERE hm.tipo = 'encuesta' AND hm.titulo ~ '^Encuesta de satisfacción - \\d/5$'
        AND EXISTS (
          SELECT 1 FROM public.pacientes p
          WHERE p.id = hm.paciente_id
          AND p.sucursal_id IN (SELECT id FROM public.sucursales WHERE tenant_id = ${tenantId})
        )
      ) e
    ),
    t_t AS (SELECT id, nombre FROM public.tenants WHERE id = ${tenantId})
    SELECT
      t_t.id AS tenant_id,
      t_t.nombre AS tenant_nombre,
      COALESCE(pac_t.pacientes_activos, 0) AS pacientes_activos,
      COALESCE(turnos_t.total_turnos, 0) AS total_turnos,
      COALESCE(turnos_t.no_shows, 0) AS no_shows,
      COALESCE(turnos_t.completados, 0) AS completados,
      COALESCE(turnos_t.cancelados, 0) AS cancelados,
      CASE WHEN COALESCE(nps_t.nps_total, 0) > 0
        THEN ROUND((COALESCE(nps_t.nps_promotores, 0) - COALESCE(nps_t.nps_detractores, 0))::numeric / nps_t.nps_total * 100, 1)
        ELSE NULL END AS nps
    FROM t_t
    CROSS JOIN turnos_t
    CROSS JOIN pac_t
    CROSS JOIN nps_t
  `)

  const row = (result as unknown as Array<Record<string, unknown>>)[0]
  if (!row) return null

  const metric: BenchmarkTenantMetric = {
    tenantId: row.tenant_id as string,
    tenantNombre: row.tenant_nombre as string,
    pacientesActivos: Number(row.pacientes_activos),
    totalTurnos: Number(row.total_turnos),
    noShows: Number(row.no_shows),
    completados: Number(row.completados),
    cancelados: Number(row.cancelados),
    nps: row.nps == null ? null : Number(row.nps),
  }

  const bucket = bucketForPacientes(metric.pacientesActivos)
  const activeBenchmark = await getBenchmarkActivo()
  const benchMarkBucket = activeBenchmark.buckets.find((b) => b.bucketLabel === bucket.label) || null

  return {
    tenantId: metric.tenantId,
    tenantNombre: metric.tenantNombre,
    pacientesActivos: metric.pacientesActivos,
    totalTurnos: metric.totalTurnos,
    noShowRate: tasaNoShow(metric),
    ocupacion: tasaOcupacion(metric),
    nps: metric.nps,
    bucketLabel: bucket.label,
    bucketRange: bucket.range,
    benchMark: benchMarkBucket ?? null,
  }
}

// ─── Helpers ────────────────────────────────────────────

function tasaNoShow(m: BenchmarkTenantMetric): number {
  const base = m.completados + m.noShows
  return base > 0 ? (m.noShows / base) * 100 : 0
}

function tasaOcupacion(m: BenchmarkTenantMetric): number {
  const slots = m.completados + m.noShows + m.cancelados
  const ocupados = m.completados + m.noShows
  return slots > 0 ? (ocupados / slots) * 100 : 0
}

function promedio(arr: number[]): number {
  if (arr.length === 0) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

function arrTotal(metrics: BenchmarkTenantMetric[]): number {
  return metrics.length
}
