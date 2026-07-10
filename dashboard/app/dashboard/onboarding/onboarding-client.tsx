'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { playComplete } from '@/lib/sound';
import {
  CheckCircle2,
  Loader2,
  Lightbulb,
  ExternalLink,
  Stethoscope,
  Clock,
  UserPlus,
  Bell,
  ListChecks,
  Sparkles,
  RefreshCw,
  RotateCcw,
  SkipForward,
  Building2,
} from 'lucide-react';
import { ONBOARDING_STEPS, FALLBACK_TIPS } from '@/lib/onboarding-types';
import { useToast } from '@/components/ui/use-toast';

// ─── Tipos ──────────────────────────────────────────────────

interface OnboardingClientProps {
  initialCompleted: string[];
  isComplete: boolean;
  isForceRestart?: boolean;
  verProgreso?: boolean;
}

type TipStatus = 'idle' | 'loading' | 'fallback' | 'ai_loaded' | 'error';

interface TipState {
  text: string;
  status: TipStatus;
}

// ─── Map icon string → component ────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  Building2,
  Stethoscope,
  Clock,
  UserPlus,
  Bell,
  Sparkles,
};

// ═══════════════════════════════════════════════════════════════
//  Hook: useOnboarding
// ═══════════════════════════════════════════════════════════════

