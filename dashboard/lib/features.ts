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
  | 'notas-soap'
  | 'certificados-qr'
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
  | 'multi-sucursal'
  | 'encuestas'
  | 'lista-espera'
  | 'n8n-monitor'
  | 'pwa'
  | 'firma-digital'
  | 'exportacion'
  | 'gcal-sync'
  | 'ia-autorespuestas'
  | 'ia-triaje'
  | 'ia-renovacion'
  | 'derivaciones'
  | 'alertas-inteligentes'
  | 'blacklist'
  | 'consentimiento-informado'
  | 'telemedicina'
  | 'onboarding'
  | 'scoring-pacientes'
  | 'historial'
  | 'web-vitals'
  | 'portal-analytics'
  | 'data-cache'
  | 'carga-masiva'
  | 'command-palette'
  | 'patient-panel'
  |   'ia-asistente-flotante'
  | 'compliance'
  | 'transcripcion-soap';

// ============================================================
// Feature map: qué plan necesitás para cada feature
// ============================================================

export const FEATURE_PLAN: Record<FeatureId, PlanId> = {
  'panel-principal': 'free',
  atencion: 'starter',
  turnos: 'starter',
  pacientes: 'starter',
  conversaciones: 'starter',
  recetas: 'starter',
  reportes: 'starter',
  horarios: 'starter',
  notificaciones: 'starter',
  'notas-soap': 'starter',
  encuestas: 'starter',
  historial: 'starter',
  'scoring-pacientes': 'starter',
  pwa: 'free',
  onboarding: 'free',
  'certificados-qr': 'professional',
  'reportes-avanzados': 'professional',
  'ia-assistant': 'professional',
  plantillas: 'professional',
  '2fa': 'professional',
  equipo: 'professional',
  'api-publica': 'professional',
  'lista-espera': 'professional',
  'firma-digital': 'professional',
  exportacion: 'professional',
  'ia-autorespuestas': 'professional',
  'ia-triaje': 'professional',
  'ia-renovacion': 'professional',
  derivaciones: 'professional',
  'alertas-inteligentes': 'professional',
  blacklist: 'professional',
  'consentimiento-informado': 'professional',
  telemedicina: 'professional',
  integraciones: 'premium',
  auditoria: 'premium',
  'backup-encriptado': 'premium',
  'webhooks-log': 'premium',
  credenciales: 'premium',
  'portal-paciente': 'premium',
  'n8n-monitor': 'premium',
  'gcal-sync': 'premium',
  'web-vitals': 'premium',
  'portal-analytics': 'premium',
  'data-cache': 'premium',
  'multi-sucursal': 'enterprise',
  'carga-masiva': 'enterprise',
  'command-palette': 'professional',
  'patient-panel': 'professional',
  'ia-asistente-flotante': 'professional',
  compliance: 'professional',
  'transcripcion-soap': 'starter',
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
// Feature Toggles (tenant-level enable/disable)
// ============================================================

/**
 * Verifica si un feature está habilitado a nivel tenant.
 * Combina plan gating + tenant toggles.
 *
 * @param plan - Plan del usuario
 * @param feature - Feature a verificar
 * @param disabledFeatures - Set de features deshabilitados a nivel tenant (opcional)
 *
 * Si no se pasan disabledFeatures, solo se verifica el plan.
 */
export function canAccessWithToggles(
  plan: PlanId | string | undefined,
  feature: FeatureId,
  disabledFeatures?: Set<string>,
): boolean {
  // Primero, verificar plan gating
  if (!canAccess(plan, feature)) return false;

  // Si no hay toggles configurados, acceso concedido
  if (!disabledFeatures || disabledFeatures.size === 0) return true;

  // Si el feature está explícitamente deshabilitado, denegar
  return !disabledFeatures.has(feature);
}

/**
 * Verifica acceso considerando también overrides por usuario.
 * Los overrides permiten que un admin habilite features de planes
 * superiores para usuarios específicos.
 *
 * Orden de precedencia:
 * 1. User override (feature_id en userOverrideFeatures) → SIEMPRE concede acceso
 * 2. Plan gating: si el plan del usuario NO alcanza → denegado
 * 3. Tenant toggle: si está deshabilitado → denegado
 * 4. Por defecto → concedido
 *
 * @param plan - Plan del usuario
 * @param feature - Feature a verificar
 * @param disabledFeatures - Set de features deshabilitados a nivel tenant
 * @param userOverrideFeatures - Set de features override para este usuario (opcional)
 */
export function canAccessWithUserOverrides(
  plan: PlanId | string | undefined,
  feature: FeatureId,
  disabledFeatures?: Set<string>,
  userOverrideFeatures?: Set<string>,
): boolean {
  // 1. User override: si tiene override explícito, conceder acceso
  if (userOverrideFeatures?.has(feature)) return true;

  // 2. Plan gating
  if (!canAccess(plan, feature)) return false;

  // 3. Tenant toggle
  if (disabledFeatures?.has(feature)) return false;

  return true;
}

/**
 * Dado un record de features_enabled del tenant, devuelve
 * el Set de features que están explícitamente deshabilitados.
 *
 * Los features que no aparecen en el record se consideran habilitados
 * (por defecto, todo lo que el plan permite está activo).
 */
export function getDisabledFeatures(
  featuresEnabled: Record<string, boolean> | null | undefined,
): Set<string> {
  if (!featuresEnabled) return new Set();

  const disabled = new Set<string>();
  for (const [key, value] of Object.entries(featuresEnabled)) {
    if (value === false) {
      disabled.add(key);
    }
  }
  return disabled;
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
