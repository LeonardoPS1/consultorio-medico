'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  MessageSquarePlus,
  Send,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Stethoscope,
  CalendarClock,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useSearchParams } from 'next/navigation';
import { useState, useRef, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/page-header';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/components/ui/use-toast';
import { playSend, playReceive } from '@/lib/sound';
import { getInitials, formatRelative, truncate, cn, formatDateTime } from '@/lib/utils';

interface StaffUser {
  id: string;
  nombre: string;
  rol: string;
}

interface ContextoPaciente {
  id: string;
  nombre: string;
}

interface ContextoTurno {
  id: string;
  fechaHora: string;
  motivo: string | null;
}

interface Conversacion {
  id: string;
  participante: { id: string; nombre: string; rol: string };
  contextoPaciente: ContextoPaciente | null;
  contextoTurno: ContextoTurno | null;
  ultimoMensaje: string | null;
  ultimoAutorId: string | null;
  ultimaInteraccion: string;
  noLeidos: number;
}

interface Mensaje {
  id: string;
  autorId: string;
  autorNombre: string;
  contenido: string;
  urgente: boolean;
  leidoAt: string | null;
  createdAt: string;
}

interface Props {
  initialConversaciones: Conversacion[];
  miUserId: string;
  contextoPaciente?: string;
  contextoTurno?: string;
}

const rolLabels: Record<string, string> = {
  admin: 'Admin',
  medico: 'Médico',
  secretaria: 'Secretaria',
  paciente: 'Paciente',
};

/**
 *
 * @param root0
 * @param root0.initialConversaciones
 * @param root0.miUserId
 * @param root0.contextoPaciente
 * @param root0.contextoTurno
 */
export function MensajeriaInternaClient({
  initialConversaciones,
  miUserId,
  contextoPaciente,
  contextoTurno,
}: Props) {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const URLConvId = searchParams.get('conversacion');

  const [selectedId, setSelectedId] = useState<string | null>(URLConvId);
  const [search, setSearch] = useState('');
  const [mensajeInput, setMensajeInput] = useState('');
  const [nuevoAbierto, setNuevoAbierto] = useState(false);
  const [nuevoParticipante, setNuevoParticipante] = useState('');
  const [urgenteActivo, setUrgenteActivo] = useState(false);
  const mensajesEndRef = useRef<HTMLDivElement>(null);

  // ── Conexión SSE per-user ──────────────────────────────────
  const handleSSE = useCallback(
    (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (event.type === 'mensaje-interno' || event.type === 'mensaje-interno-entregado') {
          queryClient.invalidateQueries({ queryKey: ['conv-internas'] });
          if (data.conversacionId) {
            queryClient.invalidateQueries({ queryKey: ['msgs-internos', data.conversacionId] });
            setSelectedId((prev) => prev || data.conversacionId);
          }
          if (event.type === 'mensaje-interno' && data.conversacionId !== selectedIdRef.current) {
            playReceive();
          }
          queryClient.invalidateQueries({ queryKey: ['no-leidos-internos'] });
        }
      } catch {}
    },
    [queryClient],
  );

  // selectedId en ref para no re-crear el handler en cada render
  const selectedIdRef = useRef(selectedId);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/sse/events');
      eventSource.addEventListener('mensaje-interno', handleSSE);
      eventSource.addEventListener('mensaje-interno-entregado', handleSSE);
      eventSource.addEventListener('heartbeat', () => {});
      eventSource.onerror = () => eventSource?.close();
    } catch {
      /* SSE no disponible */
    }
    return () => eventSource?.close();
  }, [handleSSE]);

  // ── Queries ────────────────────────────────────────────────
  const {
    data: conversacionesData,
    isLoading: loadingConversaciones,
    isError: errorConversaciones,
    refetch: refetchConversaciones,
  } = useQuery({
    queryKey: ['conv-internas', search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`/api/mensajeria-interna/conversaciones?${params}`);
      if (!res.ok) throw new Error('Error al cargar conversaciones');
      const json = await res.json();
      return json.data as Conversacion[];
    },
    initialData: initialConversaciones,
  });

  const {
    data: mensajesData,
    isLoading: loadingMensajes,
  } = useQuery({
    queryKey: ['msgs-internos', selectedId],
    queryFn: async () => {
      if (!selectedId) return [];
      const res = await fetch(`/api/mensajeria-interna/conversaciones/${selectedId}/mensajes`);
      if (!res.ok) throw new Error('Error al cargar mensajes');
      const json = await res.json();
      return json.data as Mensaje[];
    },
    enabled: !!selectedId,
    refetchInterval: 15000,
  });

  const { data: staffData } = useQuery({
    queryKey: ['staff-interno'],
    queryFn: async () => {
      const res = await fetch('/api/mensajeria-interna/staff');
      if (!res.ok) throw new Error('Error al cargar staff');
      const json = await res.json();
      return json.data as StaffUser[];
    },
    enabled: nuevoAbierto,
  });

  // ── Mutations ──────────────────────────────────────────────
  const enviarMutation = useMutation({
    mutationFn: async ({ contenido, urgente }: { contenido: string; urgente: boolean }) => {
      if (!selectedId) throw new Error('No hay conversación seleccionada');
      const res = await fetch(`/api/mensajeria-interna/conversaciones/${selectedId}/mensajes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contenido, urgente }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Error al enviar mensaje');
      }
      return res.json();
    },
    onSuccess: () => {
      playSend();
      setMensajeInput('');
      setUrgenteActivo(false);
      queryClient.invalidateQueries({ queryKey: ['msgs-internos', selectedId] });
      queryClient.invalidateQueries({ queryKey: ['conv-internas'] });
      queryClient.invalidateQueries({ queryKey: ['no-leidos-internos'] });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message || 'No se pudo enviar el mensaje', variant: 'destructive' });
      console.error('Error al enviar mensaje interno:', error);
    },
  });

  const nuevaMutation = useMutation({
    mutationFn: async (body: { participanteId: string; contextoPacienteId?: string; contextoTurnoId?: string }) => {
      const res = await fetch('/api/mensajeria-interna/conversaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'No se pudo crear la conversación');
      }
      return res.json();
    },
    onSuccess: (data) => {
      const conv = (data?.data ?? data) as Conversacion;
      setNuevoAbierto(false);
      setNuevoParticipante('');
      setSelectedId(conv.id);
      queryClient.invalidateQueries({ queryKey: ['conv-internas'] });
      toast({ title: 'Conversación iniciada', description: `Conversación con ${conv.participante.nombre}` });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // ── Scroll automático ──────────────────────────────────────
  useEffect(() => {
    mensajesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajesData]);

  const conversaciones = (conversacionesData ?? []).filter((c) =>
    search ? c.participante.nombre.toLowerCase().includes(search.toLowerCase()) : true,
  );
  const selectedConv = conversacionesData?.find((c) => c.id === selectedId);
  const mensajes = mensajesData ?? [];

  const handleNuevaConversacion = () => {
    if (!nuevoParticipante) return;
    nuevaMutation.mutate({
      participanteId: nuevoParticipante,
      contextoPacienteId: contextoPaciente || undefined,
      contextoTurnoId: contextoTurno || undefined,
    });
  };

  return (
    <motion.div
      className="space-y-6 animate-in"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <PageHeader
          title="Mensajería Interna"
          description="Comunicación entre el staff del consultorio"
        />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetchConversaciones()} disabled={loadingConversaciones}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loadingConversaciones ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button size="sm" onClick={() => setNuevoAbierto(true)}>
            <MessageSquarePlus className="h-4 w-4 mr-1" />
            Nueva conversación
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        {/* Lista de conversaciones */}
        <Card className="max-h-[40vh] lg:max-h-[calc(100vh-12rem)] overflow-y-auto">
          <CardContent className="p-0">
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por colega..."
                  className="pl-9 h-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Buscar conversación interna"
                />
              </div>
            </div>

            {loadingConversaciones && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {errorConversaciones && (
              <div className="text-center py-12 px-4">
                <MessageSquarePlus className="h-10 w-10 text-destructive/50 mx-auto mb-3" />
                <p className="text-sm font-medium text-destructive">Error al cargar</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => refetchConversaciones()}>
                  Reintentar
                </Button>
              </div>
            )}

            {!loadingConversaciones && !errorConversaciones && conversaciones.length === 0 && (
              <div className="text-center py-12 px-4">
                <MessageSquarePlus className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">
                  {search ? 'No se encontraron conversaciones' : 'No hay conversaciones internas aún'}
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Iniciá una con un colega del equipo para coordinar
                </p>
              </div>
            )}

            {!loadingConversaciones && !errorConversaciones && (
              <div className="divide-y">
                {conversaciones.map((conv) => (
                  <div
                    key={conv.id}
                    className={`flex items-start gap-3 p-3 cursor-pointer transition-colors hoverable:hover:bg-muted/50 ${
                      selectedId === conv.id ? 'bg-muted' : ''
                    }`}
                    onClick={() => setSelectedId(conv.id)}
                  >
                    <Avatar className="h-9 w-9 mt-0.5">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {getInitials(conv.participante.nombre, conv.participante.nombre)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm truncate">
                          {conv.participante.nombre}
                          {conv.contextoPaciente && (
                            <span className="text-muted-foreground font-normal">
                              {' '}
                              · Paciente {conv.contextoPaciente.nombre}
                            </span>
                          )}
                        </p>
                        <span className="text-xs text-muted-foreground shrink-0 ml-2">
                          {formatRelative(conv.ultimaInteraccion)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                          {rolLabels[conv.participante.rol] || conv.participante.rol}
                        </Badge>
                        {(conv.noLeidos || 0) > 0 && (
                          <span className="flex items-center justify-center h-5 min-w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1">
                            {conv.noLeidos}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {conv.ultimoMensaje ? truncate(conv.ultimoMensaje, 60) : 'Sin mensajes'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Panel de conversación */}
        <Card>
          {selectedId && selectedConv ? (
            <CardContent className="p-0 flex flex-col h-[50vh] sm:h-[60vh] lg:h-[calc(100vh-12rem)]">
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(selectedConv.participante.nombre, selectedConv.participante.nombre)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium flex items-center gap-2">
                      {selectedConv.participante.nombre}
                      {selectedConv.contextoPaciente && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          🧑 Paciente
                        </Badge>
                      )}
                      {selectedConv.contextoTurno && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          <CalendarClock className="h-3 w-3 mr-0.5" /> Turno
                        </Badge>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {rolLabels[selectedConv.participante.rol] || selectedConv.participante.rol}
                      {selectedConv.contextoTurno &&
                        ` · ${formatDateTime(selectedConv.contextoTurno.fechaHora)}`}
                    </p>
                  </div>
                </div>
                {(selectedConv.contextoPaciente || selectedConv.contextoTurno) && (
                  <div className="flex items-center gap-2">
                    {selectedConv.contextoPaciente && (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="text-xs"
                      >
                        <a href={`/dashboard/pacientes/${selectedConv.contextoPaciente.id}`}>
                          <Stethoscope className="h-3.5 w-3.5 mr-1" />
                          Ver ficha
                        </a>
                      </Button>
                    )}
                    {selectedConv.contextoTurno && (
                      <Button variant="outline" size="sm" asChild className="text-xs">
                        <a href={`/dashboard/turnos?fechaHora=${encodeURIComponent(selectedConv.contextoTurno.fechaHora)}`}>
                          <CalendarClock className="h-3.5 w-3.5 mr-1" />
                          Ver turno
                        </a>
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {loadingMensajes ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : mensajes.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageSquarePlus className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No hay mensajes en esta conversación</p>
                    </div>
                  ) : (
                    mensajes.map((msg) => {
                      const esMio = msg.autorId === miUserId;
                      return (
                        <div
                          key={msg.id}
                          className={`flex items-start gap-3 ${esMio ? 'justify-end' : ''}`}
                        >
                          {!esMio && (
                            <Avatar className="h-8 w-8 mt-1">
                              <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                                {getInitials(msg.autorNombre, msg.autorNombre)}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div
                            className={cn(
                              'rounded-2xl px-4 py-2.5 max-w-[80%]',
                              esMio
                                ? 'bg-primary text-primary-foreground rounded-tr-sm'
                                : 'bg-muted rounded-tl-sm',
                              msg.urgente && 'border-2 border-amber-400/70',
                            )}
                          >
                            {msg.urgente && (
                              <div className="flex items-center gap-1 mb-1 text-amber-500 dark:text-amber-300">
                                <AlertTriangle className="h-3 w-3" />
                                <span className="text-[10px] font-bold uppercase tracking-wide">
                                  Urgente
                                </span>
                              </div>
                            )}
                            {!esMio && msg.autorNombre && (
                              <p className="text-[10px] font-medium opacity-70 mb-1">
                                {msg.autorNombre}
                              </p>
                            )}
                            <p className="text-sm whitespace-pre-wrap">{msg.contenido}</p>
                            <div className="flex items-center justify-end mt-1">
                              <p className="text-[10px] text-muted-foreground/70">
                                {formatRelative(msg.createdAt)}
                              </p>
                              {esMio && msg.leidoAt && (
                                <span className="text-[10px] text-emerald-400 ml-2">Visto</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={mensajesEndRef} />
                </div>
              </ScrollArea>

              <div className="p-4 border-t">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (mensajeInput.trim())
                      {enviarMutation.mutate({ contenido: mensajeInput.trim(), urgente: urgenteActivo });}
                  }}
                  className="flex flex-col gap-2"
                >
                  <div className="flex gap-2">
                    <Input
                      placeholder="Escribí un mensaje... (@nombre menciona a alguien)"
                      className="flex-1"
                      value={mensajeInput}
                      onChange={(e) => setMensajeInput(e.target.value)}
                      disabled={enviarMutation.isPending}
                    />
                    <Button type="submit" disabled={!mensajeInput.trim() || enviarMutation.isPending} aria-label="Enviar mensaje">
                      {enviarMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={urgenteActivo}
                      onChange={(e) => setUrgenteActivo(e.target.checked)}
                      className="h-3.5 w-3.5"
                    />
                    Marcar como urgente
                  </label>
                </form>
              </div>
            </CardContent>
          ) : (
            <CardContent className="flex items-center justify-center h-[50vh] sm:h-[60vh] lg:h-[calc(100vh-12rem)]">
              <div className="text-center">
                <MessageSquarePlus className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-lg font-medium text-muted-foreground">Seleccioná una conversación</p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Elegí un chat de la lista o iniciá una nueva conversación
                </p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Modal nueva conversación */}
      <Dialog open={nuevoAbierto} onOpenChange={setNuevoAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva conversación</DialogTitle>
            <DialogDescription>
              Elegí un colega del consultorio para iniciar la conversación interna.
              {contextoPaciente && ' Se vinculará al paciente actual.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="participante">Colega</Label>
            <select
              id="participante"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={nuevoParticipante}
              onChange={(e) => setNuevoParticipante(e.target.value)}
            >
              <option value="">Seleccioná un colega...</option>
              {(staffData ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre} ({rolLabels[u.rol] || u.rol})
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNuevoAbierto(false)}>
              Cancelar
            </Button>
            <Button onClick={handleNuevaConversacion} disabled={!nuevoParticipante || nuevaMutation.isPending}>
              {nuevaMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Iniciar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}