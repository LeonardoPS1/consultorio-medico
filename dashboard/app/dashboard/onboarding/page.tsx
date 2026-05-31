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
      <PageHeader
        title={showComplete ? '🎉 ¡Todo listo!' : 'Asistente IA'}
        description={showComplete
          ? 'Tu consultorio está completamente configurado.'
          : isForceRestart
            ? 'Repasá cada paso y marcalo como completado cuando lo configures.'
            : 'Guía paso a paso para dejar tu consultorio listo.'}
      />

      <OnboardingClient
        initialCompleted={isForceRestart ? [] : state.completedSteps}
        isComplete={showComplete}
        isForceRestart={isForceRestart}
      />
    </div>
  );
}
