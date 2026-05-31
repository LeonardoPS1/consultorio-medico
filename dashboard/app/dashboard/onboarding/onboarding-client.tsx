'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2, Loader2, Lightbulb, ExternalLink,
  MessageSquare, Stethoscope, Clock, UserPlus, Bell,
  Sparkles, RefreshCw, RotateCcw, SkipForward,
} from 'lucide-react';
import { ONBOARDING_STEPS } from '@/lib/onboarding-types';

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
  Sparkles,
};

// ─── Component ──────────────────────────────────────────────

export function OnboardingClient({ initialCompleted, isComplete, isForceRestart }: OnboardingClientProps) {
  const router = useRouter();
  const [completed, setCompleted] = useState<string[]>(initialCompleted);
  const [activeStep, setActiveStep] = useState<string | null>(null);
  const [tips, setTips] = useState<Record<string, string>>({});
  const [loadingTips, setLoadingTips] = useState<Set<string>>(new Set());
  const [failedTips, setFailedTips] = useState<Set<string>>(new Set());

  // ── Cargar tip IA ───────────────────────────────────────

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

  // ── Efecto: cargar tip al abrir un paso ─────────────────

  useEffect(() => {
    if (isComplete) return;
    if (activeStep && !tips[activeStep]) {
      loadTip(activeStep);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStep, isComplete]);

  // ── Helpers ──────────────────────────────────────────────

  const isStepCompleted = (id: string) => completed.includes(id);
  const isStepActive = (id: string) => activeStep === id;

  const isStepPending = (id: string) => {
    const idx = ONBOARDING_STEPS.findIndex((s) => s.id === id);
    // Primer paso nunca está pendiente
    if (idx === 0) return false;
    // Pendiente si el anterior no está completado
    return !isStepCompleted(ONBOARDING_STEPS[idx - 1].id);
  };

  const allLocallyDone = completed.length >= ONBOARDING_STEPS.length;
  const localProgress = Math.round((completed.length / ONBOARDING_STEPS.length) * 100);

  // ── Marcar paso como completado ──────────────────────────

  const marcarCompletado = (stepId: string) => {
    setCompleted((prev) => {
      if (prev.includes(stepId)) return prev;
      const next = [...prev, stepId];
      const currentIdx = ONBOARDING_STEPS.findIndex((s) => s.id === stepId);
      const nextStep = ONBOARDING_STEPS[currentIdx + 1];
      if (nextStep) {
        setActiveStep(nextStep.id);
      }
      return next;
    });
  };

  // ── Saltar paso (no aplica / lo haré después) ───────────

  const saltarPaso = (stepId: string) => {
    const currentIdx = ONBOARDING_STEPS.findIndex((s) => s.id === stepId);
    const nextStep = ONBOARDING_STEPS[currentIdx + 1];
    if (nextStep) {
      setActiveStep(nextStep.id);
    } else {
      setActiveStep(null);
    }
  };

  // ── Reiniciar ────────────────────────────────────────────

  const handleReiniciar = () => {
    router.push('/dashboard/onboarding?reiniciar=true');
  };

  // ── Pantalla de éxito (todo completado) ─────────────────

  if (isComplete || allLocallyDone) {
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
          <Button variant="ghost" onClick={handleReiniciar}>
            <Sparkles className="h-4 w-4 mr-1" />
            Re-ejecutar asistente IA
          </Button>
        </div>
      </div>
    );
  }

  // ── Vista principal ──────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* ── Barra de acciones ─────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            {isForceRestart
              ? 'Repasá cada paso y marcalo como completado.'
              : `Completaste ${completed.length} de ${ONBOARDING_STEPS.length} pasos.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isForceRestart ? (
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/onboarding">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                Ver progreso real
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={handleReiniciar}>
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Reiniciar configuración
            </Button>
          )}
        </div>
      </div>

      {/* ── Steps ──────────────────────────────────────────── */}
      {ONBOARDING_STEPS.map((step, idx) => {
        const Icon = ICON_MAP[step.icon] || Lightbulb;
        const done = isStepCompleted(step.id);
        const active = isStepActive(step.id);
        const pending = isStepPending(step.id);
        const isLastStep = idx === ONBOARDING_STEPS.length - 1;

        return (
          <Card
            key={step.id}
            className={`transition-all duration-200 ${
              done
                ? 'border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-950/10'
                : active
                  ? 'border-primary/30 shadow-sm ring-1 ring-primary/10'
                  : pending
                    ? 'opacity-50'
                    : 'hover:border-muted-foreground/20 cursor-pointer'
            }`}
          >
            {/* ── Header (clickeable) ──────────────────────── */}
            <button
              className="w-full text-left"
              onClick={() => {
                if (done || pending) return;
                setActiveStep(active ? null : step.id);
              }}
              disabled={done || pending}
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
                    <div className="flex items-center gap-2 flex-wrap">
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

            {/* ── Expanded content ─────────────────────────── */}
            {active && !done && (
              <CardContent className="p-4 pt-3 space-y-3">
                {/* AI Tip */}
                <div className="rounded-lg bg-gradient-to-br from-amber-50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/10 border border-amber-200/50 dark:border-amber-800/30 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/40 shrink-0 mt-0.5">
                      <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-1 tracking-wide uppercase">
                        Guía IA · {step.title}
                      </p>
                      {loadingTips.has(step.id) ? (
                        <div className="flex items-center gap-2.5 text-sm text-amber-700 dark:text-amber-400 py-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Consultando al asistente IA...</span>
                        </div>
                      ) : failedTips.has(step.id) ? (
                        <div className="flex flex-col gap-2 py-1">
                          <p className="text-sm text-amber-800/70 dark:text-amber-300/70">
                            No se pudo conectar con el asistente IA. Puede que Ollama esté iniciando o haya un problema temporal.
                          </p>
                          <button
                            onClick={(e) => { e.stopPropagation(); loadTip(step.id); }}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 transition-colors self-start mt-1"
                          >
                            <RefreshCw className="h-3 w-3" />
                            Reintentar conectar IA
                          </button>
                        </div>
                      ) : tips[step.id] ? (
                        <p className="text-sm leading-relaxed text-amber-900 dark:text-amber-200">
                          {tips[step.id]}
                        </p>
                      ) : (
                        <p className="text-sm text-amber-700/60 dark:text-amber-400/60 italic">
                          Hacé clic en este paso para recibir una guía personalizada del asistente IA.
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

                {/* Botones de acción inferiores */}
                <div className="flex items-center gap-2">
                  {/* Ya lo configuré — siempre visible */}
                  <Button
                    variant="outline"
                    className="flex-1 gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                    onClick={(e) => {
                      e.stopPropagation();
                      marcarCompletado(step.id);
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {isLastStep ? 'Listo, terminé' : 'Ya lo configuré, siguiente →'}
                  </Button>

                  {/* Saltar paso — ghost */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      saltarPaso(step.id);
                    }}
                    title="Saltar este paso (lo haré después)"
                  >
                    <SkipForward className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* ── Footer ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-muted-foreground">
          Progreso local: {localProgress}%
        </p>
        <div className="flex items-center gap-2">
          {isForceRestart && (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/onboarding">
                Volver a vista normal
              </Link>
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={handleReiniciar}>
            <RotateCcw className="h-3 w-3 mr-1" />
            Reiniciar
          </Button>
        </div>
      </div>
    </div>
  );
}
