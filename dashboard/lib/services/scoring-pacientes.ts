// ============================================================
// Scoring de Confiabilidad de Pacientes
// ============================================================
//
// Calcula un score 0-100 basado en:
//   - No-shows (x40)     — ausencias sin aviso
//   - Cancelaciones (x25) — cancelación sin aviso previo
//   - Tasa confirmación (x20) — % de turnos confirmados
//   - Lectura recordatorios (x10) — % de recordatorios leídos
//   - Asistencia histórica (x5+) — bonificación por asistencias acumuladas
//
// Niveles:
//   - Bajo riesgo (0-39)   → ✅ Score bueno
//   - Medio riesgo (40-69) → ⚠️  Atención
//   - Alto riesgo (70-100) → 🔴 Riesgo de ausentismo
// ============================================================

import { db } from '@/lib/db';
import { turnos } from '@/drizzle/schema';
import { and, eq, gte, lte, sql, count, inArray, isNull } from 'drizzle-orm';

// ─── Tipos ────────────────────────────────────────────

export interface ScoringResult {
  pacienteId: string;
  score: number;
  nivel: ScoringNivel;
  factores: ScoringFactores;
  fechaCalculo: string;
}

export type ScoringNivel = 'bajo' | 'medio' | 'alto';

export interface ScoringFactores {
  noShows: number;
  cancelacionesSinAviso: number;
  totalTurnos: number;
  turnosConfirmados: number;
  recordatoriosLeidos: number;
  recordatoriosEnviados: number;
}

// ─── Constantes ───────────────────────────────────────

const VENTANA_DIAS = 90; // analizar últimos 90 días
const UMBRAL_ALTO = 70;
const UMBRAL_MEDIO = 40;

// Pesos de cada factor (suman ~100)
const PESOS = {
  noShows: 40,
  cancelaciones: 25,
  confirmacion: 20,
  recordatorios: 10,
  asistencia: 5, // bonificación positiva
} as const;

// ─── Funciones ────────────────────────────────────────

function calcularNivel(score: number): ScoringNivel {
  if (score >= UMBRAL_ALTO) return 'alto';
  if (score >= UMBRAL_MEDIO) return 'medio';
  return 'bajo';
}

/**
 * Calcula el score de confiabilidad para un paciente específico.
 * Analiza los últimos VENTANA_DIAS días de turnos.
 */
