/**
 * Tests de integración para el sistema de Encuestas Post-Consulta.
 *
 * Cubre: detección de respuestas de encuesta en mensajes WhatsApp,
 * casos límite y escenarios reales.
 */

import { describe, it, expect } from 'vitest';
import { detectSurveyResponse } from '@/lib/encuestas';

// ══════════════════════════════════════════════════════════════
// detectSurveyResponse
// ══════════════════════════════════════════════════════════════

describe('detectSurveyResponse', () => {
  // ─── Casos básicos (solo número) ──────────────────────────

  describe('números sueltos (1-5)', () => {
    it('detecta "1" como encuesta puntaje 1', () => {
      const result = detectSurveyResponse('1');
      expect(result.esEncuesta).toBe(true);
      expect(result.puntaje).toBe(1);
    });

    it('detecta "3" como encuesta puntaje 3', () => {
      const result = detectSurveyResponse('3');
      expect(result.esEncuesta).toBe(true);
      expect(result.puntaje).toBe(3);
    });

    it('detecta "5" como encuesta puntaje 5', () => {
      const result = detectSurveyResponse('5');
      expect(result.esEncuesta).toBe(true);
      expect(result.puntaje).toBe(5);
    });

    it('NO detecta "0" como encuesta (fuera de rango)', () => {
      const result = detectSurveyResponse('0');
      expect(result.esEncuesta).toBe(false);
      expect(result.puntaje).toBeUndefined();
    });

    it('NO detecta "6" como encuesta (fuera de rango)', () => {
      const result = detectSurveyResponse('6');
      expect(result.esEncuesta).toBe(false);
      expect(result.puntaje).toBeUndefined();
    });

    it('NO detecta "10" como encuesta', () => {
      const result = detectSurveyResponse('10');
      expect(result.esEncuesta).toBe(false);
    });
  });

  // ─── Número con texto ─────────────────────────────────────

  describe('número + texto', () => {
    it('detecta "5 excelente atención"', () => {
      const result = detectSurveyResponse('5 excelente atención');
      expect(result.esEncuesta).toBe(true);
      expect(result.puntaje).toBe(5);
    });

    it('detecta "2 maso"', () => {
      const result = detectSurveyResponse('2 maso');
      expect(result.esEncuesta).toBe(true);
      expect(result.puntaje).toBe(2);
    });

    it('detecta "4. muy bien" (con punto)', () => {
      const result = detectSurveyResponse('4. muy bien');
      expect(result.esEncuesta).toBe(true);
      expect(result.puntaje).toBe(4);
    });

    it('detecta "3, ok" (con coma)', () => {
      const result = detectSurveyResponse('3, ok');
      expect(result.esEncuesta).toBe(true);
      expect(result.puntaje).toBe(3);
    });
  });

  // ─── Con artículos ────────────────────────────────────────

  describe('con artículos (un/una)', () => {
    it('detecta "un 4"', () => {
      const result = detectSurveyResponse('un 4');
      expect(result.esEncuesta).toBe(true);
      expect(result.puntaje).toBe(4);
    });

    it('detecta "una 5"', () => {
      const result = detectSurveyResponse('una 5');
      expect(result.esEncuesta).toBe(true);
      expect(result.puntaje).toBe(5);
    });

    it('detecta "5" sin artículo (regex alternativo)', () => {
      const result = detectSurveyResponse('5');
      expect(result.esEncuesta).toBe(true);
      expect(result.puntaje).toBe(5);
    });
  });

  // ─── Casos que NO son encuesta ────────────────────────────

  describe('mensajes que NO son encuesta', () => {
    const noEncuestas = [
      'hola doctor',
      'gracias',
      'si',
      'no',
      'mañana a las 10',
      'ok',
      '👍',
      'me duele la cabeza',
      'número de teléfono 1122334455',
      '', // vacío
      '   ', // solo espacios (trim da '', no matchea ^[1-5]$)
    ];

    noEncuestas.forEach((msg) => {
      it(`NO detecta "${msg}" como encuesta`, () => {
        const result = detectSurveyResponse(msg);
        expect(result.esEncuesta).toBe(false);
      });
    });
  });

  // ─── Casos límite ─────────────────────────────────────────

  describe('casos límite', () => {
    it('trim spaces: "  3  " se detecta como 3', () => {
      const result = detectSurveyResponse('  3  ');
      expect(result.esEncuesta).toBe(true);
      expect(result.puntaje).toBe(3);
    });

    it('número con mucho texto después: "5 la verdad que excelente todo muy conforme"', () => {
      const result = detectSurveyResponse('5 la verdad que excelente todo muy conforme');
      expect(result.esEncuesta).toBe(true);
      expect(result.puntaje).toBe(5);
    });

    it('número de teléfono no se confunde: "15 2345 6789"', () => {
      // "15" ya no es falso positivo gracias a \b en el regex
      const result = detectSurveyResponse('15 2345 6789');
      expect(result.esEncuesta).toBe(false);
    });

    it('emoji + número: "4 👍 gracias"', () => {
      const result = detectSurveyResponse('4 👍 gracias');
      expect(result.esEncuesta).toBe(true);
      expect(result.puntaje).toBe(4);
    });

    it('solo espacios devuelve false', () => {
      const result = detectSurveyResponse('   ');
      expect(result.esEncuesta).toBe(false);
    });
  });

  // ─── Escenarios de producción ─────────────────────────────

  describe('escenarios reales de WhatsApp', () => {
    it('respuesta típica corta: "5"', () => {
      expect(detectSurveyResponse('5')).toEqual({ esEncuesta: true, puntaje: 5 });
    });

    it('respuesta con comentario: "4 muy buena la atención gracias"', () => {
      const result = detectSurveyResponse('4 muy buena la atención gracias');
      expect(result.esEncuesta).toBe(true);
      expect(result.puntaje).toBe(4);
    });

    it('queja educada: "2 la espera fue muy larga"', () => {
      const result = detectSurveyResponse('2 la espera fue muy larga');
      expect(result.esEncuesta).toBe(true);
      expect(result.puntaje).toBe(2);
    });

    it('mensaje normal que casualmente empieza con número: "3 días de reposo me dijo"', () => {
      const result = detectSurveyResponse('3 días de reposo me dijo');
      // Esto lo detecta como encuesta (falso positivo por empezar con 3)
      expect(result.esEncuesta).toBe(true);
      expect(result.puntaje).toBe(3);
    });
  });
});
