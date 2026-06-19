/**
 * Onboarding Wizard — Configuración inicial asistida por IA.
 *
 * Guía al usuario paso a paso para configurar WhatsApp, médicos,
 * horarios, pacientes y notificaciones. Cada paso tiene un tip
 * contextual generado por Ollama.
 *
 * Client component: obtiene el estado del onboarding vía API
 * para evitar problemas de auth() en server components (SSR).
 * OnboardingClient: maneja interactividad, progreso y tips de IA.
 */

'use client';

import { useEffect, useState } from 'react';
import { Sparkles as SparklesIcon } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { OnboardingClient } from './onboarding-client';
import type { OnboardingState } from '@/lib/onboarding-types';

export default function OnboardingPage({
  searchParams,
}: {
  searchParams?: { reiniciar?: string; 'ver-progreso'?: string };
}) {
  const isForceRestart = searchParams?.reiniciar === 'true';
  const verProgreso = searchParams?.['ver-progreso'] === 'true';

  const [state, setState] = useState<OnboardingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOnboardingState() {
      try {
        const res = await fetch('/api/onboarding', {
          credentials: 'include',
        });
        if (!res.ok) {
          throw new Error(`Error ${res.status}: ${res.statusText}`);
        }
        const data = await res.json();
        setState(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar onboarding');
      } finally {
        setLoading(false);
      }
    }

    if (!isForceRestart) {
      fetchOnboardingState();
    } else {
      // En modo reiniciar, no necesitamos cargar estado del servidor
      setState({
        completedSteps: [],
        progress: 0,
        isComplete: false,
        nextStep: { id: 'plan', title: 'Elige tu plan', description: '', icon: '', actionLink: '', actionLabel: '' },
      });
      setLoading(false);
    }
  }, [isForceRestart]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Cargando asistente IA...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-destructive/10 text-destructive shrink-0 mb-4">
          <Loader2 className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-semibold mb-1">Error al cargar onboarding</h3>
        <p className="text-sm text-muted-foreground max-w-md mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="text-sm text-primary hover:underline"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <span className="text-sm text-muted-foreground">Cargando...</span>
      </div>
    );
  }

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
              Asistente IA
            </h1>
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
        initialCompleted={isForceRestart ? [] : state.completedSteps}
        isComplete={state.isComplete && !isForceRestart}
        isForceRestart={isForceRestart}
        verProgreso={verProgreso}
      />
    </div>
  );
}