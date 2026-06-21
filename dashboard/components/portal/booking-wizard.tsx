'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { DoctorCard } from './doctor-card';
import { SlotPicker } from './slot-picker';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { Loader2, ArrowLeft, Check, CalendarIcon, Stethoscope, CreditCard, ExternalLink } from 'lucide-react';
import type { MedicoPortal, SlotDisponible, TurnoCreadoPortal } from '@/lib/services/portal-booking';

type Step = 'medico' | 'slot' | 'confirmar' | 'pago' | 'completado';

interface BookingWizardProps {
  medicos: MedicoPortal[];
}

export function BookingWizard({ medicos }: BookingWizardProps) {
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
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al agendar');

      setUltimoTurno(data.turno);
      toast({ title: 'Turno agendado', description: 'Recibirás la confirmación por WhatsApp.' });

      // Si tiene precio, ir a paso de pago
      const precio = Number(data.turno.precio);
      if (precio > 0) {
        setStep('pago');
        await iniciarPago(data.turno);
      } else {
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

    // Poll every 5s to check payment status
    pollingRef.current = setInterval(async () => {
      if (!ultimoTurno) return;
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

  if (step === 'medico') {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            Seleccioná un médico
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Elegí el profesional con quien querés agendar tu consulta.
          </p>
        </div>
        <div className="grid gap-4">
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
            <Button onClick={handleIrASlots} className="w-full sm:w-auto">
              <CalendarIcon className="mr-2 h-4 w-4" />
              Ver horarios disponibles
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (step === 'slot') {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setStep('medico')} className="mb-2">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a médicos
        </Button>
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            Seleccioná un horario
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {selectedMedico?.nombre} · {selectedServicio && selectedMedico?.servicios.find((s) => s.id === selectedServicio)?.nombre}
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
          <Button onClick={handleIrAConfirmar} className="w-full sm:w-auto">
            Continuar
          </Button>
        )}
      </div>
    );
  }

  if (step === 'confirmar') {
    return (
      <div className="max-w-md mx-auto">
        <Button variant="ghost" onClick={() => setStep('slot')} className="mb-2">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Confirmar turno</CardTitle>
            <CardDescription>Revisá los detalles antes de confirmar</CardDescription>
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
              <span className="font-medium">{selectedSlot && formatDate(selectedSlot.fechaHora)}</span>
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
              <label className="text-sm font-medium mb-1 block">Motivo (opcional)</label>
              <Textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Breve descripción del motivo de la consulta"
                rows={2}
              />
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-2">
            <Button onClick={handleConfirmar} disabled={loading} className="w-full">
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Confirmando...</>
              ) : (
                <><Check className="mr-2 h-4 w-4" /> Confirmar turno</>
              )}
            </Button>
            {selectedSlot?.precio != null && selectedSlot.precio > 0 && (
              <p className="text-xs text-muted-foreground text-center">
                El pago se procesará al confirmar
              </p>
            )}
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (step === 'pago') {
    return (
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Pago pendiente
            </CardTitle>
            <CardDescription>
              Completá el pago para confirmar tu turno. Podés pagar ahora o hacerlo después desde el portal.
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
              <div className="text-center py-4">
                <div className="rounded-full bg-green-100 w-12 h-12 flex items-center justify-center mx-auto mb-2">
                  <Check className="h-6 w-6 text-green-600" />
                </div>
                <p className="font-medium text-green-700">Pago confirmado</p>
              </div>
            ) : (
              <div className="space-y-3">
                <Button onClick={handlePagarAhora} disabled={!pagoInfo || pagando} className="w-full" size="lg">
                  {pagando ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Esperando pago...</>
                  ) : (
                    <><ExternalLink className="mr-2 h-4 w-4" /> Pagar con MercadoPago</>
                  )}
                </Button>
                <Button onClick={handleOmitirPago} variant="ghost" className="w-full">
                  Pagar después
                </Button>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex-col">
            {pagoCompletado && (
              <Button onClick={() => setStep('completado')} className="w-full">
                <Check className="mr-2 h-4 w-4" /> Continuar
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Completado
  return (
    <div className="text-center py-12 max-w-md mx-auto">
      <div className="rounded-full bg-primary/10 w-16 h-16 flex items-center justify-center mx-auto mb-4">
        <Check className="h-8 w-8 text-primary" />
      </div>
      <h2 className="text-xl font-semibold mb-2">Turno agendado con éxito</h2>
      <p className="text-muted-foreground mb-6">
        Te enviamos los detalles por WhatsApp. Recordá que podés cancelar con hasta 24h de anticipación.
      </p>
      <div className="space-y-2">
        <Button onClick={() => router.push('/portal/dashboard')} variant="outline" className="w-full">
          Volver al inicio
        </Button>
      </div>
    </div>
  );
}