function useOnboarding(
  initialCompleted: string[],
  isComplete: boolean,
  isForceRestart?: boolean,
  verProgreso?: boolean,
) {
  const router = useRouter();
  const { toast } = useToast();

  // ── Pasos completados ────────────────────────────────────
  const [completed, setCompleted] = useState<string[]>(() =>
    isForceRestart ? [] : [...initialCompleted],
  );

  // ── Paso activo (expandido) ──────────────────────────────
  const [activeStep, setActiveStep] = useState<string | null>(() => {
    if (isForceRestart) return null;
    if (initialCompleted.length >= ONBOARDING_STEPS.length) return null;
    return ONBOARDING_STEPS.find((s) => !initialCompleted.includes(s.id))?.id ?? null;
  });

  // ── Tips por paso ────────────────────────────────────────
  const [tipStates, setTipStates] = useState<Record<string, TipState>>({});

  // ── Interacción manual ───────────────────────────────────
  const [hasManualInteraction, setHasManualInteraction] = useState(false);
  const [showProgressDetail, setShowProgressDetail] = useState(false);

  // ── Helpers derivados ────────────────────────────────────
  const allLocallyDone = completed.length >= ONBOARDING_STEPS.length;
  const localProgress = Math.round((completed.length / ONBOARDING_STEPS.length) * 100);

  const showSuccess =
    (isComplete || (allLocallyDone && hasManualInteraction)) && !verProgreso && !showProgressDetail;

  // ── Cargar tip IA ────────────────────────────────────────
  // NOTA: No usar useCallback porque tipStates cambia constantemente.
  // El efecto que la llama usa eslint-disable-next-line para evitar loops.
  const loadTip = async (stepId: string) => {
    // Leer estado actual desde setter funcional para evitar closure stale
    let shouldLoad = false;
    setTipStates((prev) => {
      const current = prev[stepId];
      if (current?.status === 'loading' || current?.status === 'ai_loaded') {
        return prev; // no cambiar
      }
      shouldLoad = true;
      const fallbackContent = FALLBACK_TIPS[stepId] || '';
      return {
        ...prev,
        [stepId]: { text: prev[stepId]?.text || fallbackContent, status: 'loading' },
      };
    });

    if (!shouldLoad) return;

    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepId }),
      });
      const data = await res.json();

      if (data?.tip) {
        setTipStates((prev) => ({
          ...prev,
          [stepId]: {
            text: data.tip,
            status: data.success === true ? 'ai_loaded' : 'fallback',
          },
        }));
      }
    } catch {
      setTipStates((prev) => ({
        ...prev,
        [stepId]: {
          text: prev[stepId]?.text || FALLBACK_TIPS[stepId] || '',
          status: 'error',
        },
      }));
    }
  };

  // ── Efecto: cargar tip al abrir un paso ──────────────────
  useEffect(() => {
    if (showSuccess || !activeStep) return;

    const current = tipStates[activeStep];
    // Solo cargar si está idle o error (para reintentar automático)
    if (!current || current.status === 'idle' || current.status === 'error') {
      loadTip(activeStep);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStep, showSuccess]);

  // ── Checks de estado de paso ─────────────────────────────
  const isStepCompleted = (id: string) => completed.includes(id);

  const isStepPending = (id: string) => {
    const idx = ONBOARDING_STEPS.findIndex((s) => s.id === id);
    if (idx === 0) return false;
    return !completed.includes(ONBOARDING_STEPS[idx - 1].id);
  };

  // ── Marcar paso como completado ──────────────────────────
  const marcarCompletado = async (stepId: string) => {
    if (isStepPending(stepId)) return;
    setHasManualInteraction(true);

    // 1. Optimistic UI
    setCompleted((prev) => (prev.includes(stepId) ? prev : [...prev, stepId]));
    playComplete();

    // 2. Persistir en servidor (fire-and-forget con toast de error)
    try {
      const res = await fetch('/api/onboarding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepId }),
      });
      if (!res.ok) throw new Error('Error en servidor');
    } catch {
      toast({
        title: 'Error al guardar',
        description: 'No se pudo conectar con el servidor. El progreso se perderá al recargar.',
        variant: 'destructive',
      });
    }

    // 3. Auto-avance: buscar siguiente paso disponible
    setCompleted((currentCompleted) => {
      const updated = currentCompleted.includes(stepId)
        ? currentCompleted
        : [...currentCompleted, stepId];
      // Buscar el siguiente paso que no esté completado ni pendiente
      const currentIdx = ONBOARDING_STEPS.findIndex((s) => s.id === stepId);
      const nextIdx = ONBOARDING_STEPS.findIndex((s, i) => {
        if (i <= currentIdx) return false;
        const prevStep = ONBOARDING_STEPS[i - 1];
        if (!updated.includes(prevStep.id)) return false;
        return !updated.includes(s.id);
      });
      // setTimeout para evitar setState durante otro setState
      setTimeout(() => {
        setActiveStep(nextIdx !== -1 ? ONBOARDING_STEPS[nextIdx].id : null);
      }, 0);
      return updated;
    });
  };

  // ── Saltar paso ──────────────────────────────────────────
  const saltarPaso = (stepId: string) => {
    const currentIdx = ONBOARDING_STEPS.findIndex((s) => s.id === stepId);
    for (let i = currentIdx + 1; i < ONBOARDING_STEPS.length; i++) {
      if (!isStepPending(ONBOARDING_STEPS[i].id)) {
        setActiveStep(ONBOARDING_STEPS[i].id);
        toast({
          title: 'Paso omitido',
          description: 'Seguirá apareciendo como pendiente hasta que lo marques como completado.',
        });
        return;
      }
    }
    setActiveStep(null);
    toast({
      title: 'No hay más pasos disponibles',
      description: 'Completá los pasos pendientes para poder continuar.',
    });
  };

  // ── Reiniciar ────────────────────────────────────────────
  const handleReiniciar = async () => {
    try {
      await fetch('/api/onboarding', { method: 'DELETE' });
    } catch {
      /* fallback a recarga */
    }
    window.location.href = '/dashboard/onboarding?reiniciar=true';
  };

  return {
    completed,
    activeStep,
    setActiveStep,
    tipStates,
    hasManualInteraction,
    showProgressDetail,
    setShowProgressDetail,
    showSuccess,
    allLocallyDone,
    localProgress,
    loadTip,
    isStepCompleted,
    isStepPending,
    marcarCompletado,
    saltarPaso,
    handleReiniciar,
  };
}

// ═══════════════════════════════════════════════════════════════
//  Sub-component: SuccessScreen
// ═══════════════════════════════════════════════════════════════

