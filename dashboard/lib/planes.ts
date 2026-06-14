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
// Tipo de cambio referencial (1 USD → ?)
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
      'Panel Principal con KPIs en tiempo real',
      'Hasta 20 pacientes',
      '5 turnos por mes',
      'App instalable (PWA) con modo offline',
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
      'Hasta 300 pacientes',
      'Turnos ilimitados',
      'Recordatorios WhatsApp 24h y 1h con confirmación',
      'Historia clínica digital con CIE-10',
      'Notas SOAP (evolución clínica estructurada)',
      'Recetas digitales con envío por WhatsApp',
      'Conversaciones WhatsApp con pacientes',
      'Reportes y estadísticas del consultorio',
      'Horarios de atención configurables',
      'Notificaciones y alertas personalizables',
      'Encuestas post-consulta automáticas',
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
      'Asistente IA (triaje + respuestas automáticas)',
      'Derivaciones entre especialistas con seguimiento completo',
      'Alertas inteligentes (cumpleaños, ausentismo recurrente, pacientes críticos)',
      'Reportes avanzados + Exportación Excel/PDF',
      'Plantillas WhatsApp personalizables',
      'Autenticación 2FA / Seguridad avanzada',
      'Lista de espera inteligente con ofertas automáticas',
      'Firma digital QR en recetas + verificación pública',
      'Certificados médicos con verificación QR',
      'Lista negra de pacientes (bloqueo automático por inasistencia)',
      'Consentimiento informado digital con firma y auditoría',
      'Bloqueos de agenda por horario',
      'Hasta 10 profesionales con agendas independientes',
    ],
    cta: 'Suscribirse',
  },
  premium: {
    id: 'premium',
    nombre: 'Premium',
    precioUSD: 199,
    precioCLP: 199 * USD_TO_CLP,
    descripcion: 'Para clinicas y centros medicos',
    popular: false,
    features: [
      'Todo lo de Profesional +',
      'Portal del paciente (turnos, recetas e historial)',
      'Profesionales ilimitados',
      'Workflows n8n + automatizaciones personalizadas',
      'Google Calendar Sync bidireccional',
      'Panel de métricas de ausentismo predictivo',
      'Registro de auditoría completo',
      'Backup encriptado automático',
      'Panel de administración de equipo',
      'Credenciales centralizadas y API Keys',
      'Alertas y seguimiento automático de pacientes',
    ],
    cta: 'Suscribirse',
  },
  enterprise: {
    id: 'enterprise',
    nombre: 'Enterprise',
    precioUSD: 499,
    precioCLP: 499 * USD_TO_CLP,
    descripcion: 'Para grandes centros y redes medicas',
    popular: false,
    features: [
      'Todo lo de Premium +',
      'Multi-sucursal / Multi-tenant',
      'Panel de administración global',
      'Cumplimiento normativo ARCO/LGPD completo',
      'Integraciones personalizadas',
      'Onboarding asistido por IA',
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
