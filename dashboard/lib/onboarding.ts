/**
 * Onboarding — Asistente guiado para configuración inicial.
 *
 * Verifica qué pasos están completos y genera tips contextuales con IA (Ollama).
 * El progreso se calcula en base al estado real de la DB.
 */

import { db } from '@/lib/db';
import { medicos, pacientes, horariosAtencion, preferenciasNotificaciones } from '@/drizzle/schema';
import { count, sql } from 'drizzle-orm';
import { ONBOARDING_STEPS, type OnboardingState, type AiTipResult } from './onboarding-types';

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
export function buildOnboardingPrompt(stepId: string, state: OnboardingState, orgName?: string): string {
  const step = ONBOARDING_STEPS.find((s) => s.id === stepId);
  if (!step) return '';

  const consultorio = orgName || 'tu consultorio';
  const completedCount = state.completedSteps.length;

  const prompts: Record<string, string> = {
    whatsapp: `Estás ayudando al equipo de "${consultorio}" a conectar WhatsApp (paso ${completedCount + 1} de 5).

CONTEXTO REAL DEL USUARIO:
- Consultorio: ${consultorio}
- Pasos completados: ${completedCount} de 5
- Próximo paso pendiente después de este: ${state.nextStep?.title || 'ninguno, sería el último'}

DALE UN CONSEJO CÁLIDO Y PERSONALIZADO para conectar WhatsApp. Mencioná el nombre "${consultorio}" si aplica. Máximo 3 oraciones.`, 
    medico: `Estás ayudando al equipo de "${consultorio}" a registrar su primer médico (paso ${completedCount + 1} de 5).

CONTEXTO REAL:
- Consultorio: ${consultorio}
- Pasos completados: ${completedCount} de 5

DALE UN CONSEJO sobre agregar un médico. Mencioná que los horarios se personalizan después y que pueden tener colores en el calendario. Máximo 3 oraciones.`,
    horarios: `Estás ayudando al equipo de "${consultorio}" a configurar horarios de atención (paso ${completedCount + 1} de 5).

CONTEXTO REAL:
- Consultorio: ${consultorio}
- Pasos completados: ${completedCount} de 5

DALE UN CONSEJO sobre horarios recomendados para un consultorio. Mencioná Lunes a Viernes 9-18 como sugerencia. Máximo 3 oraciones.`,
    paciente: `Estás ayudando al equipo de "${consultorio}" a agregar su primer paciente (paso ${completedCount + 1} de 5).

CONTEXTO REAL:
- Consultorio: ${consultorio}
- Pasos completados: ${completedCount} de 5

DALE UN CONSEJO sobre qué datos cargar (nombre, teléfono, obra social). Máximo 3 oraciones.`,
    notificaciones: `Estás ayudando al equipo de "${consultorio}" a configurar notificaciones (paso ${completedCount + 1} de 5).

CONTEXTO REAL:
- Consultorio: ${consultorio}
- Pasos completados: ${completedCount} de 5

DALE UN CONSEJO sobre notificaciones (urgencias WhatsApp, recordatorios para reducir ausentismo). Máximo 3 oraciones.`,
  };

  return prompts[stepId] || `El usuario de "${consultorio}" está completando el paso "${step.title}" (${completedCount}/5). Dá un consejo práctico para este paso. Máximo 3 oraciones.`;
}

// ─── Llamar a Ollama para tips ──────────────────────────────

/**
 * Obtiene un tip contextual de Ollama para el paso indicado.
 * Fire-and-forget friendly: devuelve mensaje genérico si falla.
 */
export async function getAiOnboardingTip(stepId: string): Promise<AiTipResult> {
  try {
    const state = await getOnboardingState();

    // Obtener nombre del consultorio para personalizar el prompt
    let orgName = 'tu consultorio';
    try {
      const [tenant] = await db.execute(
        sql`SELECT nombre FROM tenants WHERE id = '00000000-0000-0000-0000-000000000000' LIMIT 1`,
      );
      const raw = tenant as Record<string, unknown> | undefined;
      if (raw?.nombre && typeof raw.nombre === 'string') orgName = raw.nombre;
    } catch {
      // ignorar, usar default
    }

    const prompt = buildOnboardingPrompt(stepId, state, orgName);

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
      signal: AbortSignal.timeout(25000),
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
