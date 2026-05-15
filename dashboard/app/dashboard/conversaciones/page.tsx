'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search,
  Phone,
  MessageSquare,
  Bot,
  User,
  Send,
  Loader2,
  RefreshCw,
  Plus,
  Filter,
  CheckCheck,
} from 'lucide-react';
import { getInitials, formatRelative, truncate, formatPhone } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';

// ============================================================
// Tipos
// ============================================================

interface PacienteInfo {
  nombre: string;
  apellido: string;
  telefono: string;
}

interface Conversacion {
  id: string;
  pacienteId: string;
  canal: string;
  estado: string;
  ultimoMensaje?: string;
  ultimoMensajeRol?: string;
  ultimaIntencion?: string;
  ultimaInteraccion: string;
  paciente?: PacienteInfo;
  noLeidos?: number;
}

interface Mensaje {
  id: string;
  conversacionId: string;
  rol: string;
  contenido: string;
  tipo: string;
  intencion?: string;
  createdAt: string;
}

// ============================================================
// Helpers
// ============================================================

const intencionStyles: Record<string, string> = {
  confirmacion: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  consulta: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  cancelacion: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  urgencia: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  receta: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  turno_nuevo: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  saludo: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400',
};

const intencionLabels: Record<string, string> = {
  confirmacion: 'Confirmación',
  consulta: 'Consulta',
  cancelacion: 'Cancelación',
  urgencia: '🚨 Urgencia',
  receta: 'Receta',
  turno_nuevo: 'Nuevo Turno',
  saludo: 'Saludo',
};

const canalIconos: Record<string, string> = {
  whatsapp: '📱',
  sms: '💬',
  email: '📧',
  web: '🌐',
};

// ============================================================
// Componente principal
// ============================================================

