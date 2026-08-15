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

import { sql, and, gte, ne, isNull, inArray, eq } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { turnos, sucursales } from '@/drizzle/schema';
import { db } from '@/lib/db';
import { getTenantId } from '@/lib/request-context';
import { setTenantContext } from '@/lib/rls';
import type {
  FranjaOcupacion,
  OcupacionReporte,
  TendenciaSemanal,
  NoShowFranja,
  ResumenOcupacion,
} from './ocupacion-grilla';

// ─── Tipos ────────────────────────────────────────────

export type {
  FranjaOcupacion,
  OcupacionReporte,
  TendenciaSemanal,
  NoShowFranja,
  ResumenOcupacion,
  Recomendacion,
} from './ocupacion-grilla';
export { DIAS_LABEL, DIAS_ABREV, HORA_MIN, HORA_MAX } from './ocupacion-grilla';

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
 * @param opts - Opciones: sucursalId, medicoId opcionales, semanas a analizar (default 12)
 * @param opts.sucursalId
 * @param opts.medicoId
 * @param opts.semanas
 */
export async function calcularOcupacionFranjas(opts?: {
  sucursalId?: string;
  medicoId?: string;
  semanas?: number;
}): Promise<OcupacionReporte> {
  const semanas = opts?.semanas ?? SEMANAS_DEFAULT;
  const desde = new Date();
  desde.setDate(desde.getDate() - semanas * 7);

  let sucursalIds: string[] | undefined;
  if (opts?.sucursalId) {
    sucursalIds = [opts.sucursalId];
  } else {
    const sucursalesTenant = await db.select({ id: sucursales.id }).from(sucursales);
    sucursalIds = sucursalesTenant.map((s) => s.id);
    if (sucursalIds.length === 0) {
      return { franjas: [], maxPorDia: [], totalTurnos: 0, semanas, totalPorDia: [] };
    }
  }

  const conditions: SQL[] = [
    gte(turnos.fechaHora, desde),
    isNull(turnos.deletedAt),
    ne(turnos.estado, 'cancelada'),
    inArray(turnos.sucursalId, sucursalIds),
  ];
  if (opts?.medicoId) {
    conditions.push(eq(turnos.medicoId, opts.medicoId));
  }

  const rows = await db
    .select({
      dia: sql<number>`EXTRACT(DOW FROM ${turnos.fechaHora})::int`,
      hora: sql<number>`EXTRACT(HOUR FROM ${turnos.fechaHora})::int`,
      total: sql<number>`COUNT(*)::int`,
    })
    .from(turnos)
    .where(and(...conditions))
    .groupBy(sql`1`, sql`2`);

  const franjas: FranjaOcupacion[] = (
    rows as unknown as Array<{
      dia: number;
      hora: number;
      total: number;
    }>
  ).map((r) => ({ dia: r.dia, hora: r.hora, total: Number(r.total), ocupacion: 0 }));

  const totalTurnos = franjas.reduce((acc, f) => acc + f.total, 0);
  if (totalTurnos === 0) {
    return { franjas: [], maxPorDia: [], totalTurnos: 0, semanas, totalPorDia: [] };
  }

  const maxPorDia = Array.from({ length: 7 }, (_, dia) => {
    const deDia = franjas.filter((f) => f.dia === dia);
    return { dia, max: deDia.length > 0 ? Math.max(...deDia.map((f) => f.total)) : 0 };
  });

  const totalPorDia = Array.from({ length: 7 }, (_, dia) => {
    const deDia = franjas.filter((f) => f.dia === dia);
    return { dia, total: deDia.reduce((acc, f) => acc + f.total, 0) };
  });

  const mapaMax = new Map(maxPorDia.map((m) => [m.dia, m.max]));
  for (const f of franjas) {
    f.ocupacion = mapaMax.get(f.dia) ? f.total / (mapaMax.get(f.dia) as number) : 0;
  }

  const [tendencias, noShowPorFranja, resumen] = await Promise.all([
    calcularTendencias(sucursalIds, desde, opts?.medicoId, semanas === 1),
    calcularNoShowPorFranja(sucursalIds, desde, opts?.medicoId),
    Promise.resolve(calcularResumen(franjas)),
  ]);

  return {
    franjas,
    maxPorDia,
    totalTurnos,
    semanas,
    totalPorDia,
    tendencias,
    noShowPorFranja,
    resumen,
  };
}

