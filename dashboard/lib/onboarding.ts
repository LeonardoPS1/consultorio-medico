/**
 * Onboarding — Asistente guiado para configuración inicial.
 *
 * Verifica qué pasos están completos y genera tips contextuales con IA (Ollama).
 * El progreso se calcula en base al estado real de la DB.
 */

import { db } from '@/lib/db';
import { medicos, pacientes, horariosAtencion, preferenciasNotificaciones } from '@/drizzle/schema';
import { eq, count, sql } from 'drizzle-orm';

// ─── Steps ──────────────────────────────────────────────────

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

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'whatsapp',
    title: 'Conectá WhatsApp',
    description: 'Vinculá tu número de WhatsApp para que los pacientes puedan comunicarse.',
    icon: 'MessageSquare',
    actionLink: '/dashboard/configuracion?tab=credenciales',
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

// ─── Estado del onboarding ──────────────────────────────────

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

// ─── Verificar pasos completados ────────────────────────────

/**
 * Verifica qué pasos del onboarding están completos
 * consultando el estado real de la base de datos.
 */
export async function getOnboardingState(): Promise<OnboardingState> {
  const completed: string[] = [];

  // Paso 1: WhatsApp — verificar que hay credenciales de Twilio configuradas
  const [twilioCred] = await db.execute(
    sql`SELECT 1 FROM credenciales WHERE servicio = 'twilio' LIMIT 1`,
  );
  if (twilioCred) completed.push('whatsapp');

  // Paso 2: Médico — al menos un médico activo
  const [medCount] = await db
    .select({ total: count() })
    .from(medicos)
    .where(sql`${medicos.deletedAt} IS NULL`);
  if (Number(medCount?.total || 0) > 0) completed.push('medico');

  // Paso 3: Horarios — al menos un horario configurado
  const [horariosCount] = await db
    .select({ total: count() })
    .from(horariosAtencion);
  if (Number(horariosCount?.total || 0) > 0) completed.push('horarios');

  // Paso 4: Paciente — al menos un paciente
  const [pacCount] = await db
    .select({ total: count() })
    .from(pacientes)
    .where(sql`${pacientes.deletedAt} IS NULL`);
  if (Number(pacCount?.total || 0) > 0) completed.push('paciente');

  // Paso 5: Notificaciones — preferencias configuradas
  const [notifCount] = await db
    .select({ total: count() })
    .from(preferenciasNotificaciones);
  if (Number(notifCount?.total || 0) > 0) completed.push('notificaciones');

  const progress = Math.round((completed.length / ONBOARDING_STEPS.length) * 100);
  const isComplete = completed.length >= ONBOARDING_STEPS.length;
  const firstIncomplete = ONBOARDING_STEPS.find((s) => !completed.includes(s.id));

  return {
    completedSteps: completed,
    progress,
    isComplete,
    nextStep: firstIncomplete || null,
  };
}

// ─── AI Tips contextuales ───────────────────────────────────

/**
 * Genera un prompt contextual para Ollama basado en el paso actual
 * y el estado del consultorio.
 */
export function buildOnboardingPrompt(stepId: string, state: OnboardingState): string {
  const step = ONBOARDING_STEPS.find((s) => s.id === stepId);
  if (!step) return '';

  const completedCount = state.completedSteps.length;
  const totalSteps = ONBOARDING_STEPS.length;

  const prompts: Record<string, string> = {
    whatsapp: `Sos un asistente de configuración para un consultorio médico digital. El usuario está configurando WhatsApp.

CONSEJOS ÚTILES:
1. Necesitás un número de Twilio con capacidades de WhatsApp (Sandbox o número aprobado).
2. El webhook debe apuntar a: https://med.aicorebots.com/api/webhooks/twilio
3. Configurá el Status Callback para trackear entregas.
4. Usá el mismo número configurado en la variable TWILIO_WHATSAPP_NUMBER.

Dá el consejo en 2-3 oraciones cálidas y prácticas. NO saludes.`,

    medico: `Sos un asistente de configuración para un consultorio médico digital. El usuario está agregando un médico.

CONSEJOS ÚTILES:
1. Completá nombre, especialidad, email, teléfono y matrícula.
2. Cada médico puede tener su propio color en el calendario de turnos.
3. Podés definir la duración predeterminada de los turnos por médico.
4. Los horarios de cada médico se pueden personalizar después.

Dá el consejo en 2-3 oraciones cálidas y prácticas. NO saludes.`,

    horarios: `Sos un asistente de configuración para un consultorio médico digital. El usuario está configurando horarios de atención.

CONSEJOS ÚTILES:
1. Configurá los días y horarios en que el consultorio está abierto.
2. Podés marcar días como feriados o inactivos.
3. Recomendación: Lunes a Viernes 9:00-18:00, Sábados 9:00-13:00.
4. Los horarios se usan para validar que los turnos se agenden correctamente.

Dá el consejo en 2-3 oraciones cálidas y prácticas. NO saludes.`,

    paciente: `Sos un asistente de configuración para un consultorio médico digital. El usuario está agregando su primer paciente.

CONSEJOS ÚTILES:
1. Completá nombre, apellido y teléfono como mínimo.
2. La obra social y número de afiliado ayudan a agilizar la facturación.
3. Podés registrar alergias y medicación crónica desde el perfil del paciente.
4. Pacientes con WhatsApp habilitado pueden recibir recordatorios automáticos.

Dá el consejo en 2-3 oraciones cálidas y prácticas. NO saludes.`,

    notificaciones: `Sos un asistente de configuración para un consultorio médico digital. El usuario está configurando notificaciones.

CONSEJOS ÚTILES:
1. Activá urgencias por WhatsApp para no perder emergencias.
2. El resumen diario por email ayuda a planificar el día.
3. Las alertas de ausentismo avisan cuando un paciente no confirma.
4. Los recordatorios automáticos reducen las inasistencias hasta un 40%.

Dá el consejo en 2-3 oraciones cálidas y prácticas. NO saludes.`,
  };

  return prompts[stepId] || `El usuario está completando el paso "${step.title}" del onboarding (${completedCount}/${totalSteps}). Dá un consejo práctico y alentador en 2-3 oraciones.`;
}

// ─── Llamar a Ollama para tips ──────────────────────────────

export interface AiTipResult {
  tip: string;
  success: boolean;
}

/**
 * Obtiene un tip contextual de Ollama para el paso indicado.
 * Fire-and-forget friendly: devuelve mensaje genérico si falla.
 */
export async function getAiOnboardingTip(stepId: string): Promise<AiTipResult> {
  try {
    const state = await getOnboardingState();
    const prompt = buildOnboardingPrompt(stepId, state);

    const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    const model = process.env.OLLAMA_MODEL || 'mistral';

    const res = await fetch(`${ollamaUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'Sos un asistente amable que ayuda a configurar un consultorio médico digital. Respondé en español argentino, cálido, conciso (máximo 3 oraciones). Dá solo el consejo, sin introducciones.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 150,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) throw new Error(`Ollama responded ${res.status}`);

    const data = await res.json();
    const tip = data?.choices?.[0]?.message?.content?.trim();

    if (!tip) throw new Error('Respuesta vacía de Ollama');

    return { tip, success: true };
  } catch (e) {
    return {
      tip: '💡 Tip: Completá este paso para tener todo configurado. Si necesitás ayuda, consultá la documentación en cada sección.',
      success: false,
    };
  }
}
