/**
 * Planes de suscripción — fuente única de verdad.
 *
 * Este archivo es el CANON para todos los planes del sistema.
 * TODO lo demás (landing page, mercadopago, suscripcion-tab, features)
 * debe importar desde acá.
 */

// ============================================================
// Tipos
// ============================================================

export type PlanId = 'free' | 'starter' | 'professional' | 'premium' | 'enterprise';

export interface PlanInfo {
  id: PlanId;
  nombre: string;
  precioUSD: number;
  precioCLP: number;
  precioARS: number;
  descripcion: string;
  popular: boolean;
  features: string[];
  cta: string;
}

// ============================================================
// Tipo de cambio referencial (1 USD → ?)
// ============================================================

export const USD_TO_CLP = 950;
export const USD_TO_ARS = 1100;

// ============================================================
// Planes
// ============================================================

export const PLANES: Record<PlanId, PlanInfo> = {
  free: {
    id: 'free',
    nombre: 'Free',
    precioUSD: 0,
    precioCLP: 0,
    precioARS: 0,
    descripcion: 'Para probar la plataforma',
    popular: false,
    features: [
      'Panel Principal con KPIs',
      'Hasta 20 pacientes',
      '5 turnos por mes',
      'App instalable (PWA)',
    ],
    cta: 'Comenzar gratis',
  },
  starter: {
    id: 'starter',
    nombre: 'Starter',
    precioUSD: 49,
    precioCLP: 49 * USD_TO_CLP,
    precioARS: 49 * USD_TO_ARS,
    descripcion: 'Para consultorios individuales',
    popular: false,
    features: [
      'Pacientes ilimitados',
      'Turnos ilimitados',
      'Recordatorios WhatsApp automáticos',
      'Historia clínica digital con CIE-10',
      'Recetas digitales',
      'Conversaciones WhatsApp',
      'Reportes y estadísticas',
      'Horarios de atención configurables',
      'Notificaciones personalizables',
      '1 profesional',
    ],
    cta: 'Suscribirse',
  },
  professional: {
    id: 'professional',
    nombre: 'Profesional',
    precioUSD: 99,
    precioCLP: 99 * USD_TO_CLP,
    precioARS: 99 * USD_TO_ARS,
    descripcion: 'Para consultorios en crecimiento',
    popular: true,
    features: [
      'Todo lo de Starter +',
      'Asistente IA (triaje + respuestas automáticas)',
      'Reportes avanzados + Exportación Excel/PDF',
      'Plantillas WhatsApp personalizables',
      'Autenticación 2FA / Seguridad avanzada',
      'Bloqueos de agenda por horario',
      'Hasta 5 profesionales',
    ],
    cta: 'Suscribirse',
  },
  premium: {
    id: 'premium',
    nombre: 'Premium',
    precioUSD: 199,
    precioCLP: 199 * USD_TO_CLP,
    precioARS: 199 * USD_TO_ARS,
    descripcion: 'Para clinicas y centros medicos',
    popular: false,
    features: [
      'Todo lo de Profesional +',
      'Profesionales ilimitados',
      'Workflows n8n + automatizaciones',
      'Registro de auditoría completo',
      'Backup encriptado automático',
      'Panel de administración de equipo',
      'Credenciales centralizadas',
      'Registro de webhooks',
    ],
    cta: 'Suscribirse',
  },
  enterprise: {
    id: 'enterprise',
    nombre: 'Enterprise',
    precioUSD: 499,
    precioCLP: 499 * USD_TO_CLP,
    precioARS: 499 * USD_TO_ARS,
    descripcion: 'Para grandes centros y redes medicas',
    popular: false,
    features: [
      'Todo lo de Premium +',
      'Multi-sucursal / Multi-tenant',
      'Panel de administración global',
      'Integraciones personalizadas',
      'Onboarding asistido',
      'Gerente de cuenta dedicado',
    ],
    cta: 'Contactar',
  },
};

/** Lista ordenada de planes (de menor a mayor) */
export const PLANES_ORDERED: PlanInfo[] = [
  PLANES.free,
  PLANES.starter,
  PLANES.professional,
  PLANES.premium,
  PLANES.enterprise,
];

/**
 * Jerarquía de planes: compara si `plan` tiene al menos el nivel de `required`.
 * Ej: hasPlanOrAbove('professional', 'starter') → true
 *     hasPlanOrAbove('starter', 'professional') → false
 */
const PLAN_HIERARCHY: Record<PlanId, number> = {
  free: 0,
  starter: 1,
  professional: 2,
  premium: 3,
  enterprise: 4,
};

export function hasPlanOrAbove(current: PlanId, required: PlanId): boolean {
  return PLAN_HIERARCHY[current] >= PLAN_HIERARCHY[required];
}

/** IDs de planes válidos para MercadoPago (excluye free) */
export const PAID_PLANS: PlanId[] = ['starter', 'professional', 'premium', 'enterprise'];
