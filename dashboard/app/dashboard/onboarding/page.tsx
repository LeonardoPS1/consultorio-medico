/**
 * Onboarding Wizard — Configuración inicial asistida por IA.
 *
 * Guía al usuario paso a paso para configurar WhatsApp, médicos,
 * horarios, pacientes y notificaciones. Cada paso tiene un tip
 * contextual generado por Ollama.
 *
 * Server component: renderiza el estado inicial del onboarding.
 * OnboardingClient: maneja interactividad y tips de IA.
 */

import { getOnboardingState } from '@/lib/onboarding';
import { OnboardingClient } from './onboarding-client';
import { PageHeader } from '@/components/page-header';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: { reiniciar?: string };
}) {
  const state = await getOnboardingState();
  const isForceRestart = searchParams?.reiniciar === 'true';
  const showComplete = state.isComplete && !isForceRestart;

  return (
    <div className="space-y-6 animate-in max-w-3xl mx-auto">
      {/* Header */}
      <PageHeader
        title={showComplete ? '🎉 ¡Todo listo!' : 'Configuración inicial'}
        description={showComplete
          ? 'Tu consultorio está completamente configurado. ¡Empezá a gestionar!'
          : isForceRestart
            ? 'Repasá los pasos de configuración. Los tips de IA te ayudarán.'
            : 'Completá estos pasos para dejar todo listo'}
      />

      {/* Progress bar */}
      <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progreso</span>
            <span className="font-semibold">{state.progress}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
              style={{ width: `${state.progress}%` }}
            />
          </div>
      </div>

      {/* Client component con pasos interactivos */}
      <OnboardingClient
        initialCompleted={isForceRestart ? [] : state.completedSteps}
        isComplete={showComplete}
        isForceRestart={isForceRestart}
      />
    </div>
  );
}
