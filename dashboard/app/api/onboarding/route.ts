/**
 * GET  /api/onboarding       — Estado actual del onboarding
 * POST /api/onboarding       — Obtener tip de IA para un paso
 * PUT  /api/onboarding       — Marcar un paso como completado (persiste en onboarding_progress)
 *
 * ⚠️  Las funciones getOnboardingState/getAiOnboardingTip reciben
 *     el userId explícitamente para evitar múltiples llamadas a auth()
 *     que pueden retornar resultados inconsistentes entre contextos.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { onboardingProgress } from '@/drizzle/schema';
import { getOnboardingState, getAiOnboardingTip } from '@/lib/onboarding';
import { auth } from '@/lib/auth';
import { safeWarn } from '@/lib/logger';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const state = await getOnboardingState(session.user.id);
  return NextResponse.json(state);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const body = await request.json();
  const stepId = body?.stepId as string;

  if (!stepId) {
    return NextResponse.json({ error: 'stepId es requerido' }, { status: 400 });
  }

  const tip = await getAiOnboardingTip(stepId, session.user.id);
  return NextResponse.json(tip);
}

/**
 * Marca un paso como completado en onboarding_progress.
 * Usa ON CONFLICT DO NOTHING (sin target explícito) para que
 * PostgreSQL resuelva el conflicto contra la UNIQUE(usuario_id, step_id)
 * de la tabla.
 */
export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const body = await request.json();
  const stepId = body?.stepId as string;

  if (!stepId) {
    return NextResponse.json({ error: 'stepId es requerido' }, { status: 400 });
  }

  // Validar que el stepId sea válido
  const { ONBOARDING_STEPS } = await import('@/lib/onboarding-types');
  const step = ONBOARDING_STEPS.find((s) => s.id === stepId);
  if (!step) {
    return NextResponse.json({ error: 'stepId inválido' }, { status: 400 });
  }

  try {
    // Insertar o ignorar si ya existe (ON CONFLICT DO NOTHING)
    // Sin target explícito para evitar discrepancias entre el uniqueIndex
    // de Drizzle y la UNIQUE constraint de la migración SQL.
    await db.insert(onboardingProgress).values({
      usuarioId: session.user.id,
      stepId,
    }).onConflictDoNothing();

    // Retornar el estado actualizado PASANDO el userId explícitamente
    const state = await getOnboardingState(session.user.id);
    return NextResponse.json({ success: true, state });
  } catch (error) {
    safeWarn('[Onboarding] Error al guardar progreso:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Error al guardar progreso' }, { status: 500 });
  }
}
