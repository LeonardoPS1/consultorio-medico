// ============================================================
// Predicción de demanda por franja horaria (Tarea 1)
// ============================================================
//
// Calcula la tasa histórica de ocupación por combinación
// día-de-semana + franja horaria (hora exacta), normalizada al
// máximo histórico del mismo día (denominador = franja con más
// turnos de ese día). Permite detectar franjas sub-utilizadas
// y saturadas para ajustar dotación o promocionar horarios.
//
// El scoping por tenant se hace a nivel app: se consultan las
// sucursales del tenant actual (sucursales SÍ tiene RLS) y se
// filtran los turnos por sucursalId. turnos NO tiene RLS.
// ============================================================

import { gte, isNull, sql } from 'drizzle-orm';
import { turnos, sucursales } from '@/drizzle/schema';
import { db } from '@/lib/db';
import { getTenantId } from '@/lib/request-context';
import { setTenantContext } from '@/lib/rls';

// ─── Tipos ────────────────────────────────────────────

export interface FranjaOcupacion {
  /** Día de semana 0=Domingo ... 6=Sábado (EXTRACT DOW) */
  dia: number;
  /** Hora exacta 0-23 */
  hora: number;
  /** Cantidad de turnos agendados en esa franja (excluye cancelados) */
  total: number;
  /** Tasa de ocupación 0-1 normalizada al máximo histórico del mismo día */
  ocupacion: number;
}

export interface OcupacionReporte {
  /** Franjas con al menos 1 turno en la ventana */
  franjas: FranjaOcupacion[];
  /** Máximo histórico por día (para normalización en front) */
  maxPorDia: { dia: number; max: number }[];
  /** Total de turnos considerados en la ventana */
  totalTurnos: number;
  /** Semanas analizadas (default 12) */
  semanas: number;
  /** Turnos por día (para contextualizar el heatmap) */
  totalPorDia: { dia: number; total: number }[];
  _demo?: boolean;
}

// ─── Constantes ───────────────────────────────────────

export const SEMANAS_DEFAULT = 12;
export const DIAS_IGNORADOS = ['cancelada'];

// ─── Funciones ────────────────────────────────────────

/**
 * Calcula la ocupación histórica por día-de-semana + franja horaria.
 *
 * El scoping se resuelve así:
 *  - Si se pasa `sucursalId`, se filtra solo esa sucursal.
 *  - Si no, se consultan las sucursales del tenant actual via RLS
 *    (sucursales tiene política tenant_isolation_*) y se filtran los
 *    turnos por esas sucursales.
 *
 * La ocupación de cada franja = total_franja / max(total del mismo día),
 * de modo que el día con más demanda tiene la franja en 1.0 y las
 * franjas flojas tienden a 0.
 * @param opts - Opciones: sucursalId opcional, semanas a analizar (default 12)
 * @param opts.sucursalId
 * @param opts.semanas
 */
export async function calcularOcupacionFranjas(opts?: {
  sucursalId?: string;
  semanas?: number;
}): Promise<OcupacionReporte> {
  const semanas = opts?.semanas ?? SEMANAS_DEFAULT;
  const desde = new Date();
  desde.setDate(desde.getDate() - semanas * 7);

  // ─── Resolver sucursales del tenant actual ───────────
  let sucursalIds: string[] | undefined;
  if (opts?.sucursalId) {
    sucursalIds = [opts.sucursalId];
  } else {
    const sucursalesTenant = await db
      .select({ id: sucursales.id })
      .from(sucursales);
    sucursalIds = sucursalesTenant.map((s) => s.id);
    if (sucursalIds.length === 0) {
      return { franjas: [], maxPorDia: [], totalTurnos: 0, semanas, totalPorDia: [] };
    }
  }

  // ─── Agregar turnos por (día, hora) ──────────────────
  const rows = await db.execute(sql`
    SELECT
      EXTRACT(DOW FROM ${turnos.fechaHora})::int AS dia,
      EXTRACT(HOUR FROM ${turnos.fechaHora})::int AS hora,
      COUNT(*)::int AS total
    FROM ${turnos}
    WHERE ${turnos.fechaHora} >= ${desde}
      AND ${turnos.deletedAt} IS NULL
      AND ${turnos.estado} <> 'cancelada'
      AND ${turnos.sucursalId} IN ${sucursalIds}
    GROUP BY 1, 2
  `);

  const franjas = (rows as unknown as Array<{
    dia: number;
    hora: number;
    total: number;
  }>).map((r) => ({ dia: r.dia, hora: r.hora, total: Number(r.total) }));

  const totalTurnos = franjas.reduce((acc, f) => acc + f.total, 0);
  if (totalTurnos === 0) {
    return { franjas: [], maxPorDia: [], totalTurnos: 0, semanas, totalPorDia: [] };
  }

  // ─── Normalizar al máximo histórico por día ──────────
  const maxPorDia = Array.from({ length: 7 }, (_, dia) => {
    const deDia = franjas.filter((f) => f.dia === dia);
    return { dia, max: deDia.length > 0 ? Math.max(...deDia.map((f) => f.total)) : 0 };
  });

  const totalPorDia = Array.from({ length: 7 }, (_, dia) => {
    const deDia = franjas.filter((f) => f.dia === dia);
    return { dia, total: deDia.reduce((acc, f) => acc + f.total, 0) };
  });

  const mapaMax = new Map(maxPorDia.map((m) => [m.dia, m.max]));

  const franjasNormalizadas: FranjaOcupacion[] = franjas.map((f) => ({
    ...f,
    ocupacion: mapaMax.get(f.dia) ? f.total / (mapaMax.get(f.dia) as number) : 0,
  }));

  return {
    franjas: franjasNormalizadas,
    maxPorDia,
    totalTurnos,
    semanas,
    totalPorDia,
  };
}

