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
  descripcion: string;
  popular: boolean;
  features: string[];
  cta: string;
}

// ============================================================
// Tipo de cambio referencial (1 USD → ? CLP)
// ============================================================

export const USD_TO_CLP = 950;

// ============================================================
// Planes
// ============================================================

export const PLANES: Record<PlanId, PlanInfo> = {
  free: {
    id: 'free',
    nombre: 'Free',
    precioUSD: 0,
    precioCLP: 0,
    descripcion: 'Para probar la plataforma',
    popular: false,
    features: [
      'Panel Principal',
      'Hasta 20 pacientes',
      '5 turnos por mes',
    ],
    cta: 'Comenzar gratis',
  },
  starter: {
    id: 'starter',
    nombre: 'Starter',
    precioUSD: 49,
    precioCLP: 49 * USD_TO_CLP,
    descripcion: 'Para consultorios individuales',
    popular: false,
    features: [
      'Pacientes ilimitados',
      'Turnos ilimitados + recordatorios WhatsApp',
      'Historia clínica digital',
      'Recetas digitales',
      'Conversaciones WhatsApp',
      'Reportes básicos',
      '1 profesional',
    ],
    cta: 'Suscribirse',
  },
  professional: {
    id: 'professional',
    nombre: 'Profesional',
    precioUSD: 99,
    precioCLP: 99 * USD_TO_CLP,
    descripcion: 'Para consultorios en crecimiento',
    popular: true,
    features: [
      'Todo lo de Starter +',
      'IA Assistant (triaje + respuestas automáticas)',
      'Hasta 5 profesionales',
      'Reportes avanzados + Exportación Excel/PDF',
      'Encuestas post-consulta automáticas',
      '2FA / Seguridad avanzada',
      'Recordatorios personalizables',
    ],
    cta: 'Suscribirse',
  },
  premium: {
    id: 'premium',
    nombre: 'Premium',
    precioUSD: 199,
    precioCLP: 199 * USD_TO_CLP,
    descripcion: 'Para clínicas y centros médicos',
    popular: false,
    features: [
      'Todo lo de Profesional +',
      'Profesionales ilimitados',
      'Integración n8n + Google Calendar',
      'Portal del paciente',
      'Backup encriptado automático',
      'Auditoría completa',
      'Facturación electrónica',
      'Video consultas',
      'Soporte prioritario 24/7',
    ],
    cta: 'Suscribirse',
  },
  enterprise: {
    id: 'enterprise',
    nombre: 'Enterprise',
    precioUSD: 499,
    precioCLP: 499 * USD_TO_CLP,
    descripcion: 'Para grandes centros y redes médicas',
    popular: false,
    features: [
      'Todo lo de Premium +',
      'API pública (REST)',
      'Dashboard multi-sucursal',
      'On-premise / nube privada',
      'SLA garantizado',
      'Onboarding asistido por IA',
      'Capacitación del equipo',
      'Integraciones custom',
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
