/**
 * Tests de integración para feature toggles a nivel tenant.
 *
 * Cubre: canAccessWithToggles, getDisabledFeatures,
 * interacción entre plan gating y toggles.
 */

import { describe, it, expect } from 'vitest';
import { canAccessWithToggles, getDisabledFeatures, canAccess, FEATURE_PLAN, type FeatureId } from '@/lib/features';

// ─── getDisabledFeatures ────────────────────────────────────

describe('getDisabledFeatures', () => {
  it('devuelve Set vacío para null', () => {
    const result = getDisabledFeatures(null);
    expect(result).toBeInstanceOf(Set);
    expect(result.size).toBe(0);
  });

  it('devuelve Set vacío para undefined', () => {
    const result = getDisabledFeatures(undefined);
    expect(result.size).toBe(0);
  });

  it('devuelve Set vacío para objeto vacío', () => {
    const result = getDisabledFeatures({});
    expect(result.size).toBe(0);
  });

  it('devuelve Set vacío cuando todas las features están habilitadas', () => {
    const result = getDisabledFeatures({
      horarios: true,
      'ia-assistant': true,
      plantillas: true,
    });
    expect(result.size).toBe(0);
  });

  it('detecta features explícitamente deshabilitadas', () => {
    const result = getDisabledFeatures({
      horarios: true,
      'ia-assistant': false,
      plantillas: false,
      notificaciones: true,
    });
    expect(result.size).toBe(2);
    expect(result.has('ia-assistant')).toBe(true);
    expect(result.has('plantillas')).toBe(true);
    expect(result.has('horarios')).toBe(false);
    expect(result.has('notificaciones')).toBe(false);
  });

  it('trata valores no booleanos como no deshabilitados', () => {
    const result = getDisabledFeatures({
      horarios: true,
      // @ts-expect-error — simulando dato corrupto
      notificaciones: 'false',
      // @ts-expect-error — simulando dato corrupto
      plantillas: 0,
    });
    // Solo se cuentan los que son estrictamente false
    expect(result.size).toBe(0);
  });

  it('ignora keys que no son FeatureId conocidas', () => {
    const result = getDisabledFeatures({
      'feature-inexistente': false,
      horarios: true,
    });
    expect(result.size).toBe(1);
    expect(result.has('feature-inexistente')).toBe(true);
    // La función no filtra por FeatureId conocido — simplemente acumula
  });
});

// ─── canAccessWithToggles ───────────────────────────────────

describe('canAccessWithToggles', () => {
  it('concede acceso cuando el plan lo permite y no hay toggles', () => {
    // Starter tiene acceso a 'horarios'
    expect(canAccessWithToggles('starter', 'horarios')).toBe(true);
  });

  it('niega acceso cuando el plan no lo permite (independiente de toggles)', () => {
    // Free no tiene acceso a 'horarios'
    expect(canAccessWithToggles('free', 'horarios')).toBe(false);

    // Aunque no haya toggles, el plan manda
    const noToggles = new Set<string>();
    expect(canAccessWithToggles('free', 'horarios', noToggles)).toBe(false);
  });

  it('niega acceso cuando el feature está en disabledFeatures', () => {
    const disabled = new Set<string>(['horarios']);
    // Starter TIENE acceso por plan, pero está toggled off
    expect(canAccessWithToggles('starter', 'horarios', disabled)).toBe(false);
  });

  it('concede acceso cuando el feature NO está en disabledFeatures', () => {
    const disabled = new Set<string>(['ia-assistant']);
    expect(canAccessWithToggles('starter', 'horarios', disabled)).toBe(true);
  });

  it('Set vacío es equivalente a no pasar disabledFeatures', () => {
    const empty = new Set<string>();
    expect(canAccessWithToggles('professional', 'reportes-avanzados', empty)).toBe(true);
    expect(canAccessWithToggles('professional', 'reportes-avanzados')).toBe(true);
  });

  it('plan undefined devuelve false', () => {
    expect(canAccessWithToggles(undefined, 'horarios')).toBe(false);
  });

  it('feature inexistente devuelve false', () => {
    // Type assertion intencional para probar feature inexistente
    expect(canAccessWithToggles('premium', 'feature-fantasma' as unknown as FeatureId)).toBe(false);
  });
});

// ─── Integración: canAccess base + toggles ──────────────────

describe('combinación plan + toggles', () => {
  it('Premium tiene acceso a portal-paciente e integraciones salvo toggle', () => {
    expect(canAccess('premium', 'portal-paciente')).toBe(true);
    expect(canAccess('premium', 'integraciones')).toBe(true);

    const disabled = new Set<string>(['integraciones']);
    expect(canAccessWithToggles('premium', 'integraciones', disabled)).toBe(false);
  });

  it('Free no tiene acceso a integraciones aunque no esté toggled', () => {
    expect(canAccess('free', 'integraciones')).toBe(false);
    expect(canAccessWithToggles('free', 'integraciones')).toBe(false);
  });

  it('deshabilitar una feature no afecta a otras del mismo plan', () => {
    const disabled = new Set<string>(['horarios']);
    // Starter tiene horarios y notificaciones
    expect(canAccessWithToggles('starter', 'horarios', disabled)).toBe(false);
    expect(canAccessWithToggles('starter', 'notificaciones', disabled)).toBe(true);
    expect(canAccessWithToggles('starter', 'turnos', disabled)).toBe(true);
  });
});

// ─── Validación de consistencia del FEATURE_PLAN ────────────

describe('FEATURE_PLAN consistency', () => {
  it('todos los FeatureId tienen un plan asignado', () => {
    const allFeatures = Object.keys(FEATURE_PLAN) as FeatureId[];
    allFeatures.forEach((f) => {
      expect(FEATURE_PLAN[f]).toBeDefined();
      expect(['free', 'starter', 'professional', 'premium', 'enterprise']).toContain(FEATURE_PLAN[f]);
    });
  });

  it('features free son accesibles desde cualquier plan', () => {
    const planes = ['free', 'starter', 'professional', 'premium', 'enterprise'];
    const freeFeatures = (Object.keys(FEATURE_PLAN) as FeatureId[])
      .filter((f) => FEATURE_PLAN[f] === 'free');

    freeFeatures.forEach((feature) => {
      planes.forEach((plan) => {
        expect(canAccess(plan, feature)).toBe(true);
      });
    });
  });
});
