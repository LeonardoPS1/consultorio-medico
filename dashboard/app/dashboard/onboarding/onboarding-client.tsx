'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Loader2, Lightbulb, ExternalLink, MessageSquare, Stethoscope, Clock, UserPlus, Bell, Sparkles } from 'lucide-react';
import { ONBOARDING_STEPS, type OnboardingStep } from '@/lib/onboarding-types';

// ─── Props ──────────────────────────────────────────────────

interface OnboardingClientProps {
  initialCompleted: string[];
  isComplete: boolean;
  isForceRestart?: boolean;
}

// ─── Map icon string → component ────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  MessageSquare,
  Stethoscope,
  Clock,
  UserPlus,
  Bell,
};

// ─── Component ──────────────────────────────────────────────

export function OnboardingClient({ initialCompleted, isComplete, isForceRestart }: OnboardingClientProps) {
  const [completed, setCompleted] = useState<string[]>(initialCompleted);
  const [activeStep, setActiveStep] = useState<string | null>(null);
  const [tips, setTips] = useState<Record<string, string>>({});
  const [loadingTips, setLoadingTips] = useState<Set<string>>(new Set());
  const [failedTips, setFailedTips] = useState<Set<string>>(new Set());

  // Si ya está completo, mostrar pantalla de éxito
  if (isComplete) {
    return (
      <div className="text-center space-y-6 py-12">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
          <CheckCircle2 className="h-10 w-10 text-emerald-600" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Consultorio operativo</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Todos los pasos están completos. Ya podés gestionar turnos, pacientes y comunicarte con tus pacientes.
          </p>
        </div>
        <div className="flex gap-3 justify-center flex-wrap">
          <Button asChild>
            <Link href="/dashboard">Ir al Panel Principal</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/turnos">Gestionar Turnos</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/dashboard/onboarding?reiniciar=true">
              <Sparkles className="h-4 w-4 mr-1" />
              Re-ejecutar asistente IA
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Cargar tip de IA para un paso
  const loadTip = async (stepId: string) => {
    if (loadingTips.has(stepId)) return;

    setLoadingTips((prev) => new Set(prev).add(stepId));
    setFailedTips((prev) => { const next = new Set(prev); next.delete(stepId); return next; });
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepId }),
      });
      const data = await res.json();
      if (data.tip) {
        setTips((prev) => ({ ...prev, [stepId]: data.tip }));
      } else {
        setFailedTips((prev) => new Set(prev).add(stepId));
      }
    } catch {
      setFailedTips((prev) => new Set(prev).add(stepId));
    } finally {
      setLoadingTips((prev) => {
        const next = new Set(prev);
        next.delete(stepId);
        return next;
      });
    }
  };

  // Cargar tip al expandir un paso
  useEffect(() => {
    if (activeStep && !tips[activeStep]) {
      loadTip(activeStep);
    }
  }, [activeStep]);

  const isStepCompleted = (id: string) => completed.includes(id);
  const isStepActive = (id: string) => activeStep === id;
  // En modo reinicio, todos los pasos están disponibles sin bloqueo
  const isStepPending = (id: string) => {
    if (isForceRestart) return false;
    const idx = ONBOARDING_STEPS.findIndex((s) => s.id === id);
    return idx > 0 && !isStepCompleted(ONBOARDING_STEPS[idx - 1].id);
  };

  return (
    <div className="space-y-3">
      {ONBOARDING_STEPS.map((step, idx) => {
        const Icon = ICON_MAP[step.icon] || Lightbulb;
        const done = isStepCompleted(step.id);
        const active = isStepActive(step.id);
        const pending = isStepPending(step.id);

        return (
          <Card
            key={step.id}
            className={`transition-all duration-200 ${
              done
                ? 'border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-950/10'
                : active
                  ? 'border-primary/30 shadow-sm'
                  : pending
                    ? 'opacity-50'
                    : 'hover:border-muted-foreground/20'
            }`}
          >
            <button
              className="w-full text-left"
              onClick={() => {
                if (done) return;
                setActiveStep(active ? null : step.id);
                if (!active) loadTip(step.id);
              }}
              disabled={pending}
            >
              <CardHeader className="p-4 pb-0">
                <div className="flex items-center gap-3">
                  {/* Icon */}
                  <div
                    className={`flex items-center justify-center h-10 w-10 rounded-lg shrink-0 ${
                      done
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'
                        : active
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {done ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>

                  {/* Title + status */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{step.title}</CardTitle>
                      {done && (
                        <Badge variant="outline" className="text-emerald-600 border-emerald-200 text-[10px] px-1.5 h-5">
                          Listo
                        </Badge>
                      )}
                      {pending && (
                        <Badge variant="outline" className="text-muted-foreground text-[10px] px-1.5 h-5">
                          Bloqueado
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-sm mt-0.5">
                      {step.description}
                    </CardDescription>
                  </div>

                  {/* Step number */}
                  <div className={`text-xs font-mono ${done ? 'text-emerald-500' : active ? 'text-primary' : 'text-muted-foreground'}`}>
                    {done ? '✓' : `0${idx + 1}`}
                  </div>
                </div>
              </CardHeader>
            </button>

            {/* Expanded content */}
            {active && !done && (
              <CardContent className="p-4 pt-3 space-y-3">
                {/* AI Tip */}
                <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30 p-3">
                  <div className="flex items-start gap-2">
                    <Sparkles className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-amber-800 dark:text-amber-300 mb-0.5">
                        Sugerencia IA
                      </p>
                      {loadingTips.has(step.id) ? (
                        <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Pensando...
                        </div>
                      ) : failedTips.has(step.id) ? (
                        <div className="flex flex-col gap-2">
                          <p className="text-sm text-amber-800/80 dark:text-amber-300/80">
                            No se pudo cargar la sugerencia.
                          </p>
                          <button
                            onClick={(e) => { e.stopPropagation(); loadTip(step.id); }}
                            className="text-xs text-amber-700 dark:text-amber-400 underline hover:no-underline self-start"
                          >
                            Reintentar
                          </button>
                        </div>
                      ) : (
                        <p className="text-sm text-amber-800/80 dark:text-amber-300/80">
                          {tips[step.id] || 'Hacé clic para ver una sugerencia personalizada.'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action button */}
                <Button asChild className="w-full gap-2">
                  <Link href={step.actionLink}>
                    <ExternalLink className="h-4 w-4" />
                    {step.actionLabel}
                  </Link>
                </Button>
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* Botón para salir del modo reinicio */}
      {isForceRestart && (
        <div className="text-center pt-4">
          <Button variant="outline" asChild>
            <Link href="/dashboard/onboarding">
              Volver a configuración normal
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
