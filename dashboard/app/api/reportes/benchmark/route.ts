import { sql } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { turnos, pacientes, sucursales, historialMedico } from '@/drizzle/schema';
import { apiHandler, ok } from '@/lib/api-handler';
import { auth } from '@/lib/auth';
import type { BenchmarkBucket } from '@/lib/benchmark';
import { bucketForPacientes } from '@/lib/benchmark';
import { db } from '@/lib/db';
import { canAccess } from '@/lib/features';

export const dynamic = 'force-dynamic';

const OPS_URL = process.env.OPS_CONSOLE_URL || 'http://ops-console-23kboo:3002';
const VENTANA_DIAS = 90;

interface BenchComparativaResponse {
  tenantId: string;
  pacientesActivos: number;
  totalTurnos: number;
  noShowRate: number;
  ocupacion: number;
  nps: number | null;
  bucketLabel: string;
  bucketRange: string;
  promedioBucket: BenchmarkBucket | null;
  diferenciaNoShow: number | null;
  diferenciaOcupacion: number | null;
  diferenciaNps: number | null;
  minimoCumplido: boolean;
  umbralTenants: number;
  _fuente: 'real' | 'demo';
  /** true si no se pudo consultar el servicio de benchmark (ops-console caído) */
  _opsError?: boolean;
}

/**
 * GET /api/reportes/benchmark
 *
 * Calcula las métricas de TU clínica (RLS-scoped al tenant actual) y
 * consulta el benchmark anónimo agregado del ops-console para mostrarte
 * el promedio de clínicas similares (mismo bucket de tamaño).
 *
 * Regla de privacidad (enforzada en ops-console): un bucket solo se
 * muestra si tiene >= 5 tenants con datos suficientes.
 */
export const GET = apiHandler(async (_request: NextRequest) => {
  const session = await auth();
  if (!session) {
    return ok({ error: 'No autorizado' }, 401);
  }
  const plan = session.user?.plan ?? 'free';
  if (!canAccess(plan, 'reportes-avanzados')) {
    return ok({ error: 'Tu plan no incluye benchmark' }, 403);
  }

  const tenantId = session.user?.tenantId ?? '00000000-0000-0000-0000-000000000000';
  const desde = new Date();
  desde.setDate(desde.getDate() - VENTANA_DIAS);

  // ─── Métricas de tu clínica (scoping vía mis_suc con RLS) ─────
  const [miFila] = await db.execute(sql`
      WITH mis_suc AS (
      SELECT id FROM ${sucursales} WHERE ${sucursales.activo} = true
    )
    SELECT
      (SELECT COUNT(*)::int FROM ${pacientes}
       WHERE ${pacientes.sucursalId} IN (SELECT id FROM mis_suc)
         AND ${pacientes.deletedAt} IS NULL) AS pacientes_activos,
      COUNT(*) FILTER (WHERE ${turnos.estado} = 'no_asistio') AS no_shows,
      COUNT(*) FILTER (WHERE ${turnos.estado} = 'completada') AS completados,
      COUNT(*) FILTER (WHERE ${turnos.estado} = 'cancelada') AS cancelados,
      COUNT(*) AS total_turnos
    FROM ${turnos}
    WHERE ${turnos.sucursalId} IN (SELECT id FROM mis_suc)
      AND ${turnos.fechaHora} >= ${desde}
      AND ${turnos.deletedAt} IS NULL
  `);

  const noShows = Number(miFila?.no_shows ?? 0);
  const completados = Number(miFila?.completados ?? 0);
  const cancelados = Number(miFila?.cancelados ?? 0);
  const totalTurnos = Number(miFila?.total_turnos ?? 0);
  const baseAsistencia = completados + noShows;
  const noShowRate = baseAsistencia > 0 ? (noShows / baseAsistencia) * 100 : 0;
  const ocupacion = ocupacionFn(completados, noShows, cancelados);
  const pacientesActivos = Number(miFila?.pacientes_activos ?? 0);

  // ─── NPS (cálculo separado para no multiplicar filas) ────────
  const [npsFila] = await db.execute(sql`
    WITH mis_suc AS (
      SELECT id FROM ${sucursales} WHERE ${sucursales.activo} = true
    )
    SELECT CASE WHEN COUNT(*) > 0
      THEN ROUND((COUNT(*) FILTER (WHERE puntaje = 5)
                 - COUNT(*) FILTER (WHERE puntaje <= 2))::numeric / COUNT(*) * 100, 1)
      ELSE NULL
    END AS nps
    FROM (
      SELECT (substring(hm.titulo FROM '(\\d+)/5')::int) AS puntaje
      FROM ${historialMedico} hm
      WHERE hm.tipo = 'encuesta'
        AND hm.titulo ~ '^Encuesta de satisfacción - \\d/5$'
        AND EXISTS (
          SELECT 1 FROM ${pacientes} p
          WHERE p.id = hm.pacienteId
            AND p.sucursalId IN (SELECT id FROM mis_suc)
            AND p.deletedAt IS NULL
        )
    ) e
  `);
  const nps: number | null = npsFila?.nps == null ? null : Number(npsFila.nps);

  const bucket = bucketForPacientes(pacientesActivos);

  // ─── Consultar benchmark anónimo al ops-console ──────────────
  let promedioBucket: BenchmarkBucket | null = null;
  let minimoCumplido = false;
  let opsError = false;

  try {
    const res = await fetch(`${OPS_URL}/api/internal/benchmark?tenantId=${tenantId}`, {
      cache: 'no-store',
      headers: { 'x-internal-key': process.env.INTERNAL_API_KEY ?? '' },
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      const raw = (await res.json()) as {
        buckets?: BenchmarkBucket[];
        data?: { buckets?: BenchmarkBucket[] };
      };
      // ops `ok()` envuelve en { success, data }; tolera ambas formas
      const buckets = raw.buckets ?? raw.data?.buckets ?? [];
      promedioBucket = buckets.find((b) => b.bucketLabel === bucket.label) ?? null;
      minimoCumplido = promedioBucket !== null;
    } else {
      opsError = true;
    }
  } catch {
    minimoCumplido = false;
    promedioBucket = null;
    opsError = true;
  }

  return ok<BenchComparativaResponse>({
    tenantId,
    pacientesActivos,
    totalTurnos,
    noShowRate,
    ocupacion,
    nps,
    bucketLabel: bucket.label,
    bucketRange: bucket.range,
    promedioBucket,
    diferenciaNoShow: promedioBucket ? noShowRate - promedioBucket.avgNoShow : null,
    diferenciaOcupacion: promedioBucket ? ocupacion - promedioBucket.avgOcupacion : null,
    diferenciaNps: promedioBucket && nps != null && promedioBucket.avgNps != null
      ? nps - promedioBucket.avgNps
      : null,
    minimoCumplido,
    umbralTenants: 5,
    _fuente: 'real',
    _opsError: opsError || undefined,
  });
});

function ocupacionFn(completados: number, noShows: number, cancelados: number): number {
  const slots = completados + noShows + cancelados;
  const ocupados = completados + noShows;
  return slots > 0 ? (ocupados / slots) * 100 : 0;
}