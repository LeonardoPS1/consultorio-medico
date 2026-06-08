/**
 * Onboarding — Tipos y constantes compartidas.
 *
 * Este archivo NO importa db ni ningún módulo de servidor,
 * puede ser importado desde componentes client-side sin problemas.
 */

// ─── Tipos ──────────────────────────────────────────────────

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  /** Enlace a la sección del dashboard donde se configura */
  actionLink: string;
  /** Label del botón de acción */
  actionLabel: string;
}

export interface OnboardingState {
  /** Pasos completados */
  completedSteps: string[];
  /** Progreso total (0-100) */
  progress: number;
  /** ¿Está completamente configurado? */
  isComplete: boolean;
  /** Primer paso incompleto (para auto-redirigir) */
  nextStep: OnboardingStep | null;
}

export interface AiTipResult {
  tip: string;
  success: boolean;
}

// ─── Steps Config ───────────────────────────────────────────

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'plan',
    title: 'Elige tu plan',
    description: 'Selecciona el plan que mejor se adapte a tu consultorio. Puedes empezar con el plan Free y escalar cuando lo necesites.',
    icon: 'Sparkles',
    actionLink: '/dashboard/configuracion?tab=suscripcion',
    actionLabel: 'Ver planes disponibles',
  },
  {
    id: 'perfil',
    title: 'Completa tu perfil',
    description: 'Personaliza los datos de tu consultorio: nombre, dirección, logo y colores para que tus pacientes te reconozcan.',
    icon: 'Building2',
    actionLink: '/dashboard/configuracion?tab=perfil',
    actionLabel: 'Completar perfil',
  },
  {
    id: 'medico',
    title: 'Agrega un médico',
    description: 'Registra al menos un profesional para poder asignar turnos y recetas.',
    icon: 'Stethoscope',
    actionLink: '/dashboard/configuracion?tab=equipo',
    actionLabel: 'Agregar médico',
  },
  {
    id: 'horarios',
    title: 'Configura horarios',
    description: 'Define los días y horarios de atención del consultorio para cada médico.',
    icon: 'Clock',
    actionLink: '/dashboard/configuracion?tab=horarios',
    actionLabel: 'Configurar horarios',
  },
  {
    id: 'paciente',
    title: 'Agrega tu primer paciente',
    description: 'Carga un paciente de prueba para ver cómo funciona el sistema con datos reales.',
    icon: 'UserPlus',
    actionLink: '/dashboard/pacientes',
    actionLabel: 'Agregar paciente',
  },
  {
    id: 'notificaciones',
    title: 'Configura notificaciones',
    description: 'Elige cómo y cuándo quieres recibir alertas del consultorio, y activa los recordatorios automáticos.',
    icon: 'Bell',
    actionLink: '/dashboard/configuracion?tab=notificaciones',
    actionLabel: 'Configurar notificaciones',
  },
];
