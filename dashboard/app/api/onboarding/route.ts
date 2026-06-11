/**
 * GET  /api/onboarding       — Estado actual del onboarding
 * POST /api/onboarding       — Obtener tip de IA para un paso
 * PUT  /api/onboarding       — Marcar un paso como completado (persiste en onboarding_progress)
 *
 * ⚠️  Las funciones getOnboardingState/getAiOnboardingTip reciben
 *     el userId explícitamente para evitar múltiples llamadas a auth()
 *     que pueden retornar resultados inconsistentes entre contextos.
 */

import { NextRequest } from 'next/server';
import { apiHandler, ok, fail } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';
import { parseBody, onboardingStepSchema } from '@/lib/validations';
import { db } from '@/lib/db';
import { onboardingProgress } from '@/drizzle/schema';
import { getOnboardingState, getAiOnboardingTip } from '@/lib/onboarding';
import { safeWarn } from '@/lib/logger';

export const GET = apiHandler(async () => {
  const session = await requireAuth();

  const state = await getOnboardingState(session.user.id!);
  return ok(state);
});

export const POST = apiHandler(async (request: NextRequest) => {
  const session = await requireAuth();

  const { stepId } = await parseBody(request, onboardingStepSchema);

  const tip = await getAiOnboardingTip(stepId, session.user.id!);
  return ok(tip);
});

/**
 * Marca un paso como completado en onboarding_progress.
 * Usa ON CONFLICT DO NOTHING (sin target explícito) para que
 * PostgreSQL resuelva el conflicto contra la UNIQUE(usuario_id, step_id)
 * de la tabla.
 */
export const PUT = apiHandler(async (request: NextRequest) => {
  const session = await requireAuth();

  const { stepId } = await parseBody(request, onboardingStepSchema);

  // Validar que el stepId sea válido
  const { ONBOARDING_STEPS } = await import('@/lib/onboarding-types');
  const step = ONBOARDING_STEPS.find((s) => s.id === stepId);
  if (!step) {
    fail('stepId inválido');
  }

  try {
    await db.insert(onboardingProgress).values({
      usuarioId: session.user.id!,
      stepId,
    }).onConflictDoNothing();

    // No devolvemos el estado completo porque en un reinicio (isForceRestart)
    // el servidor todavía tiene todos los pasos de la sesión anterior en DB.
    // El cliente maneja el estado localmente, solo confirmamos la persistencia.
    return ok({ success: true });
  } catch (error) {
    safeWarn('[Onboarding] Error al guardar progreso:', error instanceof Error ? error.message : error);
    throw error;
  }
});
