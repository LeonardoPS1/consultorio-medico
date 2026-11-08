import { describe, it, expect } from 'vitest';
import {
  calcularScoreDesdeFactores,
  calcularNivelScore,
  PESOS_SCORING,
  UMBRAL_ALTO,
  UMBRAL_MEDIO,
  type ScoringFactores,
} from '@/lib/scoring-formula';

// Reemplaza a `scoring-deterministic.test.ts`, que intentaba ejercitar
// `calcularScorePaciente` contra PostgreSQL real: en jsdom no hay DB y sus
// fixtures usaban paciente/médico/sucursal inexistentes (FK inválidas), por lo
// que la suite nunca pudo pasar. La aritmética se prueba acá, sin DB.

function factores(overrides: Partial<ScoringFactores> = {}): ScoringFactores {
  return {
    noShows: 0,
    cancelacionesSinAviso: 0,
    totalTurnos: 0,
    turnosConfirmados: 0,
    recordatoriosLeidos: 0,
    recordatoriosEnviados: 0,
    ...overrides,
  };
}

describe('calcularScoreDesdeFactores', () => {
  it('devuelve 0 / bajo para un paciente sin historial', () => {
    const result = calcularScoreDesdeFactores(factores());
    expect(result.score).toBe(0);
    expect(result.nivel).toBe('bajo');
  });

  it('trata totalTurnos negativo o cero como sin historial', () => {
    expect(calcularScoreDesdeFactores(factores({ totalTurnos: -3 })).score).toBe(0);
  });

  it('es determinístico para el mismo dataset', () => {
    const dataset = factores({
      noShows: 2,
      cancelacionesSinAviso: 1,
      totalTurnos: 10,
      turnosConfirmados: 7,
      recordatoriosLeidos: 5,
      recordatoriosEnviados: 8,
    });

    const a = calcularScoreDesdeFactores(dataset);
    const b = calcularScoreDesdeFactores(dataset);
    const c = calcularScoreDesdeFactores({ ...dataset });

    expect(a).toEqual(b);
    expect(b).toEqual(c);
  });

  it('calcula el score esperado para 2 no-shows, 1 cancelación y 5/8 recordatorios', () => {
    // noShows:  0.2 * 40 * 2 = 16
    // cancel:   0.1 * 25 * 2 = 5
    // confirm:  (1 - 0.7) * 20 = 6
    // records:  (1 - 0.625) * 10 = 3.75
    // bonif:    min(8 * 0.5, 5) = 4
    // total:    16 + 5 + 6 + 3.75 - 4 = 26.75 → 26.8
    const result = calcularScoreDesdeFactores(
      factores({
        noShows: 2,
        cancelacionesSinAviso: 1,
        totalTurnos: 10,
        turnosConfirmados: 7,
        recordatoriosLeidos: 5,
        recordatoriosEnviados: 8,
      }),
    );

    expect(result.score).toBe(26.8);
    expect(result.nivel).toBe('bajo');
  });

  it('penaliza los no-shows hasta el tope del peso', () => {
    // 3/5 no-shows = 0.6 → 0.6 * 40 * 2 = 48 → tope 40
    // confirm: (1 - 0.4) * 20 = 12
    // records enviados 0 → 10
    // bonif: min(2 * 0.5, 5) = 1
    // total: 40 + 0 + 12 + 10 - 1 = 61
    const result = calcularScoreDesdeFactores(
      factores({
        noShows: 3,
        totalTurnos: 5,
        turnosConfirmados: 2,
      }),
    );

    expect(result.score).toBe(61);
    expect(result.nivel).toBe('medio');
  });

  it('no aplica penalización de recordatorios si nunca se enviaron', () => {
    const conEnvios = calcularScoreDesdeFactores(
      factores({ totalTurnos: 4, recordatoriosEnviados: 4, recordatoriosLeidos: 4 }),
    );
    const sinEnvios = calcularScoreDesdeFactores(
      factores({ totalTurnos: 4, recordatoriosEnviados: 0, recordatoriosLeidos: 0 }),
    );

    // Sin envíos ⇒ ratioLectura 0 ⇒ penalización máxima del peso (10)
    expect(sinEnvios.score - conEnvios.score).toBe(PESOS_SCORING.recordatorios);
  });

  it('nunca devuelve un score fuera de 0-100', () => {
    const peor = calcularScoreDesdeFactores(
      factores({ totalTurnos: 4, noShows: 4, cancelacionesSinAviso: 4 }),
    );
    const mejor = calcularScoreDesdeFactores(
      factores({ totalTurnos: 20, turnosConfirmados: 20, recordatoriosEnviados: 20, recordatoriosLeidos: 20 }),
    );

    expect(peor.score).toBeLessThanOrEqual(100);
    expect(peor.score).toBeGreaterThanOrEqual(0);
    expect(mejor.score).toBe(0);
    expect(mejor.nivel).toBe('bajo');
  });

  it('redondea a un decimal sin alterar el nivel', () => {
    const result = calcularScoreDesdeFactores(
      factores({
        noShows: 1,
        totalTurnos: 3,
        turnosConfirmados: 2,
        recordatoriosEnviados: 3,
        recordatoriosLeidos: 1,
      }),
    );

    expect(Number.isInteger(result.score * 10)).toBe(true);
    expect(result.nivel).toBe(calcularNivelScore(result.score));
  });
});

describe('calcularNivelScore', () => {
  it('clasifica según los umbrales', () => {
    expect(calcularNivelScore(0)).toBe('bajo');
    expect(calcularNivelScore(UMBRAL_MEDIO - 0.1)).toBe('bajo');
    expect(calcularNivelScore(UMBRAL_MEDIO)).toBe('medio');
    expect(calcularNivelScore(UMBRAL_ALTO - 0.1)).toBe('medio');
    expect(calcularNivelScore(UMBRAL_ALTO)).toBe('alto');
    expect(calcularNivelScore(100)).toBe('alto');
  });
});