export default function ConversacionesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mensajeInput, setMensajeInput] = useState('');
  const [filterCanal, setFilterCanal] = useState<string>('');
  const mensajesEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversaciones
  const {
    data: conversacionesData,
    isLoading: loadingConversaciones,
    isError: errorConversaciones,
    refetch: refetchConversaciones,
  } = useQuery({
    queryKey: ['conversaciones', search, filterCanal],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterCanal) params.set('canal', filterCanal);
      params.set('limit', '100');

      const res = await fetch(`/api/conversaciones?${params}`);
      if (!res.ok) throw new Error('Error al cargar conversaciones');
      const json = await res.json();
      return json.data as Conversacion[];
    },
    refetchInterval: 30000, // Refresh cada 30s
  });

  // Fetch mensajes de la conversación seleccionada
  const {
    data: mensajesData,
    isLoading: loadingMensajes,
    refetch: refetchMensajes,
  } = useQuery({
    queryKey: ['mensajes', selectedId],
    queryFn: async () => {
      if (!selectedId) return [];
      const res = await fetch(`/api/conversaciones/${selectedId}/mensajes`);
      if (!res.ok) throw new Error('Error al cargar mensajes');
      const json = await res.json();
      return json.data as Mensaje[];
    },
    enabled: !!selectedId,
    refetchInterval: 15000, // Refresh cada 15s
  });

  // Mutation para enviar mensaje
  const enviarMensajeMutation = useMutation({
    mutationFn: async (contenido: string) => {
      if (!selectedId) throw new Error('No hay conversación seleccionada');
      const res = await fetch(`/api/conversaciones/${selectedId}/mensajes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rol: 'medico',
          contenido,
        }),
      });
      if (!res.ok) throw new Error('Error al enviar mensaje');
      return res.json();
    },
    onSuccess: () => {
      setMensajeInput('');
      queryClient.invalidateQueries({ queryKey: ['mensajes', selectedId] });
      queryClient.invalidateQueries({ queryKey: ['conversaciones'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'No se pudo enviar el mensaje. Intentá de nuevo.',
        variant: 'destructive',
      });
      console.error('Error al enviar mensaje:', error);
    },
  });

  // Scroll al último mensaje
  useEffect(() => {
    mensajesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajesData]);

  // Seleccionar primera conversación si no hay selección
  const conversaciones = conversacionesData || [];
  const selectedConv = conversaciones.find((c) => c.id === selectedId);
  const mensajes = mensajesData || [];

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Conversaciones</h2>
          <p className="text-muted-foreground">
            Bandeja unificada de WhatsApp, SMS y Email
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchConversaciones()}
            disabled={loadingConversaciones}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${loadingConversaciones ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button size="sm" onClick={() => {/* TODO: modal nueva conversación */}}>
            <Plus className="h-4 w-4 mr-1" />
            Nueva
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        {/* --- LISTA DE CONVERSACIONES --- */}
        <Card className="lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto">
          <CardContent className="p-0">
            {/* Búsqueda y filtros */}
            <div className="p-3 border-b space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar conversación..."
                  className="pl-9 h-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-1">
                {['', 'whatsapp', 'email', 'sms'].map((canal) => (
                  <button
                    key={canal}
                    onClick={() => setFilterCanal(canal)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      filterCanal === canal
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {canalIconos[canal] || '📋'} {canal || 'Todas'}
                  </button>
                ))}
              </div>
            </div>

            {/* Estado de carga / error */}
            {loadingConversaciones && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {errorConversaciones && (
              <div className="text-center py-12 px-4">
                <MessageSquare className="h-10 w-10 text-destructive/50 mx-auto mb-3" />
                <p className="text-sm font-medium text-destructive">Error al cargar</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => refetchConversaciones()}>
                  Reintentar
                </Button>
              </div>
            )}

            {!loadingConversaciones && !errorConversaciones && conversaciones.length === 0 && (
              <div className="text-center py-12 px-4">
                <MessageSquare className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">
                  {search ? 'No se encontraron conversaciones' : 'No hay conversaciones aún'}
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  {search
                    ? 'Probá con otros términos de búsqueda'
                    : 'Las conversaciones aparecerán cuando lleguen mensajes'}
                </p>
              </div>
            )}

            {/* Lista */}
            {!loadingConversaciones && !errorConversaciones && (
              <div className="divide-y">
                {conversaciones.map((conv) => (
                  <div
                    key={conv.id}
                    className={`flex items-start gap-3 p-3 cursor-pointer transition-colors hover:bg-muted/50 ${
                      selectedId === conv.id ? 'bg-muted' : ''
                    }`}
                    onClick={() => setSelectedId(conv.id)}
                  >
                    <Avatar className="h-9 w-9 mt-0.5">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {conv.paciente
                          ? getInitials(conv.paciente.nombre, conv.paciente.apellido)
                          : '??'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm truncate">
                          {conv.paciente
                            ? `${conv.paciente.nombre} ${conv.paciente.apellido}`
                            : 'Paciente'}
                        </p>
                        <span className="text-xs text-muted-foreground shrink-0 ml-2">
                          {formatRelative(conv.ultimaInteraccion)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {(conv.noLeidos || 0) > 0 && (
                          <span className="flex items-center justify-center h-5 min-w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1">
                            {conv.noLeidos}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {canalIconos[conv.canal] || '📋'} {conv.canal}
                        </span>
                        {conv.ultimaIntencion && intencionLabels[conv.ultimaIntencion] && (
                          <Badge
                            className={`text-[10px] px-1.5 py-0 ${intencionStyles[conv.ultimaIntencion] || ''}`}
                            variant="outline"
                          >
                            {intencionLabels[conv.ultimaIntencion]}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {conv.ultimoMensaje
                          ? truncate(conv.ultimoMensaje, 60)
                          : 'Sin mensajes'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* --- PANEL DE CONVERSACIÓN --- */}
        <Card>
          {selectedId && selectedConv ? (
            <CardContent className="p-0 flex flex-col h-[calc(100vh-12rem)]">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {selectedConv.paciente
                        ? getInitials(selectedConv.paciente.nombre, selectedConv.paciente.apellido)
                        : '🧑'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {selectedConv.paciente
                        ? `${selectedConv.paciente.nombre} ${selectedConv.paciente.apellido}`
                        : 'Paciente'}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {selectedConv.paciente
                        ? formatPhone(selectedConv.paciente.telefono)
                        : 'Sin teléfono'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">
                    {selectedConv.canal}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={
                      selectedConv.estado === 'activa'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : ''
                    }
                  >
                    {selectedConv.estado}
                  </Badge>
                </div>
              </div>

              {/* Mensajes */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {loadingMensajes ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : mensajes.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageSquare className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        No hay mensajes en esta conversación
                      </p>
                    </div>
                  ) : (
                    mensajes.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex items-start gap-3 ${
                          msg.rol === 'paciente' ? '' : 'justify-end'
                        }`}
                      >
                        {msg.rol === 'paciente' && (
                          <Avatar className="h-8 w-8 mt-1">
                            <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                              {selectedConv.paciente
                                ? getInitials(selectedConv.paciente.nombre, selectedConv.paciente.apellido)
                                : '🧑'}
                            </AvatarFallback>
                          </Avatar>
                        )}

                        <div
                          className={`rounded-2xl px-4 py-2.5 max-w-[80%] ${
                            msg.rol === 'paciente'
                              ? 'bg-muted rounded-tl-sm'
                              : msg.rol === 'asistente_ia'
                              ? 'bg-primary/10 text-foreground rounded-tr-sm border border-primary/20'
                              : 'bg-primary text-primary-foreground rounded-tr-sm'
                          }`}
                        >
                          {msg.rol === 'asistente_ia' && (
                            <div className="flex items-center gap-1 mb-1">
                              <Bot className="h-3 w-3" />
                              <span className="text-[10px] font-medium opacity-70">IA</span>
                            </div>
                          )}
                          <p className="text-sm whitespace-pre-wrap">{msg.contenido}</p>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-[10px] text-muted-foreground">
                              {formatRelative(msg.createdAt)}
                            </p>
                            {msg.rol !== 'paciente' && (
                              <CheckCheck className="h-3 w-3 text-muted-foreground/50 ml-1" />
                            )}
                          </div>
                        </div>

                        {msg.rol !== 'paciente' && (
                          <Avatar className="h-8 w-8 mt-1">
                            <AvatarFallback
                              className={`text-xs ${
                                msg.rol === 'asistente_ia'
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                  : 'bg-primary text-primary-foreground'
                              }`}
                            >
                              {msg.rol === 'asistente_ia' ? (
                                <Bot className="h-4 w-4" />
                              ) : (
                                <User className="h-4 w-4" />
                              )}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    ))
                  )}
                  <div ref={mensajesEndRef} />
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="p-4 border-t">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (mensajeInput.trim()) {
                      enviarMensajeMutation.mutate(mensajeInput.trim());
                    }
                  }}
                  className="flex gap-2"
                >
                  <Input
                    placeholder="Escribí un mensaje..."
                    className="flex-1"
                    value={mensajeInput}
                    onChange={(e) => setMensajeInput(e.target.value)}
                    disabled={enviarMensajeMutation.isPending}
                  />
                  <Button
                    type="submit"
                    disabled={!mensajeInput.trim() || enviarMensajeMutation.isPending}
                  >
                    {enviarMensajeMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </form>
                <p className="text-[10px] text-muted-foreground mt-2">
                  La IA puede ayudarte a redactar respuestas. Revisá siempre antes de enviar.
                </p>
              </div>
            </CardContent>
          ) : (
            /* Estado vacío: sin conversación seleccionada */
            <CardContent className="flex items-center justify-center h-[calc(100vh-12rem)]">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-lg font-medium text-muted-foreground">
                  Seleccioná una conversación
                </p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Elegí un chat de la lista para ver los mensajes
                </p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
