// ============================================================
// Fórmula de scoring de confiabilidad de pacientes (pura)
// ============================================================
//
// Extraída de `lib/services/scoring-pacientes.ts` para:
//   1. Eliminar la duplicación entre la versión individual y la bulk
//      (dos copias de la misma aritmética podían divergir sin que nadie
//      lo notara).
//   2. Poder testear el determinismo de la fórmula sin base de datos.
//
// Este módulo NO importa `db` ni el schema: es aritmética pura.

export type ScoringNivel = 'bajo' | 'medio' | 'alto';

export interface ScoringFactores {
  noShows: number;
  cancelacionesSinAviso: number;
  totalTurnos: number;
  turnosConfirmados: number;
  recordatoriosLeidos: number;
  recordatoriosEnviados: number;
}

/** Pesos de cada factor (suman 100 con la bonificación como resta). */
export const PESOS_SCORING = {
  noShows: 40,
  cancelaciones: 25,
  confirmacion: 20,
  recordatorios: 10,
  asistencia: 5,
} as const;

/** Score a partir del cual el paciente se considera de alto riesgo. */
export const UMBRAL_ALTO = 70;

/** Score a partir del cual el paciente se considera de riesgo medio. */
export const UMBRAL_MEDIO = 40;

/**
 * Clasifica un score numérico en un nivel de riesgo.
 * @param {number} score - Score sin redondear (0-100).
 * @returns {ScoringNivel} Nivel de riesgo.
 */
export function calcularNivelScore(score: number): ScoringNivel {
  if (score >= UMBRAL_ALTO) return 'alto';
  if (score >= UMBRAL_MEDIO) return 'medio';
  return 'bajo';
}

/**
 * Calcula el score 0-100 y su nivel a partir de los factores de un paciente.
 *
 * Los factores se cuentan dentro de la ventana de análisis (90 días) y ya
 * filtrados por sucursal cuando corresponde. La función es determinística:
 * los mismos factores producen siempre el mismo resultado.
 * @param {ScoringFactores} factores - Conteos agregados del paciente.
 * @returns {{ score: number; nivel: ScoringNivel }} Score redondeado a un decimal y nivel de riesgo (calculado sobre el valor sin redondear).
 */
export function calcularScoreDesdeFactores(factores: ScoringFactores): {
  score: number;
  nivel: ScoringNivel;
} {
  const {
    noShows,
    cancelacionesSinAviso,
    totalTurnos,
    turnosConfirmados,
    recordatoriosLeidos,
    recordatoriosEnviados,
  } = factores;

  if (totalTurnos <= 0) {
    return { score: 0, nivel: 'bajo' };
  }

  // No-shows: penalización proporcional (0-40)
  const ratioNoShows = noShows / totalTurnos;
  const scoreNoShows = Math.min(ratioNoShows * PESOS_SCORING.noShows * 2, PESOS_SCORING.noShows);

  // Cancelaciones sin aviso: penalización proporcional (0-25)
  const ratioCancel = cancelacionesSinAviso / totalTurnos;
  const scoreCancel = Math.min(
    ratioCancel * PESOS_SCORING.cancelaciones * 2,
    PESOS_SCORING.cancelaciones,
  );

  // Confirmación: inversa (menos confirmación = más riesgo) (0-20)
  const ratioConfirm = turnosConfirmados / totalTurnos;
  const scoreConfirm = (1 - ratioConfirm) * PESOS_SCORING.confirmacion;

  // Recordatorios: inversa (menos lectura = más riesgo) (0-10)
  const ratioLectura =
    recordatoriosEnviados > 0 ? recordatoriosLeidos / recordatoriosEnviados : 0;
  const scoreRecordatorios = (1 - ratioLectura) * PESOS_SCORING.recordatorios;

  // Asistencia histórica: bonificación por asistencias (máximo -5)
  const asistencias = totalTurnos - noShows;
  const bonificacion = Math.min(asistencias * 0.5, PESOS_SCORING.asistencia);

  const scoreBruto = Math.max(
    0,
    Math.min(
      100,
      scoreNoShows + scoreCancel + scoreConfirm + scoreRecordatorios - bonificacion,
    ),
  );

  return {
    score: Math.round(scoreBruto * 10) / 10,
    nivel: calcularNivelScore(scoreBruto),
  };
}
