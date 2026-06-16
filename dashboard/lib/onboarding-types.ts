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

// ─── Fallback Tips (cuando Ollama no está disponible) ──────

/**
 * Tips estáticos por paso que se muestran cuando Ollama no responde.
 * Son funcionales y prácticos para que el onboarding siempre sea útil.
 * Este archivo NO tiene dependencias de servidor, así que puede
 * importarse desde componentes client-side.
 */
export const FALLBACK_TIPS: Record<string, string> = {
  plan: 'Elige un plan que se ajuste al volumen de pacientes que atiendes. Si estás empezando, el plan Starter es suficiente y después puedes escalar sin perder datos. En la sección de suscripción vas a ver las diferencias entre cada plan. El plan Professional incluye telemedicina en vivo, derivaciones entre especialistas y lista negra de pacientes.',
  perfil: 'Completa los datos de tu consultorio: nombre, dirección, teléfono y email. También puedes subir tu logo y elegir los colores para personalizar el sistema. Esto ayuda a que tus pacientes te reconozcan en los mensajes y recordatorios automáticos.',
  medico: 'Registra al menos un médico para poder asignarle turnos, recetas y derivaciones. Cada profesional tiene su propio perfil con especialidad, horarios y color en el calendario. Si ya tienes un médico registrado, verifica que los datos estén completos. Con el plan Professional podrás crear turnos virtuales con videoconsulta integrada.',
  horarios: 'Los horarios definen cuándo se pueden agendar turnos automáticamente. Te recomiendo empezar con lunes a viernes de 9 a 18 y sábados de 9 a 13. Si tienes varios médicos, cada uno puede tener horarios diferentes.',
  paciente: 'Carga un paciente de prueba para ver el sistema en funcionamiento. Los datos clave son nombre, teléfono con código de país y obra social si aplica. Después de cargarlo ya le puedes asignar un turno virtual o presencial, y va a recibir recordatorios automáticos por WhatsApp.',
  notificaciones: 'Las notificaciones te avisan sobre urgencias, recordatorios de turnos, alertas inteligentes y bajas por consentimiento. Te recomiendo activar las notificaciones push en el navegador y los recordatorios automáticos para pacientes. Este es el último paso, ya casi tienes todo listo.',
};

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