function SuccessScreen({
  onVerDetalle,
  onReiniciar,
}: {
  onVerDetalle: () => void;
  onReiniciar: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-emerald-200/30 dark:bg-emerald-800/20 rounded-full blur-xl animate-pulse" />
        <div className="relative flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/30">
          <CheckCircle2 className="h-12 w-12 text-white" />
        </div>
      </div>

      <div className="text-center space-y-3 mb-8 max-w-md">
        <h3 className="text-2xl font-bold tracking-tight">Consultorio operativo</h3>
        <p className="text-muted-foreground leading-relaxed">
          Todos los pasos están completos. Ya podés gestionar turnos, pacientes y comunicarte con
          tus pacientes desde el panel.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
        <Button asChild className="flex-1 shadow-sm">
          <Link href="/dashboard">Ir al Panel Principal</Link>
        </Button>
        <Button variant="outline" asChild className="flex-1">
          <Link href="/dashboard/turnos">Gestionar Turnos</Link>
        </Button>
      </div>

      <div className="flex items-center gap-3 mt-4">
        <Button variant="outline" size="sm" onClick={onVerDetalle}>
          <ListChecks className="h-4 w-4 mr-1.5" />
          Ver detalle de pasos
        </Button>
        <Button variant="ghost" size="sm" onClick={onReiniciar} className="text-muted-foreground">
          <Sparkles className="h-4 w-4 mr-1.5" />
          Re-ejecutar asistente IA
        </Button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  Sub-component: AiTipCard
// ═══════════════════════════════════════════════════════════════

function AiTipCard({
  stepId,
  stepTitle,
  tipState,
  onRetry,
}: {
  stepId: string;
  stepTitle: string;
  tipState: TipState | undefined;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-xl bg-gradient-to-br from-amber-50 to-orange-50/40 dark:from-amber-950/15 dark:to-orange-950/8 border border-amber-200/40 dark:border-amber-800/25 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/40 shrink-0 mt-0.5 shadow-sm shadow-amber-200/50">
          <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-1.5 tracking-wide uppercase">
            Guía IA · {stepTitle}
          </p>

          {!tipState || tipState.status === 'idle' ? (
            <p className="text-sm text-amber-700/50 dark:text-amber-400/50 italic leading-relaxed">
              Hacé clic en este paso para recibir una guía personalizada del asistente IA.
            </p>
          ) : (
            <>
              <p className="text-sm leading-relaxed text-amber-900 dark:text-amber-200">
                {tipState.text}
              </p>

              {tipState.status === 'loading' && (
                <div className="flex items-center gap-1.5 mt-2 text-[11px] text-amber-500/70 dark:text-amber-400/60">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Conectando con IA para mejorar sugerencia...</span>
                </div>
              )}

              {(tipState.status === 'fallback' || tipState.status === 'error') && (
                <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-amber-200/30 dark:border-amber-800/25">
                  <span className="text-[10px] text-amber-500/60 dark:text-amber-400/50">
                    {tipState.status === 'error'
                      ? 'Error de conexión con IA'
                      : 'Consejo IA no disponible'}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRetry();
                    }}
                    className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 transition-colors"
                  >
                    <RefreshCw className="h-2.5 w-2.5" />
                    Reintentar con conexión IA
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  Sub-component: StepDots (progreso visual)
// ═══════════════════════════════════════════════════════════════

function StepDots({
  steps,
  completed,
  activeStep,
  isStepPending: checkPending,
  onActivate,
}: {
  steps: typeof ONBOARDING_STEPS;
  completed: string[];
  activeStep: string | null;
  isStepPending: (id: string) => boolean;
  onActivate: (id: string | null) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      {steps.map((step, idx) => {
        const done = completed.includes(step.id);
        const active = activeStep === step.id;
        const pending = checkPending(step.id);
        const stepNumber = idx + 1;

        return (
          <button
            key={step.id}
            onClick={() => {
              if (done || pending) return;
              onActivate(active ? null : step.id);
            }}
            disabled={pending && !done}
            className="flex flex-col items-center gap-1 group"
            title={step.title}
          >
            <div
              className={`
              flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium
              transition-[border-color,box-shadow,background] duration-300
              ${
                done
                  ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-200'
                  : active
                    ? 'bg-primary text-primary-foreground ring-2 ring-primary/30 scale-110'
                    : pending
                      ? 'bg-muted-foreground/10 text-muted-foreground/40 cursor-not-allowed'
                      : 'bg-muted text-muted-foreground group-hover:bg-muted-foreground/20 group-hover:scale-105 cursor-pointer'
              }
            `}
            >
              {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : stepNumber}
            </div>
            <span
              className={`
              text-[10px] leading-tight text-center max-w-14 truncate
              ${done ? 'text-emerald-600 font-medium' : active ? 'text-primary font-medium' : 'text-muted-foreground/60'}
            `}
            >
              {step.title}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  Componente principal
// ═══════════════════════════════════════════════════════════════

export function OnboardingClient(props: OnboardingClientProps) {
  const router = useRouter();
  const { isForceRestart, verProgreso } = props;

  const {
    completed,
    activeStep,
    setActiveStep,
    tipStates,
    showProgressDetail,
    setShowProgressDetail,
    showSuccess,
    allLocallyDone,
    localProgress,
    loadTip,
    isStepCompleted,
    isStepPending,
    marcarCompletado,
    saltarPaso,
    handleReiniciar,
  } = useOnboarding(
    props.initialCompleted,
    props.isComplete,
    props.isForceRestart,
    props.verProgreso,
  );

  // ── Pantalla de éxito ────────────────────────────────────
  if (showSuccess) {
    return (
      <SuccessScreen
        onVerDetalle={() => setShowProgressDetail(true)}
        onReiniciar={handleReiniciar}
      />
    );
  }

  // ── Vista principal ──────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Progress bar ──────────────────────────────────── */}
      <div className="rounded-xl bg-card border p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Progreso</span>
            <span className="text-xs text-muted-foreground">
              {isForceRestart
                ? `Revisando ${ONBOARDING_STEPS.length} pasos`
                : `${completed.length} de ${ONBOARDING_STEPS.length} pasos`}
            </span>
          </div>
          <span className="text-sm font-semibold tabular-nums text-primary">{localProgress}%</span>
        </div>

        <div className="h-2.5 bg-muted rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-[width] duration-700 ease-out"
            style={{ width: `${localProgress}%` }}
          />
        </div>

        <StepDots
          steps={ONBOARDING_STEPS}
          completed={completed}
          activeStep={activeStep}
          isStepPending={isStepPending}
          onActivate={(id) => setActiveStep(id)}
        />
      </div>

      {/* ── Barra de acciones ─────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground">
          {isForceRestart
            ? 'Repasá cada paso y marcalo como completado cuando lo configures.'
            : 'Hacé clic en un paso para abrir la guía IA y configurarlo.'}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>
            <SkipForward className="h-3.5 w-3.5 mr-1.5" />
            Continuar más tarde
          </Button>
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
              Reiniciar
            </Button>
          )}
        </div>
      </div>

      {/* ── Steps ──────────────────────────────────────────── */}
      <div className="space-y-2.5">
        {ONBOARDING_STEPS.map((step, idx) => {
          const Icon = ICON_MAP[step.icon] || Lightbulb;
          const done = isStepCompleted(step.id);
          const active = activeStep === step.id;
          const pending = isStepPending(step.id);
          const isLastStep = idx === ONBOARDING_STEPS.length - 1;

          return (
            <Card
              key={step.id}
              className={`transition-[max-height,opacity] duration-300 overflow-hidden ${
                done
                  ? 'border-emerald-200/70 dark:border-emerald-800/40 bg-emerald-50/40 dark:bg-emerald-950/8'
                  : active
                    ? 'border-primary/25 shadow-md shadow-primary/5 ring-1 ring-primary/10'
                    : pending
                      ? 'opacity-40'
                      : 'hover:border-muted-foreground/25 hover:shadow-sm cursor-pointer'
              }`}
            >
              {/* ── Header clickeable ──────────────────────── */}
              <button
                className="w-full text-left"
                onClick={() => {
                  if (done || pending) return;
                  setActiveStep(active ? null : step.id);
                }}
                disabled={done || pending}
              >
                <CardHeader
                  className={`p-4 transition-colors ${active && !done ? 'pb-3' : 'pb-4'}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`
                      flex items-center justify-center h-10 w-10 rounded-xl shrink-0 transition-[background,color,box-shadow] duration-300
                      ${
                        done
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 shadow-sm shadow-emerald-200/50'
                          : active
                            ? 'bg-primary/10 text-primary scale-105'
                            : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {done ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle
                          className={`text-base ${done ? 'text-emerald-700 dark:text-emerald-300' : ''}`}
                        >
                          {step.title}
                        </CardTitle>
                        {done && (
                          <Badge
                            variant="outline"
                            className="text-emerald-600 border-emerald-200 bg-emerald-100/50 dark:border-emerald-800 dark:text-emerald-400 dark:bg-emerald-900/20 text-[10px] px-1.5 h-5 font-medium"
                          >
                            Listo
                          </Badge>
                        )}
                        {pending && (
                          <Badge
                            variant="outline"
                            className="text-muted-foreground/60 border-muted-foreground/20 text-[10px] px-1.5 h-5"
                          >
                            Bloqueado
                          </Badge>
                        )}
                      </div>
                      <CardDescription
                        className={`text-sm mt-0.5 ${done ? 'text-emerald-600/60 dark:text-emerald-400/60' : ''}`}
                      >
                        {step.description}
                      </CardDescription>
                    </div>

                    <div
                      className={`
                      flex items-center justify-center h-7 w-7 rounded-full text-xs font-mono transition-colors duration-300
                      ${
                        done
                          ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : active
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted/50 text-muted-foreground'
                      }`}
                    >
                      {done ? '✓' : `0${idx + 1}`}
                    </div>
                  </div>
                </CardHeader>
              </button>

              {/* ── Contenido expandido ────────────────────── */}
              {active && !done && !pending && (
                <CardContent className="px-4 pb-4 pt-0 space-y-3">
                  <div className="h-px bg-border/50" />

                  {/* AI Tip */}
                  <AiTipCard
                    stepId={step.id}
                    stepTitle={step.title}
                    tipState={tipStates[step.id]}
                    onRetry={() => loadTip(step.id)}
                  />

                  {/* Action button */}
                  <Button asChild className="w-full gap-2 shadow-sm">
                    <Link href={step.actionLink}>
                      <ExternalLink className="h-4 w-4" />
                      {step.actionLabel}
                    </Link>
                  </Button>

                  {/* Botones inferiores */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 gap-2 border-emerald-200/70 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 dark:border-emerald-800/50 dark:text-emerald-400 dark:hover:bg-emerald-950/30 dark:hover:border-emerald-700 transition-[border-color,background,color]"
                      onClick={(e) => {
                        e.stopPropagation();
                        marcarCompletado(step.id);
                      }}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {isLastStep ? 'Listo, terminé' : 'Ya lo configuré, siguiente →'}
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50"
                      onClick={(e) => {
                        e.stopPropagation();
                        saltarPaso(step.id);
                      }}
                      title="Omitir este paso por ahora (sigue pendiente)"
                      aria-label="Omitir este paso"
                    >
                      <SkipForward className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* ── Footer ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2 border-t border-muted/50">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          <span>
            {completed.length}/{ONBOARDING_STEPS.length} completados
          </span>
        </div>
        <div className="flex items-center gap-2">
          {showProgressDetail && allLocallyDone ? (
            <Button variant="outline" size="sm" onClick={() => setShowProgressDetail(false)}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
              Volver a pantalla de éxito
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard')}
                className="text-muted-foreground"
              >
                <SkipForward className="h-3 w-3 mr-1" />
                Continuar más tarde
              </Button>
              {isForceRestart && (
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/dashboard/onboarding">Ver progreso real</Link>
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReiniciar}
                className="text-muted-foreground"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                {isForceRestart ? 'Reiniciar de nuevo' : 'Reiniciar'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