async function calcularTendencias(
  sucursalIds: string[],
  desde: Date,
  medicoId?: string,
  porDia = false,
): Promise<TendenciaSemanal[]> {
  const conditions: SQL[] = [
    gte(turnos.fechaHora, desde),
    isNull(turnos.deletedAt),
    ne(turnos.estado, 'cancelada'),
    inArray(turnos.sucursalId, sucursalIds),
  ];
  if (medicoId) {
    conditions.push(eq(turnos.medicoId, medicoId));
  }

  const agrupador = porDia
    ? sql<number>`EXTRACT(DOW FROM ${turnos.fechaHora})::int`
    : sql<number>`EXTRACT(WEEK FROM ${turnos.fechaHora})::int`;

  const rows = await db
    .select({
      semana: agrupador,
      total: sql<number>`COUNT(*)::int`,
    })
    .from(turnos)
    .where(and(...conditions))
    .groupBy(sql`1`)
    .orderBy(sql`1`);

  if (rows.length === 0) return [];

  const sinAjuste = (rows as unknown as Array<{ semana: number; total: number }>).map((r) => ({
    semana: Number(r.semana),
    totalTurnos: Number(r.total),
  }));

  if (porDia) {
    // 1 semana → tendencia por día de la semana (DOW 0=Dom..6=Sáb),
    // completando días sin turnos con 0 para mostrar los 7 días.
    const porDiaMap = new Map(sinAjuste.map((r) => [r.semana, r.totalTurnos]));
    const orden = [1, 2, 3, 4, 5, 6, 0]; // Lun→Dom
    const completa: TendenciaSemanal[] = orden.map((dow) => ({
      semana: dow,
      ocupacion: 0,
      totalTurnos: porDiaMap.get(dow) ?? 0,
    }));
    const maxDia = Math.max(...completa.map((m) => m.totalTurnos), 1);
    for (const m of completa) {
      m.ocupacion = m.totalTurnos / maxDia;
    }
    return completa;
  }

  const semanaMin = sinAjuste[0].semana;
  const mapped: TendenciaSemanal[] = sinAjuste.map((r) => ({
    semana: r.semana - semanaMin + 1,
    ocupacion: 0,
    totalTurnos: r.totalTurnos,
  }));

  const maxSemanal = Math.max(...mapped.map((m) => m.totalTurnos), 1);

  for (const m of mapped) {
    m.ocupacion = m.totalTurnos / maxSemanal;
  }

  return mapped;
}

async function calcularNoShowPorFranja(
  sucursalIds: string[],
  desde: Date,
  medicoId?: string,
): Promise<NoShowFranja[]> {
  const conditions: SQL[] = [
    gte(turnos.fechaHora, desde),
    isNull(turnos.deletedAt),
    inArray(turnos.sucursalId, sucursalIds),
  ];
  if (medicoId) {
    conditions.push(eq(turnos.medicoId, medicoId));
  }

  const rows = await db
    .select({
      dia: sql<number>`EXTRACT(DOW FROM ${turnos.fechaHora})::int`,
      hora: sql<number>`EXTRACT(HOUR FROM ${turnos.fechaHora})::int`,
      total: sql<number>`COUNT(*)::int`,
      noShow: sql<number>`COUNT(*) FILTER (WHERE ${turnos.estado} = 'no_asistio')::int`,
    })
    .from(turnos)
    .where(and(...conditions))
    .groupBy(sql`1`, sql`2`);

  return (rows as unknown as Array<{ dia: number; hora: number; total: number; noShow: number }>)
    .filter((r) => r.total > 0)
    .map((r) => ({
      dia: r.dia,
      hora: r.hora,
      tasaNoShow: Number(r.noShow) / Number(r.total),
    }));
}

function calcularResumen(franjas: FranjaOcupacion[]): ResumenOcupacion {
  if (!franjas.length) {
    return {
      ocupacionGeneral: 0,
      franjaPico: { dia: 0, hora: 0, ocupacion: 0 },
      franjaMasFloja: { dia: 0, hora: 0, ocupacion: 0 },
      tendenciaVsAnterior: 0,
    };
  }

  const conTurnos = franjas.filter((f) => f.total > 0);
  const ocupacionGeneral =
    conTurnos.length > 0 ? conTurnos.reduce((s, f) => s + f.ocupacion, 0) / conTurnos.length : 0;

  const pico = franjas.reduce((max, f) => (f.ocupacion > max.ocupacion ? f : max), franjas[0]);
  const floja = conTurnos.reduce(
    (min, f) => (f.ocupacion < min.ocupacion ? f : min),
    conTurnos[0] || franjas[0],
  );

  return {
    ocupacionGeneral: Math.round(ocupacionGeneral * 100) / 100,
    franjaPico: { dia: pico.dia, hora: pico.hora, ocupacion: pico.ocupacion },
    franjaMasFloja: { dia: floja.dia, hora: floja.hora, ocupacion: floja.ocupacion },
    tendenciaVsAnterior: 0,
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
    tendencias:
      semanas === 1
        ? [1, 2, 3, 4, 5, 6, 0].map((dia) => {
            const total = 15 + Math.round(Math.random() * 20);
            return {
              semana: dia,
              ocupacion: 0.45 + Math.sin(dia * 0.9) * 0.25,
              totalTurnos: total,
            };
          })
        : Array.from({ length: semanas }, (_, i) => ({
            semana: i + 1,
            ocupacion: 0.45 + Math.sin(i * 0.8) * 0.25 + Math.round(Math.random() * 2 - 1) * 0.1,
            totalTurnos: 20 + Math.round(Math.random() * 10),
          })),
    noShowPorFranja: [],
    resumen: {
      ocupacionGeneral: 0.58,
      franjaPico: { dia: 4, hora: 10, ocupacion: 0.92 },
      franjaMasFloja: { dia: 2, hora: 14, ocupacion: 0.15 },
      tendenciaVsAnterior: 0.12,
    },
  };
}

/**
 * Genera una grilla completa 7 días × 24 horas para el heatmap,
 * completando con ocupación 0 las franjas sin turnos.
 * El front recibe esta grilla para renderizar sin lógica extra.
 * @param reporte
 */
export function construirGrillaOcupacion(reporte: OcupacionReporte): number[][] {
  const grilla: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0) as number[]);
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
 * @param opts.medicoId
 * @param opts.semanas
 */
export async function calcularOcupacionTenant(opts?: {
  sucursalId?: string;
  tenantId?: string;
  medicoId?: string;
  semanas?: number;
}): Promise<OcupacionReporte> {
  if (opts?.tenantId && opts.tenantId !== getTenantId()) {
    await setTenantContext(opts.tenantId);
  }
  return calcularOcupacionFranjas(opts);
}
