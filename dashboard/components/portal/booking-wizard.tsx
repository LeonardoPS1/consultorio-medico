'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { DoctorCard } from './doctor-card';
import { SlotPicker } from './slot-picker';
import { PortalCard } from '@/components/portal/portal-card';
import { PortalButton } from '@/components/portal/portal-button';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import {
  Loader2,
  ArrowLeft,
  Check,
  CalendarIcon,
  Stethoscope,
  CreditCard,
  ExternalLink,
} from 'lucide-react';
import type {
  MedicoPortal,
  SlotDisponible,
  TurnoCreadoPortal,
} from '@/lib/services/portal-booking';

type Step = 'medico' | 'slot' | 'confirmar' | 'pago' | 'completado';

const MOTIVOS_PREDEFINIDOS = [
  'Control general',
  'Dolor agudo',
  'Chequeo preventivo',
  'Resultados de exámenes',
  'Renovación de receta',
  'Licencia médica',
  'Derivación a especialista',
  'Segunda opinión',
];

interface BookingWizardProps {
  medicos: MedicoPortal[];
  rescheduleTurnoId?: string;
}

/* ─── Variants ─────────────────────────────────────────── */
const stepVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] as const } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.18 } },
};

const springPop = {
  initial: { scale: 0, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 1,
    transition: { type: 'spring' as const, stiffness: 250, damping: 16 },
  },
};

/* ─── Step indicator ───────────────────────────────────── */
const STEP_LABELS: Record<Step, string> = {
  medico: 'Médico',
  slot: 'Horario',
  confirmar: 'Confirmar',
  pago: 'Pago',
  completado: 'Listo',
};

const STEPS_ORDER: Step[] = ['medico', 'slot', 'confirmar', 'pago', 'completado'];

