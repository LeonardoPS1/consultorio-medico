/**
 * Onboarding Wizard — Configuración inicial asistida por IA.
 *
 * Guía al usuario paso a paso para configurar WhatsApp, médicos,
 * horarios, pacientes y notificaciones. Cada paso tiene un tip
 * contextual generado por Ollama.
 *
 * Server component: renderiza el estado inicial del onboarding.
 * OnboardingClient: maneja interactividad, progreso y tips de IA.
 */

import { Sparkles as SparklesIcon } from 'lucide-react';
import { getOnboardingState } from '@/lib/onboarding';
import { auth } from '@/lib/auth';
import { OnboardingClient } from './onboarding-client';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: { reiniciar?: string };
}) {
  // Pasar userId explícitamente para evitar que getOnboardingState()
  // llame a auth() internamente y pueda dar resultados inconsistentes
  const session = await auth();
  const state = await getOnboardingState(session?.user?.id);
  const isForceRestart = searchParams?.reiniciar === 'true';
  const showComplete = state.isComplete && !isForceRestart;

  return (
    <div className="space-y-6 animate-in max-w-3xl mx-auto">
      {/* Header con gradiente */}
      <div className="rounded-xl bg-gradient-to-br from-primary/5 via-primary/[0.02] to-background border p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-primary/10 text-primary shrink-0 shadow-sm">
            <SparklesIcon className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">
              {showComplete ? 'Todo listo' : 'Asistente IA'}
            </h1>
            <p className="text-sm text-muted-foreground max-w-lg leading-relaxed">
              {showComplete
                ? 'Tu consultorio está completamente configurado.'
                : isForceRestart
                  ? 'Repasá cada paso y marcalo como completado cuando lo configures.'
                  : 'Guía paso a paso para dejar tu consultorio listo. Cada paso tiene una guía IA personalizada.'}
            </p>
          </div>
        </div>
      </div>

      <OnboardingClient
        initialCompleted={isForceRestart ? [] : state.completedSteps}
        isComplete={showComplete}
        isForceRestart={isForceRestart}
      />
    </div>
  );
}