export async function calcularScorePaciente(
  pacienteId: string,
  opts?: { sucursalId?: string },
): Promise<ScoringResult> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - VENTANA_DIAS);

  // ─── Condiciones base ──────────────────────────────
  const filtrosBase = [
    eq(turnos.pacienteId, pacienteId),
    gte(turnos.fechaHora, startDate),
    isNull(turnos.deletedAt),
  ];
  if (opts?.sucursalId) {
    filtrosBase.push(eq(turnos.sucursalId, opts.sucursalId));
  }

  // ─── Total de turnos en ventana ─────────────────────
  const [totalRow] = await db
    .select({ total: count() })
    .from(turnos)
    .where(and(...filtrosBase));
  const totalTurnos = Number(totalRow?.total ?? 0);

  if (totalTurnos === 0) {
    return {
      pacienteId,
      score: 0,
      nivel: 'bajo',
      factores: {
        noShows: 0,
        cancelacionesSinAviso: 0,
        totalTurnos: 0,
        turnosConfirmados: 0,
        recordatoriosLeidos: 0,
        recordatoriosEnviados: 0,
      },
      fechaCalculo: new Date().toISOString(),
    };
  }

  // ─── No-shows (estado = 'no_asistio') ──────────────
  const [noShowsRow] = await db
    .select({ total: count() })
    .from(turnos)
    .where(and(...filtrosBase, eq(turnos.estado, 'no_asistio')));
  const noShows = Number(noShowsRow?.total ?? 0);

  // ─── Cancelaciones sin aviso (cancelada por dashboard, sin confirmación previa) ─
  const [cancelRow] = await db
    .select({ total: count() })
    .from(turnos)
    .where(and(
      ...filtrosBase,
      eq(turnos.estado, 'cancelada'),
      eq(turnos.canceladoPor, 'dashboard'),
      sql`${turnos.confirmoAsistencia} IS DISTINCT FROM true`,
    ));
  const cancelacionesSinAviso = Number(cancelRow?.total ?? 0);

  // ─── Turnos confirmados ────────────────────────────
  const [confirmRow] = await db
    .select({ total: count() })
    .from(turnos)
    .where(and(...filtrosBase, eq(turnos.confirmoAsistencia, true)));
  const turnosConfirmados = Number(confirmRow?.total ?? 0);

  // ─── Recordatorios leídos ──────────────────────────
  const [leidosRow] = await db
    .select({ total: count() })
    .from(turnos)
    .where(and(
      ...filtrosBase,
      sql`(${turnos.recordatorio24hLeido} = true OR ${turnos.recordatorio1hLeido} = true)`,
    ));
  const recordatoriosLeidos = Number(leidosRow?.total ?? 0);

  const [enviadosRow] = await db
    .select({ total: count() })
    .from(turnos)
    .where(and(
      ...filtrosBase,
      sql`(${turnos.recordatorio24hEnviado} = true OR ${turnos.recordatorio1hEnviado} = true)`,
    ));
  const recordatoriosEnviados = Number(enviadosRow?.total ?? 0);

  // ─── Cálculo de scores parciales ───────────────────
  // No-shows: penalización proporcional (0-40)
  const ratioNoShows = noShows / totalTurnos;
  const scoreNoShows = Math.min(ratioNoShows * PESOS.noShows * 2, PESOS.noShows);

  // Cancelaciones: penalización proporcional (0-25)
  const ratioCancel = cancelacionesSinAviso / totalTurnos;
  const scoreCancel = Math.min(ratioCancel * PESOS.cancelaciones * 2, PESOS.cancelaciones);

  // Confirmación: inversa (menos confirmación = más riesgo) (0-20)
  const ratioConfirm = turnosConfirmados / totalTurnos;
  const scoreConfirm = (1 - ratioConfirm) * PESOS.confirmacion;

  // Recordatorios: inversa (menos lectura = más riesgo) (0-10)
  const ratioLectura = recordatoriosEnviados > 0
    ? recordatoriosLeidos / recordatoriosEnviados
    : 0;
  const scoreRecordatorios = (1 - ratioLectura) * PESOS.recordatorios;

  // Asistencia histórica: bonificación por asistencias (máximo -5)
  const asistencias = totalTurnos - noShows;
  const bonificacion = Math.min(asistencias * 0.5, PESOS.asistencia);

  // Score final (0-100)
  const score = Math.max(0, Math.min(100,
    scoreNoShows + scoreCancel + scoreConfirm + scoreRecordatorios - bonificacion,
  ));

  return {
    pacienteId,
    score: Math.round(score * 10) / 10,
    nivel: calcularNivel(score),
    factores: {
      noShows,
      cancelacionesSinAviso,
      totalTurnos,
      turnosConfirmados,
      recordatoriosLeidos,
      recordatoriosEnviados,
    },
    fechaCalculo: new Date().toISOString(),
  };
}

/**
 * Calcula score 0-100 con una sola query agregada por paciente.
 * Usa FILTER (WHERE ...) para contar múltiples condiciones sin subqueries.
 */