function StepIndicator({ currentStep, showPago }: { currentStep: Step; showPago: boolean }) {
  const visibleSteps = showPago ? STEPS_ORDER : STEPS_ORDER.filter((s) => s !== 'pago');
  const currentIdx = visibleSteps.indexOf(currentStep);

  return (
    <nav aria-label="Progreso del agendamiento" className="mb-8">
      <ol className="flex items-center justify-center gap-1">
        {visibleSteps.map((s, i) => {
          const isActive = i <= currentIdx;
          const isCurrent = i === currentIdx;
          return (
            <li key={s} className="flex items-center gap-1">
              {i > 0 && (
                <div
                  className={cn(
                    'h-px w-6 sm:w-8 transition-all duration-400',
                    isActive
                      ? 'bg-primary'
                      : 'bg-border',
                  )}
                  style={{
                    transition: 'background 0.3s var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1))',
                  }}
                />
              )}
              <div className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    'flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium transition-all duration-300',
                  )}
                  style={{
                    background: isCurrent
                      ? 'linear-gradient(135deg, hsl(var(--portal-primary)), hsl(var(--portal-accent)))'
                      : isActive
                        ? 'hsl(var(--portal-primary) / 0.15)'
                        : 'hsl(var(--portal-muted))',
                    color: isCurrent
                      ? '#fff'
                      : isActive
                        ? 'hsl(var(--portal-primary))'
                        : 'hsl(var(--portal-muted-foreground))',
                    boxShadow: isCurrent
                      ? '0 0 0 3px hsl(var(--portal-primary) / 0.15), 0 1px 3px hsl(var(--portal-primary) / 0.2)'
                      : 'none',
                    transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)',
                  }}
                >
                  {isActive && !isCurrent ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <span
                  className={cn(
                    'hidden sm:block text-[11px] font-medium transition-all duration-300',
                  )}
                  style={{
                    color: isActive
                      ? 'hsl(var(--portal-foreground))'
                      : 'hsl(var(--portal-muted-foreground))',
                  }}
                >
                  {STEP_LABELS[s]}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* ─── Componente principal ─────────────────────────────── */
export function BookingWizard({ medicos, rescheduleTurnoId }: BookingWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('medico');
  const [selectedMedico, setSelectedMedico] = useState<MedicoPortal | null>(null);
  const [selectedServicio, setSelectedServicio] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SlotDisponible | null>(null);
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(false);
  const [ultimoTurno, setUltimoTurno] = useState<TurnoCreadoPortal | null>(null);
  const [pagoInfo, setPagoInfo] = useState<{
    preferenceId: string;
    initPoint: string;
    sandboxInitPoint: string;
  } | null>(null);
  const [pagando, setPagando] = useState(false);
  const [pagoCompletado, setPagoCompletado] = useState(false);
  const [necesitaPago, setNecesitaPago] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => stopPolling, [stopPolling]);

  const handleSelectMedico = (m: MedicoPortal) => {
    setSelectedMedico(m);
    if (m.servicios.length > 0) {
      setSelectedServicio(m.servicios[0].id);
    }
  };

  const handleSelectSlot = (slot: SlotDisponible) => {
    setSelectedSlot(slot);
  };

  const handleIrASlots = () => {
    if (!selectedMedico || !selectedServicio) return;
    setStep('slot');
  };

  const handleIrAConfirmar = () => {
    if (!selectedSlot) return;
    setStep('confirmar');
  };

  const iniciarPago = async (turno: TurnoCreadoPortal) => {
    try {
      const res = await fetch('/api/portal/pagos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turnoId: turno.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al iniciar pago');
      setPagoInfo(data);
      return data;
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Error al iniciar pago',
        variant: 'destructive',
      });
      return null;
    }
  };

  const handleConfirmar = async () => {
    if (!selectedMedico || !selectedSlot || !selectedServicio) return;
    setLoading(true);

    try {
      const res = await fetch('/api/portal/turnos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicoId: selectedMedico.id,
          servicioId: selectedServicio,
          fechaHora: selectedSlot.fechaHora,
          motivo: motivo || undefined,
          ...(rescheduleTurnoId ? { rescheduleTurnoId } : {}),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al agendar');

      setUltimoTurno(data.turno);
      toast({
        title: rescheduleTurnoId ? 'Turno reagendado' : 'Turno agendado',
        description: 'Recibirás la confirmación por WhatsApp.',
      });

      // Si tiene precio, ir a paso de pago
      const precio = Number(data.turno.precio);
      if (precio > 0) {
        setNecesitaPago(true);
        setStep('pago');
        await iniciarPago(data.turno);
      } else {
        setNecesitaPago(false);
        setStep('completado');
      }
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Error al agendar',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePagarAhora = () => {
    if (!pagoInfo) return;
    const url = pagoInfo.initPoint || pagoInfo.sandboxInitPoint;
    if (!url) return;
    setPagando(true);
    window.open(url, '_blank');

    // Poll every 5s to check payment status (max 30 attempts = 2.5 min)
    let attempts = 0;
    const MAX_ATTEMPTS = 30;
    pollingRef.current = setInterval(async () => {
      attempts++;
      if (attempts > MAX_ATTEMPTS) {
        stopPolling();
        return;
      }
      if (!ultimoTurno) return;
      // Pausar si la pestaña está oculta
      if (document.hidden) return;
      try {
        const res = await fetch(`/api/portal/pagos/${ultimoTurno.id}`);
        const data = await res.json();
        if (data.turnoPagado) {
          setPagoCompletado(true);
          stopPolling();
          toast({ title: 'Pago confirmado', description: 'El pago fue procesado correctamente.' });
        }
      } catch {
        // keep polling
      }
    }, 5000);
  };

  const handleOmitirPago = () => {
    stopPolling();
    setStep('completado');
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /* ─── Step: Médico ──────────────────────────────────── */
  const stepMedico = (
    <motion.div
      key="medico"
      variants={stepVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="space-y-6"
    >
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Stethoscope className="h-5 w-5 text-primary" />
          Seleccioná un médico
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Elegí el profesional con quien querés agendar tu consulta.
        </p>
      </div>
      <div className="grid gap-4 stagger-premium">
        {medicos.map((m) => (
          <DoctorCard
            key={m.id}
            medico={m}
            selected={selectedMedico?.id === m.id}
            onSelect={handleSelectMedico}
          />
        ))}
      </div>
      {selectedMedico && (
        <div className="flex flex-col gap-3">
          {selectedMedico.servicios.length > 1 && (
            <div>
              <label className="text-sm font-medium mb-1 block">Tipo de consulta</label>
              <div className="flex gap-2 flex-wrap">
                {selectedMedico.servicios.map((s) => (
                  <Button
                    key={s.id}
                    variant={selectedServicio === s.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedServicio(s.id)}
                  >
                    {s.nombre}
                    {s.precio != null ? ` · $${s.precio.toLocaleString('es-CL')}` : ''}
                  </Button>
                ))}
              </div>
            </div>
          )}
          {selectedMedico.servicios.length === 0 ? (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 text-sm text-amber-800 dark:text-amber-200">
              Este médico no tiene servicios configurados. Contactá al administrador para asignar
              servicios.
            </div>
          ) : (
            <PortalButton variant="primary" onClick={handleIrASlots}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              Ver horarios disponibles
            </PortalButton>
          )}
        </div>
      )}
    </motion.div>
  );

  /* ─── Step: Slot ────────────────────────────────────── */
  const stepSlot = (
    <motion.div
      key="slot"
      variants={stepVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="space-y-4"
    >
      <div className="mb-2">
        <PortalButton variant="ghost" onClick={() => setStep('medico')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a médicos
        </PortalButton>
      </div>
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-primary" />
          Seleccioná un horario
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {selectedMedico?.nombre} ·{' '}
          {selectedServicio &&
            selectedMedico?.servicios.find((s) => s.id === selectedServicio)?.nombre}
        </p>
      </div>
      {selectedMedico && selectedServicio && (
        <SlotPicker
          medicoId={selectedMedico.id}
          servicioId={selectedServicio}
          onSelectSlot={handleSelectSlot}
          selectedSlot={selectedSlot}
        />
      )}
      {selectedSlot && (
        <PortalButton variant="primary" onClick={handleIrAConfirmar}>
          Continuar
        </PortalButton>
      )}
    </motion.div>
  );

  /* ─── Step: Confirmar ───────────────────────────────── */
  const stepConfirmar = (
    <motion.div
      key="confirmar"
      variants={stepVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="max-w-md mx-auto"
    >
      <div className="mb-2">
        <PortalButton variant="ghost" onClick={() => setStep('slot')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </PortalButton>
      </div>
      <PortalCard padding="none">
        <CardHeader>
          <CardTitle
            style={{ color: 'hsl(var(--portal-foreground))' }}
          >
            Confirmar turno
          </CardTitle>
          <CardDescription
            style={{ color: 'hsl(var(--portal-muted-foreground))' }}
          >
            Revisá los detalles antes de confirmar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Médico</span>
            <span className="font-medium">{selectedMedico?.nombre}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Especialidad</span>
            <span>{selectedMedico?.especialidad}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Servicio</span>
            <span>{selectedMedico?.servicios.find((s) => s.id === selectedServicio)?.nombre}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Fecha y hora</span>
            <span className="font-medium">
              {selectedSlot && formatDate(selectedSlot.fechaHora)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Duración</span>
            <span>{selectedSlot?.duracionMinutos} min</span>
          </div>
          {selectedSlot?.precio != null && selectedSlot.precio > 0 && (
            <div className="flex justify-between text-sm border-t pt-2">
              <span className="text-muted-foreground flex items-center gap-1">
                <CreditCard className="h-4 w-4" /> Valor
              </span>
              <span className="font-semibold text-lg">
                ${selectedSlot.precio.toLocaleString('es-CL')}
              </span>
            </div>
          )}
          <div>
            <label className="text-sm font-medium mb-2 block">Motivo (opcional)</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {MOTIVOS_PREDEFINIDOS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMotivo(motivo === m ? '' : m)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    motivo === m
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:border-primary hover:text-primary'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <Textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="O escribí tu propio motivo..."
              rows={2}
            />
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-2">
          <PortalButton variant="primary" fullWidth onClick={handleConfirmar} disabled={loading} loading={loading}>
            <Check className="mr-2 h-4 w-4" /> Confirmar turno
          </PortalButton>
          {selectedSlot?.precio != null && selectedSlot.precio > 0 && (
            <p className="text-xs text-muted-foreground text-center">
              El pago se procesará al confirmar
            </p>
          )}
            </CardFooter>
          </PortalCard>
        </motion.div>
      );

      /* ─── Step: Pago ────────────────────────────────────── */
  const stepPago = (
    <motion.div
      key="pago"
      variants={stepVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="max-w-md mx-auto"
    >
      <PortalCard padding="none">
        <CardHeader>
          <CardTitle
            className="flex items-center gap-2"
            style={{ color: 'hsl(var(--portal-foreground))' }}
          >
            <CreditCard
              className="h-5 w-5"
              style={{ color: 'hsl(var(--portal-primary))' }}
            />
            Pago pendiente
          </CardTitle>
          <CardDescription
            style={{ color: 'hsl(var(--portal-muted-foreground))' }}
          >
            Completá el pago para confirmar tu turno. Podés pagar ahora o hacerlo después desde el
            portal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {ultimoTurno && (
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monto</span>
                <span className="font-semibold text-lg">
                  ${Number(ultimoTurno.precio).toLocaleString('es-CL')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Médico</span>
                <span>{ultimoTurno.medicoNombre}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fecha</span>
                <span>{formatDate(ultimoTurno.fechaHora as unknown as string)}</span>
              </div>
            </div>
          )}

          {pagoCompletado ? (
            <motion.div
              variants={springPop}
              initial="initial"
              animate="animate"
              className="text-center py-4"
            >
              <div className="rounded-full bg-success/10 w-12 h-12 flex items-center justify-center mx-auto mb-2">
                <Check className="h-6 w-6 text-success" />
              </div>
              <p className="font-medium text-success">Pago confirmado</p>
            </motion.div>
          ) : (
            <div className="space-y-3">
              <PortalButton variant="primary" fullWidth onClick={handlePagarAhora} disabled={!pagoInfo || pagando} loading={pagando}>
                <ExternalLink className="mr-2 h-4 w-4" /> Pagar con MercadoPago
              </PortalButton>
              <PortalButton variant="ghost" fullWidth onClick={handleOmitirPago}>
                Pagar después
              </PortalButton>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex-col">
          {pagoCompletado && (
            <PortalButton variant="primary" fullWidth onClick={() => setStep('completado')}>
              <Check className="mr-2 h-4 w-4" /> Continuar
            </PortalButton>
          )}
        </CardFooter>
      </PortalCard>
    </motion.div>
  );

  /* ─── Step: Completado ──────────────────────────────── */
  const stepCompletado = (
    <motion.div
      key="completado"
      variants={stepVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="text-center py-12 max-w-md mx-auto"
    >
      <motion.div
        variants={springPop}
        initial="initial"
        animate="animate"
        className="rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6"
        style={{
          background: 'hsl(var(--portal-primary) / 0.1)',
        }}
      >
        <Check
          className="h-10 w-10"
          style={{ color: 'hsl(var(--portal-primary))' }}
        />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.3, ease: [0.16, 1, 0.3, 1] as const }}
      >
        <h2
          className="text-xl font-semibold mb-2"
          style={{ color: 'hsl(var(--portal-foreground))' }}
        >
          Turno agendado con éxito
        </h2>
        <p
          className="mb-8"
          style={{ color: 'hsl(var(--portal-muted-foreground))' }}
        >
          Te enviamos los detalles por WhatsApp. Recordá que podés cancelar con hasta 24h de
          anticipación.
        </p>
        <Button
          onClick={() => router.push('/portal/dashboard')}
          variant="outline"
          className="w-full sm:w-auto"
        >
          Volver al inicio
        </Button>
      </motion.div>
    </motion.div>
  );

  /* ─── Render ────────────────────────────────────────── */
  const stepMap: Record<Step, React.ReactNode> = {
    medico: stepMedico,
    slot: stepSlot,
    confirmar: stepConfirmar,
    pago: stepPago,
    completado: stepCompletado,
  };

  const showPago = necesitaPago || step === 'pago';

  return (
    <div>
      <StepIndicator currentStep={step} showPago={showPago} />
      <AnimatePresence mode="wait">{stepMap[step]}</AnimatePresence>
    </div>
  );
}
