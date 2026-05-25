/**
 * Feature gating por plan de suscripción.
 *
 * Define qué funcionalidades están disponibles en cada plan.
 * La fuente de verdad de los planes está en lib/planes.ts.
 */

import type { PlanId } from '@/lib/planes';
import { PLANES } from '@/lib/planes';
import { useSession } from 'next-auth/react';

// ============================================================
// IDs de features — todas las funcionalidades del sistema
// ============================================================

export type FeatureId =
  | 'panel-principal'
  | 'atencion'
  | 'turnos'
  | 'pacientes'
  | 'conversaciones'
  | 'recetas'
  | 'reportes'
  | 'horarios'
  | 'notificaciones'
  | 'reportes-avanzados'
  | 'ia-assistant'
  | 'plantillas'
  | '2fa'
  | 'equipo'
  | 'integraciones'
  | 'auditoria'
  | 'backup-encriptado'
  | 'webhooks-log'
  | 'credenciales'
  | 'api-publica'
  | 'portal-paciente'
  | 'multi-sucursal';

// ============================================================
// Feature map: qué plan necesitás para cada feature
// ============================================================

export const FEATURE_PLAN: Record<FeatureId, PlanId> = {
  'panel-principal': 'free',
  'atencion': 'starter',
  'turnos': 'starter',
  'pacientes': 'starter',
  'conversaciones': 'starter',
  'recetas': 'starter',
  'reportes': 'starter',
  'horarios': 'starter',
  'notificaciones': 'starter',
  'reportes-avanzados': 'professional',
  'ia-assistant': 'professional',
  'plantillas': 'professional',
  '2fa': 'professional',
  'equipo': 'professional',
  'integraciones': 'premium',
  'auditoria': 'premium',
  'backup-encriptado': 'premium',
  'webhooks-log': 'premium',
  'credenciales': 'premium',
  'api-publica': 'professional',
  'portal-paciente': 'starter',
  'multi-sucursal': 'enterprise',
};

// ============================================================
// Helper: ¿el plan X tiene acceso a la feature Y?
// ============================================================

/** Planes ordenados por nivel (jerarquía) */
const PLAN_ORDER: Record<PlanId, number> = {
  free: 0,
  starter: 1,
  professional: 2,
  premium: 3,
  enterprise: 4,
};

/**
 * Verifica si un plan tiene acceso a una funcionalidad.
 *
 * @example canAccess('professional', 'turnos') → true
 * @example canAccess('starter', 'ia-assistant') → false
 */
export function canAccess(plan: PlanId | string | undefined, feature: FeatureId): boolean {
  if (!plan) return false;
  const required = FEATURE_PLAN[feature];
  if (!required) return false; // feature desconocida
  const userLevel = PLAN_ORDER[plan as PlanId] ?? -1;
  const requiredLevel = PLAN_ORDER[required];
  return userLevel >= requiredLevel;
}

/**
 * Dado un plan, devuelve la lista de features disponibles.
 */
export function getAvailableFeatures(plan: PlanId): FeatureId[] {
  return (Object.keys(FEATURE_PLAN) as FeatureId[]).filter((f) => canAccess(plan, f));
}

/**
 * Devuelve el nombre del plan requerido para una feature.
 * Ej: getFeatureRequiredPlan('integraciones') → 'Premium'
 */
export function getFeatureRequiredPlan(feature: FeatureId): string {
  const planId = FEATURE_PLAN[feature];
  return PLANES[planId]?.nombre ?? planId;
}

// ============================================================
// React Hook (cliente)
// ============================================================

/**
 * Hook para components client. Usa la sesión de NextAuth.
 * Si no hay sesión o no tiene plan, asume 'free'.
 */
export function useCanAccess(feature: FeatureId): boolean {
  const { data: session } = useSession();
  const plan = (session?.user as { plan?: string } | undefined)?.plan ?? 'free';
  return canAccess(plan, feature);
}

/**
 * Devuelve el plan del usuario desde la sesión.
 */
export function useUserPlan(): PlanId {
  const { data: session } = useSession();
  return ((session?.user as { plan?: string } | undefined)?.plan ?? 'free') as PlanId;
}
