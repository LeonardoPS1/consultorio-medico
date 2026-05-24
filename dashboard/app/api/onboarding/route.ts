/**
 * GET  /api/onboarding  — Estado actual del onboarding
 * POST /api/onboarding/tip — Obtener tip de IA para un paso
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOnboardingState, getAiOnboardingTip } from '@/lib/onboarding';

export async function GET() {
  const state = await getOnboardingState();
  return NextResponse.json(state);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const stepId = body?.stepId as string;

  if (!stepId) {
    return NextResponse.json({ error: 'stepId es requerido' }, { status: 400 });
  }

  const tip = await getAiOnboardingTip(stepId);
  return NextResponse.json(tip);
}
