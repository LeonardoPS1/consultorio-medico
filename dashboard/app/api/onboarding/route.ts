/**
 * GET  /api/onboarding       — Estado actual del onboarding
 * POST /api/onboarding       — Obtener tip de IA para un paso
 * PUT  /api/onboarding       — Marcar un paso como completado (persiste en onboarding_progress)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { onboardingProgress } from '@/drizzle/schema';
import { getOnboardingState, getAiOnboardingTip } from '@/lib/onboarding';
import { auth } from '@/lib/auth';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const state = await getOnboardingState();
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

  const tip = await getAiOnboardingTip(stepId);
  return NextResponse.json(tip);
}

/**
 * Marca un paso como completado en onboarding_progress.
 * El paso persiste incluso al refrescar la página.
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

  // Insertar o ignorar si ya existe (ON CONFLICT DO NOTHING vía Drizzle)
  try {
    await db.insert(onboardingProgress).values({
      usuarioId: session.user.id,
      stepId,
    }).onConflictDoNothing({
      target: [onboardingProgress.usuarioId, onboardingProgress.stepId],
    });

    // Retornar el estado actualizado
    const state = await getOnboardingState();
    return NextResponse.json({ success: true, state });
  } catch (error) {
    console.error('[Onboarding] Error al guardar progreso:', error);
    return NextResponse.json({ error: 'Error al guardar progreso' }, { status: 500 });
  }
}
