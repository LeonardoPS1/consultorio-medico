'use client';

import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { X, Trash2, RefreshCw, UserPlus, CalendarPlus, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from '@/components/ui/use-toast';
import { PacienteSearchCombobox } from '@/components/pacientes/paciente-search-combobox';

interface WaitlistItem {
  id: string;
  pacienteId: string;
  medicoId: string;
  fechaInscripcion: Date;
  estado: string;
  notas: string | null;
  pacienteNombre: string | null;
  pacienteApellido: string | null;
  pacienteTelefono: string | null;
  medicoNombre: string | null;
}

interface MedicoOption {
  id: string;
  nombre: string;
}

interface OfertaTurnoItem {
  id: string;
  listaEsperaId: string;
  turnoId: string;
  fechaOferta: string;
  expiracion: string;
  estado: string;
  notificada: boolean | null;
  notificadaAt: string | null;
  respondedAt: string | null;
}

interface TurnoDisponible {
  id: string;
  fecha: string;
  hora: string;
  estado: string;
  pacienteNombre: string | null;
  medicoId: string;
}

interface FranjaLibre {
  fechaHora: string;
  fecha: string;
  hora: string;
  duracionMinutos: number;
}

type DestinoOferta =
  | { tipo: 'turno'; turnoId: string }
  | { tipo: 'franja'; fechaHora: string; pacienteId: string; medicoId: string };

export function ListaEsperaClient({ initialItems }: { initialItems: WaitlistItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [removing, setRemoving] = useState<string | null>(null);

  // Agregar paciente
  const [addOpen, setAddOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [nuevoPacienteId, setNuevoPacienteId] = useState('');
  const [nuevoMedicoId, setNuevoMedicoId] = useState('');
  const [notasNuevo, setNotasNuevo] = useState('');
  const [medicos, setMedicos] = useState<MedicoOption[]>([]);

  // Asignar turno manual (turno ofrecido)
  const [turnoDialogFor, setTurnoDialogFor] = useState<WaitlistItem | null>(null);
  const [tabTurno, setTabTurno] = useState<'turno' | 'franja'>('turno');
  const [turnosDisponibles, setTurnosDisponibles] = useState<TurnoDisponible[]>([]);
  const [loadingTurnosDisponibles, setLoadingTurnosDisponibles] = useState(false);
  const [franjas, setFranjas] = useState<FranjaLibre[]>([]);
  const [loadingFranjas, setLoadingFranjas] = useState(false);
  const [turnoSeleccionadoId, setTurnoSeleccionadoId] = useState('');
  const [franjaSeleccionada, setFranjaSeleccionada] = useState<FranjaLibre | null>(null);
  const [pacienteEnEsperaId, setPacienteEnEsperaId] = useState('');
  const [asignando, setAsignando] = useState(false);

  // Ver turnos ofrecidos
  const [ofertasAbiertas, setOfertasAbiertas] = useState<Record<string, boolean>>({});
  const [ofertasPorItem, setOfertasPorItem] = useState<Record<string, OfertaTurnoItem[]>>({});

  const cargarMedicos = useCallback(async () => {
    try {
      const res = await fetch('/api/medicos');
      const json = await res.json();
      const lista: MedicoOption[] = (json.data || []).map(
        (m: { id: string; nombre: string; apellido?: string }) => ({
          id: m.id,
          nombre: m.apellido ? `${m.nombre} ${m.apellido}` : m.nombre,
        }),
      );
      setMedicos(lista);
    } catch {
      toast({ title: 'Error al cargar médicos', variant: 'destructive' });
    }
  }, []);

  const cargarOfertas = useCallback(
    async (itemId: string) => {
      try {
        const res = await fetch(`/api/waitlist/ofertas?listaEsperaId=${itemId}`);
        const json = await res.json();
        setOfertasPorItem((prev) => ({ ...prev, [itemId]: json.data || [] }));
      } catch {
        setOfertasPorItem((prev) => ({ ...prev, [itemId]: [] }));
      }
    },
    [],
  );

  const cargarTurnosDisponibles = useCallback(async (medicoId: string) => {
    setLoadingTurnosDisponibles(true);
    setTurnosDisponibles([]);
    try {
      const res = await fetch(`/api/waitlist/turnos-disponibles?medicoId=${medicoId}`);
      const json = await res.json();
      setTurnosDisponibles(json.data || []);
    } catch {
      setTurnosDisponibles([]);
    } finally {
      setLoadingTurnosDisponibles(false);
    }
  }, []);

  const cargarFranjas = useCallback(async (medicoId: string) => {
    setLoadingFranjas(true);
    setFranjas([]);
    try {
      const res = await fetch(`/api/waitlist/franjas?medicoId=${medicoId}&dias=7&limite=15`);
      const json = await res.json();
      setFranjas(json.data || []);
    } catch {
      setFranjas([]);
    } finally {
      setLoadingFranjas(false);
    }
  }, []);

  useEffect(() => {
    if (addOpen && medicos.length === 0) void cargarMedicos();
  }, [addOpen, medicos.length, cargarMedicos]);

  const handleAdd = async () => {
    if (!nuevoPacienteId || !nuevoMedicoId) {
      toast({ title: 'Seleccioná paciente y médico', variant: 'destructive' });
      return;
    }
    setAdding(true);
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pacienteId: nuevoPacienteId, medicoId: nuevoMedicoId, notas: notasNuevo.trim() || undefined }),
      });
      if (!res.ok) throw new Error('Error al agregar');
      toast({ title: 'Paciente agregado a la lista de espera' });
      setAddOpen(false);
      setNuevoPacienteId('');
      setNuevoMedicoId('');
      setNotasNuevo('');
      await handleRefresh();
    } catch {
      toast({ title: 'Error al agregar paciente', variant: 'destructive' });
    } finally {
      setAdding(false);
    }
  };

  const nombrePacienteEnEspera = (id: string) => {
    const p = items.find((i) => i.id === id);
    return p ? `${p.pacienteNombre ?? ''} ${p.pacienteApellido ?? ''}`.trim() : '';
  };

  const handleOfrecerTurno = async (destino: DestinoOferta) => {
    if (!turnoDialogFor) return;
    setAsignando(true);
    try {
      const res = await fetch(`/api/waitlist/${turnoDialogFor.id}/oferta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(destino),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        toast({
          title: typeof json.error === 'string' ? json.error : 'No se pudo ofrecer el turno',
          variant: 'destructive',
        });
        return;
      }
      toast({ title: 'Turno ofrecido y notificado por WhatsApp' });
      setTurnoDialogFor(null);
      setTurnoSeleccionadoId('');
      setFranjaSeleccionada(null);
      await handleRefresh();
    } catch {
      toast({ title: 'No se pudo ofrecer el turno. Intente nuevamente.', variant: 'destructive' });
    } finally {
      setAsignando(false);
    }
  };

  const confirmarOferta = async () => {
    if (!turnoDialogFor || !pacienteEnEsperaId) return;
    if (tabTurno === 'turno') {
      if (!turnoSeleccionadoId) return;
      await handleOfrecerTurno({ tipo: 'turno', turnoId: turnoSeleccionadoId });
    } else {
      if (!franjaSeleccionada) return;
      await handleOfrecerTurno({
        tipo: 'franja',
        fechaHora: franjaSeleccionada.fechaHora,
        pacienteId: pacienteEnEsperaId,
        medicoId: turnoDialogFor.medicoId,
      });
    }
  };

  const toggleOfertas = async (item: WaitlistItem) => {
    const abierta = ofertasAbiertas[item.id];
    setOfertasAbiertas((prev) => ({ ...prev, [item.id]: !abierta }));
    if (!abierta) void cargarOfertas(item.id);
  };

  const handleRemove = async (id: string) => {
    setRemoving(id);
    try {
      const res = await fetch(`/api/waitlist/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al quitar paciente');
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast({ title: 'Paciente quitado de la lista de espera' });
    } catch {
      toast({ title: 'Error al quitar paciente', variant: 'destructive' });
    } finally {
      setRemoving(null);
    }
  };

  const handleRefresh = async () => {
    try {
      const res = await fetch('/api/waitlist?estado=activa');
      const json = await res.json();
      const items = (json.data || []).map((item: Record<string, unknown>) => ({
        ...item,
        fechaInscripcion: new Date(item.fechaInscripcion as string),
      }));
      setItems(items);
      toast({ title: 'Lista actualizada' });
    } catch {
      toast({ title: 'Error al actualizar', variant: 'destructive' });
    }
  };

  const formatDate = (date: Date) => {
    try {
      return format(date, "d 'de' MMMM '·' HH:mm", { locale: es });
    } catch {
      return date.toISOString();
    }
  };

  const formatOfertaFecha = (s: string) => {
    try {
      return format(new Date(s), "d 'de' MMMM '·' HH:mm", { locale: es });
    } catch {
      return s;
    }
  };

  const estadoOfertaBadge = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return <Badge className="bg-amber-500">Pendiente de confirmación</Badge>;
      case 'aceptada':
        return <Badge className="bg-emerald-500">Aceptada</Badge>;
      case 'rechazada':
        return <Badge variant="outline">Rechazada</Badge>;
      case 'expirada':
        return <Badge variant="secondary">Expirada</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  const turnoSeleccionado = turnosDisponibles.find((t) => t.id === turnoSeleccionadoId);

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-full bg-muted p-3">
              <X className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg">No hay pacientes en espera</h3>
            <p className="text-muted-foreground text-sm max-w-md">
              Agregá pacientes o esperá: cuando un turno se cancele, los pacientes en lista de espera
              recibirán automáticamente un turno ofrecido vía WhatsApp.
            </p>
            <div className="flex items-center gap-2">
              <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Agregar paciente
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Agregar paciente a lista de espera</DialogTitle>
                    <DialogDescription>
                      El paciente recibirá un turno ofrecido cuando se libere un turno del médico elegido.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Paciente</Label>
                      <PacienteSearchCombobox
                        value=""
                        onChange={(id) => setNuevoPacienteId(id)}
                       placeholder="Buscar paciente..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Médico</Label>
                      <Select value={nuevoMedicoId} onValueChange={setNuevoMedicoId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar médico..." />
                        </SelectTrigger>
                        <SelectContent>
                          {medicos.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Notas (opcional)</Label>
                      <Textarea
                        value={notasNuevo}
                        onChange={(e) => setNotasNuevo(e.target.value)}
                        placeholder="Ej: prefiere horario de tarde"
                        rows={2}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAddOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleAdd} disabled={adding}>
                      {adding ? 'Agregando...' : 'Agregar'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {items.length} paciente{items.length !== 1 ? 's' : ''} en espera
        </CardTitle>
        <div className="flex items-center gap-2">
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Agregar paciente
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Agregar paciente a lista de espera</DialogTitle>
                <DialogDescription>
                  El paciente recibirá un turno ofrecido por WhatsApp cuando se libere un turno del médico.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Paciente</Label>
                  <PacienteSearchCombobox
                    value=""
                    onChange={(e) => setNuevoPacienteId(e)}
                    placeholder="Buscar paciente..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Médico</Label>
                  <Select value={nuevoMedicoId} onValueChange={setNuevoMedicoId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar médico..." />
                    </SelectTrigger>
                    <SelectContent>
                      {medicos.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Notas (opcional)</Label>
                  <Textarea
                    value={notasNuevo}
                    onChange={(e) => setNotasNuevo(e.target.value)}
                    placeholder="prefiere horario de la mañana, etc."
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAdd} disabled={adding}>
                  {adding ? 'Agregando...' : 'Agregar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {items.map((item) => (
            <div key={item.id}>
              <div className="flex items-center justify-between gap-4 p-4 hover:bg-muted/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">
                      {item.pacienteNombre} {item.pacienteApellido}
                    </span>
                    <Badge variant="outline" className="shrink-0">
                      {item.medicoNombre}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    <span>{item.pacienteTelefono}</span>
                    <span>·</span>
                    <span>{formatDate(item.fechaInscripcion)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={item.estado === 'activa' ? 'default' : 'secondary'}>
                    {item.estado === 'activa' ? 'Esperando' : item.estado}
                  </Badge>

                  {item.estado === 'activa' && (
                    <Dialog
                      open={turnoDialogFor?.id === item.id}
                      onOpenChange={(open) => {
                        if (open) {
                          setTurnoDialogFor(item);
                          setTabTurno('turno');
                          setTurnoSeleccionadoId('');
                          setFranjaSeleccionada(null);
                          setPacienteEnEsperaId(item.id);
                          void cargarTurnosDisponibles(item.medicoId);
                          void cargarFranjas(item.medicoId);
                        } else {
                          setTurnoDialogFor(null);
                        }
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8"
                          aria-label="Asignar turno manualmente"
                        >
                          <CalendarPlus className="h-4 w-4 mr-1" />
                          Asignar turno
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Asignar turno (turno ofrecido)</DialogTitle>
                          <DialogDescription>
                            Elegí un turno existente o una franja libre del médico para ofrecerlo al
                            paciente en espera. Se notificará por WhatsApp con opción
                            ACEPTAR/RECHAZAR.
                          </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-2">
                          <Label>Paciente en espera</Label>
                          <Select value={pacienteEnEsperaId} onValueChange={setPacienteEnEsperaId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar paciente en espera..." />
                            </SelectTrigger>
                            <SelectContent>
                              {items
                                .filter((i) => i.medicoId === item.medicoId && i.estado === 'activa')
                                .map((p) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.pacienteNombre} {p.pacienteApellido}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <Tabs
                          value={tabTurno}
                          onValueChange={(v) => setTabTurno(v as 'turno' | 'franja')}
                        >
                          <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="turno">Turno existente</TabsTrigger>
                            <TabsTrigger value="franja">Franja libre</TabsTrigger>
                          </TabsList>

                          <TabsContent value="turno" className="space-y-2 max-h-72 overflow-y-auto">
                            {loadingTurnosDisponibles && (
                              <p className="text-sm text-muted-foreground">
                                Cargando turnos disponibles...
                              </p>
                            )}
                            {!loadingTurnosDisponibles && turnosDisponibles.length === 0 && (
                              <p className="text-sm text-muted-foreground">
                                No hay turnos disponibles para este médico.
                              </p>
                            )}
                            {turnosDisponibles.map((t) => {
                              const seleccionado = turnoSeleccionadoId === t.id;
                              return (
                                <div
                                  key={t.id}
                                  className={`flex items-center justify-between gap-3 rounded-lg border p-2 pl-3 transition-colors ${
                                    seleccionado ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={() => setTurnoSeleccionadoId(t.id)}
                                    className="min-w-0 flex-1 text-left"
                                  >
                                    <div className="font-medium">
                                      {t.fecha} · {t.hora}
                                    </div>
                                    <div className="mt-0.5 flex items-center gap-2 text-sm text-muted-foreground">
                                      <span className="truncate">{t.pacienteNombre}</span>
                                      <Badge variant="outline" className="shrink-0">
                                        {t.estado}
                                      </Badge>
                                    </div>
                                  </button>
                                  <Button
                                    size="sm"
                                    variant={seleccionado ? 'default' : 'outline'}
                                    onClick={() => setTurnoSeleccionadoId(t.id)}
                                  >
                                    Ofrecer
                                  </Button>
                                </div>
                              );
                            })}
                          </TabsContent>

                          <TabsContent value="franja" className="space-y-2 max-h-72 overflow-y-auto">
                            {loadingFranjas && (
                              <p className="text-sm text-muted-foreground">Cargando franjas libres...</p>
                            )}
                            {!loadingFranjas && franjas.length === 0 && (
                              <p className="text-sm text-muted-foreground">
                                No hay franjas libres para este médico.
                              </p>
                            )}
                            {franjas.map((f) => {
                              const seleccionada = franjaSeleccionada?.fechaHora === f.fechaHora;
                              return (
                                <div
                                  key={f.fechaHora}
                                  className={`flex items-center justify-between gap-3 rounded-lg border p-2 pl-3 transition-colors ${
                                    seleccionada ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={() => setFranjaSeleccionada(f)}
                                    className="min-w-0 flex-1 text-left"
                                  >
                                    <div className="font-medium">
                                      {f.fecha} · {f.hora}
                                    </div>
                                    <div className="mt-0.5 text-sm text-muted-foreground">
                                      Duración: {f.duracionMinutos} min
                                    </div>
                                  </button>
                                  <Button
                                    size="sm"
                                    variant={seleccionada ? 'default' : 'outline'}
                                    onClick={() => setFranjaSeleccionada(f)}
                                  >
                                    Ofrecer en este horario
                                  </Button>
                                </div>
                              );
                            })}
                          </TabsContent>
                        </Tabs>

                        {tabTurno === 'turno' && turnoSeleccionado && (
                          <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                            <span className="text-muted-foreground">Destino: </span>
                            <span className="font-medium">
                              Turno de {nombrePacienteEnEspera(pacienteEnEsperaId)} ·{' '}
                              {turnoSeleccionado.fecha} {turnoSeleccionado.hora} ·{' '}
                              {turnoSeleccionado.estado}
                            </span>
                          </div>
                        )}
                        {tabTurno === 'franja' && franjaSeleccionada && (
                          <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                            <span className="text-muted-foreground">Destino: </span>
                            <span className="font-medium">
                              Franja {franjaSeleccionada.fecha} {franjaSeleccionada.hora} (
                              {franjaSeleccionada.duracionMinutos} min)
                            </span>
                          </div>
                        )}

                        <DialogFooter>
                          <Button variant="outline" onClick={() => setTurnoDialogFor(null)}>
                            Cancelar
                          </Button>
                          <Button
                            onClick={confirmarOferta}
                            disabled={
                              asignando ||
                              !pacienteEnEsperaId ||
                              (tabTurno === 'turno' ? !turnoSeleccionadoId : !franjaSeleccionada)
                            }
                          >
                            {asignando ? 'Ofreciendo...' : 'Ofrecer turno'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8"
                    aria-label="Ver turnos ofrecidos"
                    onClick={() => toggleOfertas(item)}
                  >
                    {ofertasAbiertas[item.id] ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    Turnos ofrecidos
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Eliminar de lista de espera"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Quitar paciente?</AlertDialogTitle>
                        <AlertDialogDescription>
                          {item.pacienteNombre} {item.pacienteApellido} será quitado de la lista de
                          espera. No recibirá más turnos ofrecidos.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleRemove(item.id)}
                          disabled={removing === item.id}
                        >
                          {removing === item.id ? 'Quitando...' : 'Quitar'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              {ofertasAbiertas[item.id] && (
                <div className="border-t bg-muted/30 px-4 py-3">
                  {!ofertasPorItem[item.id] ? (
                    <p className="text-sm text-muted-foreground">Cargando turnos ofrecidos...</p>
                  ) : ofertasPorItem[item.id].length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin turnos ofrecidos registrados.</p>
                  ) : (
                    <div className="space-y-2">
                      {ofertasPorItem[item.id].map((oferta) => (
                        <div
                          key={oferta.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2"
                        >
                          <div className="text-sm">
                            <span className="font-medium">
                              Turno ofrecido {formatOfertaFecha(oferta.fechaOferta)}
                            </span>
                            {oferta.respondedAt && (
                              <span className="text-muted-foreground ml-2">
                                · Respondida {formatOfertaFecha(oferta.respondedAt)}
                              </span>
                            )}
                          </div>
                          {estadoOfertaBadge(oferta.estado)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
