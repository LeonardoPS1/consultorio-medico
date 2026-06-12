'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2, Loader2, Lightbulb, ExternalLink,
  Stethoscope, Clock, UserPlus, Bell,
  ListChecks,
  Sparkles, RefreshCw, RotateCcw, SkipForward, Building2,
} from 'lucide-react';
import { ONBOARDING_STEPS, FALLBACK_TIPS } from '@/lib/onboarding-types';
import { useToast } from '@/components/ui/use-toast';

// ─── Claves para localStorage ──────────────────────────────
const LS_KEY = 'aicoremed_onboarding_completed';
const LS_ACTIVE_STEP_KEY = 'aicoremed_onboarding_active_step';

// ─── Props ──────────────────────────────────────────────────

interface OnboardingClientProps {
  initialCompleted: string[];
  isComplete: boolean;
  isForceRestart?: boolean;
  verProgreso?: boolean;
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

// ─── Component ──────────────────────────────────────────────

export function OnboardingClient({ initialCompleted, isComplete, isForceRestart, verProgreso }: OnboardingClientProps) {
  const router = useRouter();
  const { toast } = useToast();

  // ── Inicializar: server state + localStorage backup ─────
  //
  // Estrategia:
  //  - SIEMPRE mergear server state con localStorage, para que el backup
  //    local no se pierda aunque el PUT al servidor haya fallado.
  //  - La flag hasManualInteraction (abajo) evita que se muestre la
  //    pantalla de éxito sin interacción del usuario, incluso si todos
  //    los pasos aparecen como completados por el merge.
  //  - En isForceRestart se ignora localStorage (handleReiniciar ya lo
  //    limpió, pero si no, no queremos datos viejos).
  //
  const [completed, setCompleted] = useState<string[]>(() => {
    if (isForceRestart) return [];
    const base = [...initialCompleted];
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (stored) {
        const parsed: string[] = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          for (const step of parsed) {
            if (typeof step === 'string' && !base.includes(step)) {
              base.push(step);
            }
          }
        }
      }
    } catch { /* ignorar */ }
    return base;
  });

  // ── Inicializar activeStep: restaurar de localStorage o abrir primer paso incompleto ──
  //
  // Estrategia:
  //  1. Si es forceRestart → null (no abrir nada)
  //  2. Si hay un activeStep guardado en localStorage y el paso todavía
  //     no está completado → restaurarlo (el usuario vuelve donde estaba)
  //  3. Si no hay activeStep guardado → abrir el primer paso incompleto
  //     automáticamente para que el usuario vea por dónde seguir
  //  4. Si todos están completos → null (se mostrará la pantalla de éxito)
  //
  const [activeStep, setActiveStep] = useState<string | null>(() => {
    if (isForceRestart) return null;

    // Calcular el set completo de completed (server + localStorage)
    const baseSteps = [...initialCompleted];
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          for (const step of parsed) {
            if (typeof step === 'string' && !baseSteps.includes(step)) {
              baseSteps.push(step);
            }
          }
        }
      }
    } catch { /* ignorar */ }

    // Si todos los pasos están completos, no abrir nada (pantalla de éxito)
    if (baseSteps.length >= ONBOARDING_STEPS.length) return null;

    // 1. Intentar restaurar activeStep guardado
    try {
      const storedActive = localStorage.getItem(LS_ACTIVE_STEP_KEY);
      if (storedActive) {
        const parsed = JSON.parse(storedActive);
        if (typeof parsed === 'string') {
          const stepExists = ONBOARDING_STEPS.some(s => s.id === parsed);
          const stepCompleted = baseSteps.includes(parsed);
          if (stepExists && !stepCompleted) {
            return parsed;
          }
        }
      }
    } catch { /* ignorar */ }

    // 2. Abrir el primer paso incompleto (que no esté pendiente)
    const firstIncomplete = ONBOARDING_STEPS.find(s => !baseSteps.includes(s.id));
    return firstIncomplete?.id ?? null;
  });

  // ── Helper: persistir activeStep ─────────────────────────
  const persistActiveStep = useCallback((stepId: string | null) => {
    if (isForceRestart) return;
    try {
      if (stepId) {
        localStorage.setItem(LS_ACTIVE_STEP_KEY, JSON.stringify(stepId));
      } else {
        localStorage.removeItem(LS_ACTIVE_STEP_KEY);
      }
    } catch { /* ignorar */ }
  }, [isForceRestart]);

  // Al montar, si hay progress guardado pero activeStep se restauró como null,
  // persistirlo para que al recargar se mantenga
  useEffect(() => {
    if (activeStep) {
      persistActiveStep(activeStep);
    }
  // Solo al montar
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Flag de interacción manual en esta sesión ────────────
  // Evita que allLocallyDone (calculado de completed) muestre la
  // pantalla de éxito si el usuario nunca tocó un botón en esta sesión.
  const [hasManualInteraction, setHasManualInteraction] = useState(false);

  // ── Tips: pre-cargar fallback + actualizar con IA ──────
  const [tips, setTips] = useState<Record<string, string>>(() => {
    // Inicializar con fallback tips para todos los pasos
    // Así el usuario ve contenido útil inmediatamente
    return Object.fromEntries(
      ONBOARDING_STEPS.map((s) => [s.id, ''])
    );
  });
  const [loadingTips, setLoadingTips] = useState<Set<string>>(new Set());
  const [failedTips, setFailedTips] = useState<Set<string>>(new Set());
  const [fallbackTips, setFallbackTips] = useState<Set<string>>(new Set());

  // ── Persistir a localStorage ─────────────────────────────

  const saveToLocalStorage = (steps: string[]) => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(steps));
    } catch { /* ignorar */ }
  };

  // ── Cargar tip IA ───────────────────────────────────────

  const loadTip = async (stepId: string) => {
    if (loadingTips.has(stepId)) return;

    // Mostrar fallback INMEDIATAMENTE mientras se carga la IA
    const fallbackContent = FALLBACK_TIPS[stepId];
    if (fallbackContent) {
      setTips((prev) => ({ ...prev, [stepId]: fallbackContent }));
      setFallbackTips((prev) => new Set(prev).add(stepId));
    }

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
        // Si la IA respondió con un tip real y diferente al fallback, usarlo
        setTips((prev) => ({ ...prev, [stepId]: data.tip }));
        if (data.success === true) {
          // IA respondió correctamente → remover marca de fallback
          setFallbackTips((prev) => { const next = new Set(prev); next.delete(stepId); return next; });
        }
        // Si success es false, mantener fallback (ya seteado arriba)
      } else {
        // Mantener el fallback que ya mostramos
      }
    } catch {
      // Mantener el fallback que ya mostramos
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
    if (isComplete || allLocallyDone) return;
    if (activeStep) {
      const currentTip = tips[activeStep];
      // Mostrar fallback inmediato si no hay tip todavía
      if (!currentTip) {
        // Setear fallback instantly sin esperar fetch
        const fb = FALLBACK_TIPS[activeStep];
        if (fb) {
          setTips((prev) => ({ ...prev, [activeStep]: fb }));
          setFallbackTips((prev) => new Set(prev).add(activeStep));
        }
        // Cargar IA en background
        loadTip(activeStep);
      }
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

  // ── ¿Mostrar pantalla de éxito? ──────────────────────────
  // Solo se basa en el estado mergeado del cliente (server + localStorage).
  // Si todos los pasos están completados en el estado local, mostramos éxito.
  // Esto evita el bug donde:
  //   - isComplete del servidor puede ser false si PUT falló (pero localStorage tiene el backup)
  //   - hasManualInteraction se resetea en cada reload
  //   - El usuario completó todo pero al recargar no ve la pantalla de éxito
  // El único caso donde esto podría ser incorrecto es con localStorage stale de un reinicio,
  // pero handleReiniciar() limpia localStorage antes de recargar.
  //
  // Si verProgreso=true, NO mostrar la pantalla de éxito aunque todos los pasos
  // estén completos — así el usuario puede ver el detalle de cada paso.
  const [showProgressDetail, setShowProgressDetail] = useState(false);
  const showSuccess = allLocallyDone && !verProgreso && !showProgressDetail;

  // ── Marcar paso como completado (persiste en servidor) ──

  /**
   * Marca un paso como completado con persistencia instantánea.
   *
   * Estrategia (simplificada, sin race conditions):
   *  1. Guarda en localStorage SIEMPRE (lee-modifica-escribe directo).
   *     No depende de variables locales dentro de callbacks de setState.
   *  2. Actualiza el estado React.
   *  3. PUT al servidor en background (si falla, ya tenemos backup local).
   *  4. Auto-avance inteligente: salta pasos ya completados.
   */
  const marcarCompletado = async (stepId: string) => {
    // No permitir marcar un paso si el anterior no está completado
    if (isStepPending(stepId)) return;

    // Marcar interacción manual
    setHasManualInteraction(true);

    // ── 1. LocalStorage directo (lee-modifica-escribe) ──
    // Siempre leer el estado actual de localStorage antes de modificar,
    // para no perder pasos guardados en otra pestaña o sesión.
    try {
      const stored = localStorage.getItem(LS_KEY);
      const existing: string[] = stored ? JSON.parse(stored) : [];
      if (!existing.includes(stepId)) {
        saveToLocalStorage([...existing, stepId]);
      }
    } catch {
      // Si falla JSON.parse o getItem, guardar desde cero
      const parsed = [stepId];
      saveToLocalStorage(parsed);
    }

    // ── 2. Actualizar estado React ──
    setCompleted((prev) => {
      if (prev.includes(stepId)) return prev;
      return [...prev, stepId];
    });

    // ── 3. PUT al servidor (fire-and-forget) ──
    try {
      const res = await fetch('/api/onboarding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepId }),
      });
      if (!res.ok) {
        // Error del servidor — mostrar toast
        toast({
          title: 'Progreso guardado localmente',
          description: 'No se pudo conectar con el servidor, pero tu progreso está guardado en este navegador.',
          variant: 'default',
        });
      }
    } catch {
      toast({
        title: 'Progreso guardado localmente',
        description: 'No se pudo conectar con el servidor, pero tu progreso está guardado en este navegador.',
        variant: 'default',
      });
    }

    // ── 4. Auto-avance inteligente ──
    // Buscar el PRÓXIMO step que NO esté completado NI pendiente.
    // Esto evita que al avanzar caigamos en un step que ya estaba
    // completado por DB check (ej: paso 3 ya hecho cuando marcamos paso 2).
    const currentIdx = ONBOARDING_STEPS.findIndex((s) => s.id === stepId);
    const nextIdx = ONBOARDING_STEPS.findIndex((s, i) => {
      if (i <= currentIdx) return false;
      return !isStepCompleted(s.id) && !isStepPending(s.id);
    });
    if (nextIdx !== -1) {
      setActiveStep(ONBOARDING_STEPS[nextIdx].id);
      persistActiveStep(ONBOARDING_STEPS[nextIdx].id);
    } else {
      // No hay más steps accesibles
      setActiveStep(null);
      persistActiveStep(null);
    }
  };

  // ── Saltar paso (no aplica / lo haré después) ───────────
  //
  // Salta al PRÓXIMO step que NO esté pendiente (es decir, cuyo step
  // anterior esté completado). Si no hay, colapsa todo (activeStep = null).
  // Esto evita que se renderice contenido expandido en un step bloqueado.
  //
  const saltarPaso = (stepId: string) => {
    const currentIdx = ONBOARDING_STEPS.findIndex((s) => s.id === stepId);
    for (let i = currentIdx + 1; i < ONBOARDING_STEPS.length; i++) {
      const candidate = ONBOARDING_STEPS[i];
      if (!isStepPending(candidate.id)) {
        setActiveStep(candidate.id);
        persistActiveStep(candidate.id);
        return;
      }
    }
    // No hay más steps accesibles → colapsar
    setActiveStep(null);
    persistActiveStep(null);
  };

  // ── Reiniciar ────────────────────────────────────────────

  const handleReiniciar = async () => {
    // Limpiar localStorage para que el reinicio sea completo
    try { localStorage.removeItem(LS_KEY); } catch { /* ignorar */ }
    try { localStorage.removeItem(LS_ACTIVE_STEP_KEY); } catch { /* ignorar */ }
    // Limpiar progreso en servidor para que al volver más tarde no
    // aparezcan los pasos viejos como completados
    try {
      await fetch('/api/onboarding', { method: 'DELETE' });
    } catch { /* si falla, igual recargamos */ }
    // Usar window.location.href en lugar de router.push porque:
    // router.push a la misma ruta NO desmonta el componente, por lo que
    // useState no se reinicia y el estado viejo (6 pasos) persiste,
    // mostrando la pantalla de éxito prematuramente.
    // window.location.href forza un hard reload que monta todo fresco.
    window.location.href = '/dashboard/onboarding?reiniciar=true';
  };

  // ── Pantalla de éxito (todo completado) ─────────────────

  // Limpiar activeStep del localStorage cuando se muestra la pantalla de éxito
  useEffect(() => {
    if (showSuccess) {
      try { localStorage.removeItem(LS_ACTIVE_STEP_KEY); } catch { /* ignorar */ }
    }
  }, [showSuccess]);

  if (showSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        {/* Icono animado */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-emerald-200/30 dark:bg-emerald-800/20 rounded-full blur-xl animate-pulse" />
          <div className="relative flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/30">
            <CheckCircle2 className="h-12 w-12 text-white" />
          </div>
        </div>

        {/* Texto */}
        <div className="text-center space-y-3 mb-8 max-w-md">
          <h3 className="text-2xl font-bold tracking-tight">
            Consultorio operativo
          </h3>
          <p className="text-muted-foreground leading-relaxed">
            Todos los pasos están completos. Ya podés gestionar turnos, 
            pacientes y comunicarte con tus pacientes desde el panel.
          </p>
        </div>

        {/* Acciones */}
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
          <Button asChild className="flex-1 shadow-sm">
            <Link href="/dashboard">
              Ir al Panel Principal
            </Link>
          </Button>
          <Button variant="outline" asChild className="flex-1">
            <Link href="/dashboard/turnos">
              Gestionar Turnos
            </Link>
          </Button>
        </div>
        <div className="flex items-center gap-3 mt-4">
          <Button variant="outline" size="sm" onClick={() => setShowProgressDetail(true)}>
            <ListChecks className="h-4 w-4 mr-1.5" />
            Ver detalle de pasos
          </Button>
          <Button variant="ghost" size="sm" onClick={handleReiniciar} className="text-muted-foreground">
            <Sparkles className="h-4 w-4 mr-1.5" />
            Re-ejecutar asistente IA
          </Button>
        </div>
      </div>
    );
  }

  // ── Vista principal ──────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Progress bar ──────────────────────────────────────── */}
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
          <span className="text-sm font-semibold tabular-nums text-primary">
            {localProgress}%
          </span>
        </div>

        {/* Barra */}
        <div className="h-2.5 bg-muted rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${localProgress}%` }}
          />
        </div>

        {/* Step dots */}
        <div className="flex items-center justify-between">
          {ONBOARDING_STEPS.map((step, idx) => {
            const done = isStepCompleted(step.id);
            const active = isStepActive(step.id);
            const stepNumber = idx + 1;
            return (
                <button
                  key={step.id}
                  onClick={() => {
                    if (done || isStepPending(step.id)) return;
                    setActiveStep(active ? null : step.id);
                    persistActiveStep(active ? null : step.id);
                  }}
                  disabled={isStepPending(step.id) && !done}
                  className="flex flex-col items-center gap-1 group"
                  title={step.title}
                >
                <div
                  className={`
                    flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium
                    transition-all duration-300
                    ${done
                      ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-200'
                      : active
                        ? 'bg-primary text-primary-foreground ring-2 ring-primary/30 scale-110'
                        : isStepPending(step.id)
                          ? 'bg-muted-foreground/10 text-muted-foreground/40 cursor-not-allowed'
                          : 'bg-muted text-muted-foreground group-hover:bg-muted-foreground/20 group-hover:scale-105 cursor-pointer'
                    }
                  `}
                >
                  {done ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    stepNumber
                  )}
                </div>
                <span className={`
                  text-[10px] leading-tight text-center max-w-14 truncate
                  ${done ? 'text-emerald-600 font-medium' : active ? 'text-primary font-medium' : 'text-muted-foreground/60'}
                `}>
                  {step.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Barra de acciones ─────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground">
          {isForceRestart
            ? 'Repasá cada paso y marcalo como completado cuando lo configures.'
            : `Hacé clic en un paso para abrir la guía IA y configurarlo.`}
        </p>
        <div className="flex items-center gap-2">
          {/* Continuar más tarde — siempre visible */}
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
        const active = isStepActive(step.id);
        const pending = isStepPending(step.id);
        const isLastStep = idx === ONBOARDING_STEPS.length - 1;

        return (
          <Card
            key={step.id}
            className={`transition-all duration-300 overflow-hidden ${
              done
                ? 'border-emerald-200/70 dark:border-emerald-800/40 bg-emerald-50/40 dark:bg-emerald-950/8'
                : active
                  ? 'border-primary/25 shadow-md shadow-primary/5 ring-1 ring-primary/10'
                  : pending
                    ? 'opacity-40'
                    : 'hover:border-muted-foreground/25 hover:shadow-sm cursor-pointer'
            }`}
          >
            {/* ── Header (clickeable) ──────────────────────── */}
              <button
                className="w-full text-left"
                onClick={() => {
                  if (done || pending) return;
                  setActiveStep(active ? null : step.id);
                  persistActiveStep(active ? null : step.id);
                }}
                disabled={done || pending}
              >
              <CardHeader className={`p-4 transition-colors ${active && !done ? 'pb-3' : 'pb-4'}`}>
                <div className="flex items-center gap-3">
                  {/* Icon */}
                  <div
                    className={`flex items-center justify-center h-10 w-10 rounded-xl shrink-0 transition-all duration-300 ${
                      done
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 shadow-sm shadow-emerald-200/50'
                        : active
                          ? 'bg-primary/10 text-primary scale-105'
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
                      <CardTitle className={`text-base ${done ? 'text-emerald-700 dark:text-emerald-300' : ''}`}>
                        {step.title}
                      </CardTitle>
                      {done && (
                        <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-100/50 dark:border-emerald-800 dark:text-emerald-400 dark:bg-emerald-900/20 text-[10px] px-1.5 h-5 font-medium">
                          Listo
                        </Badge>
                      )}
                      {pending && (
                        <Badge variant="outline" className="text-muted-foreground/60 border-muted-foreground/20 text-[10px] px-1.5 h-5">
                          Bloqueado
                        </Badge>
                      )}
                    </div>
                    <CardDescription className={`text-sm mt-0.5 ${done ? 'text-emerald-600/60 dark:text-emerald-400/60' : ''}`}>
                      {step.description}
                    </CardDescription>
                  </div>

                  {/* Step number */}
                  <div className={`
                    flex items-center justify-center h-7 w-7 rounded-full text-xs font-mono transition-all duration-300
                    ${done
                      ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : active
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted/50 text-muted-foreground'
                    }
                  `}>
                    {done ? '✓' : `0${idx + 1}`}
                  </div>
                </div>
              </CardHeader>
            </button>

            {/* ── Expanded content ─────────────────────────── */}
            {active && !done && !pending && (
              <CardContent className="px-4 pb-4 pt-0 space-y-3">
                {/* Separador */}
                <div className="h-px bg-border/50" />

                {/* AI Tip */}
                <div className="rounded-xl bg-gradient-to-br from-amber-50 to-orange-50/40 dark:from-amber-950/15 dark:to-orange-950/8 border border-amber-200/40 dark:border-amber-800/25 p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/40 shrink-0 mt-0.5 shadow-sm shadow-amber-200/50">
                      <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-1.5 tracking-wide uppercase">
                        Guía IA · {step.title}
                      </p>
                      {loadingTips.has(step.id) ? (
                        <div className="flex items-center gap-2.5 text-sm text-amber-700 dark:text-amber-400 py-2">
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Consultando al asistente IA...</span>
                          </div>
                        </div>
                      ) : failedTips.has(step.id) ? (
                        <div className="flex flex-col gap-2 py-1">
                          <p className="text-sm text-amber-800/70 dark:text-amber-300/70 leading-relaxed">
                            No se pudo conectar con el asistente IA. Puede que esté iniciando o haya un problema temporal.
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
                        <>
                          <p className="text-sm leading-relaxed text-amber-900 dark:text-amber-200">
                            {tips[step.id]}
                          </p>
                          {fallbackTips.has(step.id) && (
                            <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-amber-200/30 dark:border-amber-800/25">
                              <span className="text-[10px] text-amber-500/60 dark:text-amber-400/50">
                                Asistente IA no disponible
                              </span>
                              <button
                                onClick={(e) => { e.stopPropagation(); loadTip(step.id); }}
                                className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 transition-colors"
                              >
                                <RefreshCw className="h-2.5 w-2.5" />
                                Reintentar con conexión IA
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-amber-700/50 dark:text-amber-400/50 italic leading-relaxed">
                          Hacé clic en este paso para recibir una guía personalizada del asistente IA.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action button */}
                <Button asChild className="w-full gap-2 shadow-sm">
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
                    className="flex-1 gap-2 border-emerald-200/70 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 dark:border-emerald-800/50 dark:text-emerald-400 dark:hover:bg-emerald-950/30 dark:hover:border-emerald-700 transition-all"
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
                    className="shrink-0 text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50"
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

      </div> {/* end steps wrapper */}

      {/* ── Footer ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2 border-t border-muted/50">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          <span>{completed.length}/{ONBOARDING_STEPS.length} completados</span>
        </div>
        <div className="flex items-center gap-2">
          {showProgressDetail && allLocallyDone ? (
            <Button variant="outline" size="sm" onClick={() => setShowProgressDetail(false)}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
              Volver a pantalla de éxito
            </Button>
          ) : (
            <>
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')} className="text-muted-foreground">
            <SkipForward className="h-3 w-3 mr-1" />
            Continuar más tarde
          </Button>
          {isForceRestart && (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/onboarding">
                Ver progreso real
              </Link>
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={handleReiniciar} className="text-muted-foreground">
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
