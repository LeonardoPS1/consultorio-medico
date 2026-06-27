/**
 * Onboarding Wizard — Configuración inicial asistida por IA.
 *
 * Server Component: carga el estado del onboarding server-side
 * usando getOnboardingState(), y pasa todo al OnboardingClient.
 */

export const dynamic = 'force-dynamic';

import { auth } from '@/lib/auth';
import { getOnboardingState } from '@/lib/onboarding';
import { OnboardingClient } from './onboarding-client';
import type { OnboardingState } from '@/lib/onboarding-types';

interface OnboardingPageProps {
  searchParams?: { reiniciar?: string; 'ver-progreso'?: string };
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const isForceRestart = searchParams?.reiniciar === 'true';
  const verProgreso = searchParams?.['ver-progreso'] === 'true';

  const session = await auth();
  let state: OnboardingState | null = null;

  try {
    state = await getOnboardingState(session?.user?.id);
  } catch {
    // Si falla auth en SSR, devolvemos estado vacío
  }

  // Modo reiniciar: sobreescribe el estado
  const initialState = isForceRestart
    ? ({
        completedSteps: [],
        progress: 0,
        isComplete: false,
        nextStep: {
          id: 'plan',
          title: 'Elige tu plan',
          description: '',
          icon: '',
          actionLink: '',
          actionLabel: '',
        },
      } as OnboardingState)
    : state;

  if (!initialState) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <p className="text-sm text-muted-foreground">No se pudo cargar el estado del onboarding.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in max-w-3xl mx-auto">
      {/* Header con gradiente */}
      <div className="rounded-xl bg-gradient-to-br from-primary/5 via-primary/[0.02] to-background border p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-primary/10 text-primary shrink-0 shadow-sm">
            <svg
              className="h-6 w-6"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
            </svg>
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">Asistente IA</h1>
            <p className="text-sm text-muted-foreground max-w-lg leading-relaxed">
              {isForceRestart
                ? 'Repasá cada paso y marcalo como completado cuando lo configures.'
                : 'Guía paso a paso para dejar tu consultorio listo. Cada paso tiene una guía IA personalizada.'}
            </p>
          </div>
        </div>
      </div>

      <OnboardingClient
        key={isForceRestart ? 'reiniciar' : 'onboarding'}
        initialCompleted={isForceRestart ? [] : initialState.completedSteps}
        isComplete={initialState.isComplete && !isForceRestart}
        isForceRestart={isForceRestart}
        verProgreso={verProgreso}
      />
    </div>
  );
}
