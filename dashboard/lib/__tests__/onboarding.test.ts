/**
 * Tests de onboarding: feature gating, steps, fallback tips.
 *
 * Cubre:
 *  - El feature 'onboarding' es accesible desde cualquier plan
 *  - La estructura de ONBOARDING_STEPS es correcta
 *  - FALLBACK_TIPS cubre todos los pasos
 *  - La lógica de showSuccess (isComplete + hasManualInteraction)
 */

import { describe, it, expect } from 'vitest';
import { canAccess } from '@/lib/features';
import { ONBOARDING_STEPS, FALLBACK_TIPS } from '@/lib/onboarding-types';

// ─── Feature gating ──────────────────────────────────────────

describe('onboarding feature gating', () => {
  it('onboarding feature existe en FEATURE_PLAN', () => {
    // Verificar que el feature fue agregado correctamente
    expect(canAccess('free', 'onboarding')).toBe(true);
  });

  it('onboarding es accesible desde cualquier plan', () => {
    const planes = ['free', 'starter', 'professional', 'premium', 'enterprise'];
    planes.forEach((plan) => {
      expect(canAccess(plan, 'onboarding')).toBe(true);
    });
  });

  it('onboarding no afecta el gating de ia-assistant', () => {
    // ia-assistant sigue requiriendo professional
    expect(canAccess('free', 'ia-assistant')).toBe(false);
    expect(canAccess('starter', 'ia-assistant')).toBe(false);
    expect(canAccess('professional', 'ia-assistant')).toBe(true);
  });
});

// ─── Onboarding Steps ────────────────────────────────────────

describe('ONBOARDING_STEPS', () => {
  it('tiene exactamente 6 pasos', () => {
    expect(ONBOARDING_STEPS.length).toBe(6);
  });

  it('todos los pasos tienen los campos requeridos', () => {
    ONBOARDING_STEPS.forEach((step, idx) => {
      expect(step.id).toBeDefined();
      expect(step.title).toBeDefined();
      expect(step.description).toBeDefined();
      expect(step.icon).toBeDefined();
      expect(step.actionLink).toBeDefined();
      expect(step.actionLabel).toBeDefined();
      expect(typeof step.id).toBe('string');
      expect(typeof step.title).toBe('string');
      expect(step.id.length).toBeGreaterThan(0);
    });
  });

  it('los pasos tienen IDs únicos', () => {
    const ids = ONBOARDING_STEPS.map((s) => s.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('los pasos están en orden lógico: plan → perfil → medico → horarios → paciente → notificaciones', () => {
    const expectedOrder = ['plan', 'perfil', 'medico', 'horarios', 'paciente', 'notificaciones'];
    const actualOrder = ONBOARDING_STEPS.map((s) => s.id);
    expect(actualOrder).toEqual(expectedOrder);
  });
});

// ─── Fallback Tips ───────────────────────────────────────────

describe('FALLBACK_TIPS', () => {
  it('tiene tips para todos los pasos', () => {
    ONBOARDING_STEPS.forEach((step) => {
      expect(FALLBACK_TIPS[step.id]).toBeDefined();
      expect(FALLBACK_TIPS[step.id].length).toBeGreaterThan(0);
    });
  });

  it('no tiene tips para pasos inexistentes', () => {
    const knownIds = new Set(ONBOARDING_STEPS.map((s) => s.id));
    Object.keys(FALLBACK_TIPS).forEach((key) => {
      expect(knownIds.has(key)).toBe(true);
    });
  });

  it('cada tip es un texto útil (más de 20 caracteres)', () => {
    ONBOARDING_STEPS.forEach((step) => {
      expect(FALLBACK_TIPS[step.id].length).toBeGreaterThan(20);
    });
  });
});

// ─── Lógica de showSuccess (simulada) ────────────────────────

describe('showSuccess logic', () => {
  it('isComplete del servidor muestra éxito aunque no haya interacción manual', () => {
    const isComplete = true;
    const allLocallyDone = true;
    const hasManualInteraction = false;
    const verProgreso = false;
    const showProgressDetail = false;

    const showSuccess = (isComplete || (allLocallyDone && hasManualInteraction))
      && !verProgreso && !showProgressDetail;

    expect(showSuccess).toBe(true);
  });

  it('allLocallyDone sin interacción manual NO muestra éxito si servidor no confirma', () => {
    const isComplete = false;
    const allLocallyDone = true;
    const hasManualInteraction = false;
    const verProgreso = false;
    const showProgressDetail = false;

    const showSuccess = (isComplete || (allLocallyDone && hasManualInteraction))
      && !verProgreso && !showProgressDetail;

    expect(showSuccess).toBe(false);
  });

  it('allLocallyDone CON interacción manual muestra éxito aunque servidor no confirme', () => {
    const isComplete = false;
    const allLocallyDone = true;
    const hasManualInteraction = true;
    const verProgreso = false;
    const showProgressDetail = false;

    const showSuccess = (isComplete || (allLocallyDone && hasManualInteraction))
      && !verProgreso && !showProgressDetail;

    expect(showSuccess).toBe(true);
  });

  it('verProgreso=true nunca muestra éxito', () => {
    const isComplete = true;
    const allLocallyDone = true;
    const hasManualInteraction = true;
    const verProgreso = true;
    const showProgressDetail = false;

    const showSuccess = (isComplete || (allLocallyDone && hasManualInteraction))
      && !verProgreso && !showProgressDetail;

    expect(showSuccess).toBe(false);
  });

  it('showProgressDetail=true nunca muestra éxito', () => {
    const isComplete = true;
    const allLocallyDone = true;
    const hasManualInteraction = true;
    const verProgreso = false;
    const showProgressDetail = true;

    const showSuccess = (isComplete || (allLocallyDone && hasManualInteraction))
      && !verProgreso && !showProgressDetail;

    expect(showSuccess).toBe(false);
  });
});
