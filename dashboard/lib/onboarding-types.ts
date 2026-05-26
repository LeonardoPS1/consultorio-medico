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
    id: 'whatsapp',
    title: 'Conectá WhatsApp',
    description: 'Vinculá tu número de WhatsApp para que los pacientes puedan comunicarse.',
    icon: 'MessageSquare',
    actionLink: '/dashboard/admin/sistema?tab=credenciales',
    actionLabel: 'Configurar WhatsApp',
  },
  {
    id: 'medico',
    title: 'Agregá un médico',
    description: 'Registrá al menos un profesional para poder asignar turnos.',
    icon: 'Stethoscope',
    actionLink: '/dashboard/configuracion?tab=equipo',
    actionLabel: 'Agregar médico',
  },
  {
    id: 'horarios',
    title: 'Configurá horarios',
    description: 'Definí los días y horarios de atención del consultorio.',
    icon: 'Clock',
    actionLink: '/dashboard/configuracion?tab=horarios',
    actionLabel: 'Configurar horarios',
  },
  {
    id: 'paciente',
    title: 'Agregá tu primer paciente',
    description: 'Cargá un paciente de prueba para ver cómo funciona el sistema.',
    icon: 'UserPlus',
    actionLink: '/dashboard/pacientes',
    actionLabel: 'Agregar paciente',
  },
  {
    id: 'notificaciones',
    title: 'Configurá notificaciones',
    description: 'Elegí cómo y cuándo querés recibir alertas del consultorio.',
    icon: 'Bell',
    actionLink: '/dashboard/configuracion?tab=notificaciones',
    actionLabel: 'Configurar notificaciones',
  },
];