export async function calcularScoreBulk(
  pacienteIds: string[],
  opts?: { sucursalId?: string },
): Promise<ScoringResult[]> {
  if (pacienteIds.length === 0) return [];

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - VENTANA_DIAS);

  const filtros = [
    inArray(turnos.pacienteId, pacienteIds),
    gte(turnos.fechaHora, startDate),
    isNull(turnos.deletedAt),
  ];
  if (opts?.sucursalId) {
    filtros.push(eq(turnos.sucursalId, opts.sucursalId));
  }

  const rows = await db
    .select({
      pacienteId: turnos.pacienteId,
      totalTurnos: count().mapWith(Number),
      noShows: sql`count(*) FILTER (WHERE ${turnos.estado} = 'no_asistio')`.mapWith(Number),
      cancelacionesSinAviso: sql`count(*) FILTER (WHERE ${turnos.estado} = 'cancelada' AND ${turnos.canceladoPor} = 'dashboard' AND ${turnos.confirmoAsistencia} IS DISTINCT FROM true)`.mapWith(Number),
      turnosConfirmados: sql`count(*) FILTER (WHERE ${turnos.confirmoAsistencia} = true)`.mapWith(Number),
      recordatoriosLeidos: sql`count(*) FILTER (WHERE ${turnos.recordatorio24hLeido} = true OR ${turnos.recordatorio1hLeido} = true)`.mapWith(Number),
      recordatoriosEnviados: sql`count(*) FILTER (WHERE ${turnos.recordatorio24hEnviado} = true OR ${turnos.recordatorio1hEnviado} = true)`.mapWith(Number),
    })
    .from(turnos)
    .where(and(...filtros))
    .groupBy(turnos.pacienteId);

  const scores: ScoringResult[] = [];
  for (const row of rows) {
    const {
      pacienteId, totalTurnos, noShows, cancelacionesSinAviso,
      turnosConfirmados, recordatoriosLeidos, recordatoriosEnviados,
    } = row;

    if (totalTurnos === 0) continue;

    // Cálculos (misma lógica que calcularScorePaciente)
    const ratioNoShows = noShows / totalTurnos;
    const scoreNoShows = Math.min(ratioNoShows * PESOS.noShows * 2, PESOS.noShows);

    const ratioCancel = cancelacionesSinAviso / totalTurnos;
    const scoreCancel = Math.min(ratioCancel * PESOS.cancelaciones * 2, PESOS.cancelaciones);

    const ratioConfirm = turnosConfirmados / totalTurnos;
    const scoreConfirm = (1 - ratioConfirm) * PESOS.confirmacion;

    const ratioLectura = recordatoriosEnviados > 0
      ? recordatoriosLeidos / recordatoriosEnviados
      : 0;
    const scoreRecordatorios = (1 - ratioLectura) * PESOS.recordatorios;

    const asistencias = totalTurnos - noShows;
    const bonificacion = Math.min(asistencias * 0.5, PESOS.asistencia);

    const score = Math.max(0, Math.min(100,
      scoreNoShows + scoreCancel + scoreConfirm + scoreRecordatorios - bonificacion,
    ));

    scores.push({
      pacienteId,
      score: Math.round(score * 10) / 10,
      nivel: calcularNivel(score),
      factores: {
        noShows,
        cancelacionesSinAviso,
        totalTurnos,
        turnosConfirmados,
        recordatoriosLeidos,
        recordatoriosEnviados,
      },
      fechaCalculo: new Date().toISOString(),
    });
  }

  return scores;
}

/**
 * Calcula el score para todos los pacientes activos de una sucursal.
 * Retorna un Map para lookup rápido.
 * Refactorizada: usa calcularScoreBulk() en vez de loop N+1.
 */
export async function calcularTodosLosScores(opts?: { sucursalId?: string; limit?: number }): Promise<Map<string, ScoringResult>> {
  // Obtener IDs de pacientes con turnos en la ventana
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - VENTANA_DIAS);

  const filtros = [
    gte(turnos.fechaHora, startDate),
    isNull(turnos.deletedAt),
  ];
  if (opts?.sucursalId) {
    filtros.push(eq(turnos.sucursalId, opts.sucursalId));
  }

  const rows = await db
    .select({ pacienteId: turnos.pacienteId })
    .from(turnos)
    .where(and(...filtros))
    .groupBy(turnos.pacienteId)
    .limit(opts?.limit ?? 500);

  const pacienteIds = rows.map(r => r.pacienteId);
  if (pacienteIds.length === 0) return new Map();

  // Una sola query para todos
  const scores = await calcularScoreBulk(pacienteIds, { sucursalId: opts?.sucursalId });

  const scoresMap = new Map<string, ScoringResult>();
  for (const s of scores) {
    scoresMap.set(s.pacienteId, s);
  }

  return scoresMap;
}