/**
 * Genera un dataset de ocupación demo realista (para que la UI se vea
 * completa incluso sin datos reales). Mismo contrato que el servicio real.
 * @param opts
 * @param opts.semanas
 */
export function getDemoOcupacion(opts?: { semanas?: number }): OcupacionReporte {
  const semanas = opts?.semanas ?? SEMANAS_DEFAULT;
  // Franjas laborales 08:00-19:00 con picos lógicos por día
  const porDia: Record<number, Array<{ hora: number; total: number }>> = {};
  const horasLaborales = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
  for (let dia = 1; dia <= 6; dia++) {
    porDia[dia] = horasLaborales.map((hora) => {
      let base = 2;
      if (dia === 6) base = 1; // sábado flojo
      if (hora === 9 || hora === 10 || hora === 16 || hora === 17) base += 4; // picos
      if (hora === 13) base += 2; // mediodía
      if (hora === 8 || hora === 19) base -= 1;
      return { hora, total: Math.max(0, base + Math.round(Math.random() * 2 - 1)) };
    });
  }

  const franjas: FranjaOcupacion[] = [];
  for (const dia of Object.keys(porDia)) {
    const d = Number(dia);
    const items = porDia[d];
    const max = Math.max(...items.map((i) => i.total), 1);
    for (const item of items) {
      franjas.push({ dia: d, hora: item.hora, total: item.total, ocupacion: item.total / max });
    }
  }

  const maxPorDia = Array.from({ length: 7 }, (_, dia) => ({
    dia,
    max: porDia[dia] ? Math.max(...porDia[dia].map((i) => i.total)) : 0,
  }));
  const totalPorDia = Array.from({ length: 7 }, (_, dia) => ({
    dia,
    total: porDia[dia] ? porDia[dia].reduce((acc, i) => acc + i.total, 0) : 0,
  }));

  return {
    franjas,
    maxPorDia,
    totalTurnos: franjas.reduce((acc, f) => acc + f.total, 0),
    semanas,
    totalPorDia,
    _demo: true,
  };
}

/**
 * Genera una grilla completa 7 días × 24 horas para el heatmap,
 * completando con ocupación 0 las franjas sin turnos.
 * El front recibe esta grilla para renderizar sin lógica extra.
 * @param reporte
 */
export function construirGrillaOcupacion(reporte: OcupacionReporte): number[][] {
  const grilla: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const f of reporte.franjas) {
    grilla[f.dia][f.hora] = f.ocupacion;
  }
  return grilla;
}

/**
 * Ejecuta el cálculo para un tenant específico (usado por el job interno).
 * Si `tenantId` viene explícito, fuerza el contexto RLS a ese tenant.
 * Requiere header x-internal-key (validado por el endpoint que lo invoca).
 * @param opts
 * @param opts.sucursalId
 * @param opts.tenantId
 * @param opts.semanas
 */
export async function calcularOcupacionTenant(opts?: {
  sucursalId?: string;
  tenantId?: string;
  semanas?: number;
}): Promise<OcupacionReporte> {
  if (opts?.tenantId && opts.tenantId !== getTenantId()) {
    await setTenantContext(opts.tenantId);
  }
  return calcularOcupacionFranjas(opts);
}
