/**
 * GET  /api/onboarding  — Estado actual del onboarding
 * POST /api/onboarding/tip — Obtener tip de IA para un paso
 */

import { NextRequest, NextResponse } from 'next/server';
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
