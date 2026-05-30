'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bell, BellOff, Calendar, MessageSquare, Syringe, AlertTriangle,
  Check, Eye, EyeOff, Trash2, CheckCheck, Filter, Loader2,
} from 'lucide-react';
import { formatRelative } from '@/lib/utils';

// ============================================================
// Tipos
// ============================================================

interface NotificacionData {
  id: string;
  titulo: string;
  descripcion: string | null;
  tipo: 'turno' | 'mensaje' | 'receta' | 'urgencia' | 'sistema';
  leido: boolean;
  href: string | null;
  createdAt: string;
}

const iconosNotificacion: Record<string, React.ElementType> = {
  turno: Calendar,
  mensaje: MessageSquare,
  receta: Syringe,
  urgencia: AlertTriangle,
  sistema: Bell,
};

const coloresNotificacion: Record<string, string> = {
  turno: 'text-blue-500 bg-blue-100 dark:bg-blue-950/50',
  mensaje: 'text-green-500 bg-green-100 dark:bg-green-950/50',
  receta: 'text-purple-500 bg-purple-100 dark:bg-purple-950/50',
  urgencia: 'text-red-500 bg-red-100 dark:bg-red-950/50',
  sistema: 'text-amber-500 bg-amber-100 dark:bg-amber-950/50',
};

const TIPOS = ['turno', 'mensaje', 'receta', 'urgencia', 'sistema'] as const;
const labelsTipo: Record<string, string> = {
  turno: 'Turnos',
  mensaje: 'Mensajes',
  receta: 'Recetas',
  urgencia: 'Urgencias',
  sistema: 'Sistema',
};

// ============================================================
// Componente
// ============================================================

export default function NotificacionesPage() {
  const router = useRouter();
  const [notificaciones, setNotificaciones] = useState<NotificacionData[]>([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState<string | null>(null);
  const [soloNoLeidas, setSoloNoLeidas] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (filtroTipo) params.set('tipo', filtroTipo);
      if (soloNoLeidas) params.set('soloNoLeidas', 'true');

      const res = await fetch(`/api/notificaciones?${params}`);
      if (!res.ok) return;
      const json = await res.json();
      setNotificaciones(json.data || []);
      setTotal(json.total || 0);
      setNoLeidas(json.noLeidas || 0);
    } catch {
      console.error('Error al cargar notificaciones');
    } finally {
      setLoading(false);
    }
  }, [filtroTipo, soloNoLeidas]);

  useEffect(() => { cargar(); }, [cargar]);

  // Acciones
  const marcarLeida = async (id: string) => {
    await fetch(`/api/notificaciones/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'read' }),
    });
    setNotificaciones(prev => prev.map(n => n.id === id ? { ...n, leido: true } : n));
    setNoLeidas(prev => Math.max(0, prev - 1));
  };

  const marcarNoLeida = async (id: string) => {
    await fetch(`/api/notificaciones/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'unread' }),
    });
    setNotificaciones(prev => prev.map(n => n.id === id ? { ...n, leido: false } : n));
    setNoLeidas(prev => prev + 1);
  };

  const eliminar = async (id: string) => {
    await fetch(`/api/notificaciones/${id}`, { method: 'DELETE' });
    setNotificaciones(prev => prev.filter(n => n.id !== id));
    setTotal(prev => prev - 1);
    setNoLeidas(prev =>
      prev - (notificaciones.find(n => n.id === id)?.leido ? 0 : 1)
    );
  };

  const marcarTodasLeidas = async () => {
    await fetch('/api/notificaciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'leidas' }),
    });
    setNotificaciones(prev => prev.map(n => ({ ...n, leido: true })));
    setNoLeidas(0);
  };

  return (
    <div className="space-y-6 animate-in">
      <PageHeader
        title="Notificaciones"
        description="Todas las notificaciones del sistema"
        icon={<Bell className="w-5 h-5" />}
        action={
          noLeidas > 0 ? (
            <Button variant="outline" size="sm" onClick={marcarTodasLeidas}>
              <CheckCheck className="h-4 w-4 mr-1.5" />
              Marcar todas leídas
            </Button>
          ) : undefined
        }
      />

      {/* ─── Filtros ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant={!filtroTipo && !soloNoLeidas ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => { setFiltroTipo(null); setSoloNoLeidas(false); }}
        >
          Todas ({total})
        </Badge>
        <Badge
          variant={soloNoLeidas ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => { setSoloNoLeidas(!soloNoLeidas); setFiltroTipo(null); }}
        >
          <Bell className="h-3 w-3 mr-1" />
          No leídas ({noLeidas})
        </Badge>
        {TIPOS.map(tipo => (
          <Badge
            key={tipo}
            variant={filtroTipo === tipo ? 'default' : 'outline'}
            className="cursor-pointer capitalize"
            onClick={() => { setFiltroTipo(tipo); setSoloNoLeidas(false); }}
          >
            {labelsTipo[tipo] || tipo}
          </Badge>
        ))}
      </div>

      {/* ─── Lista ───────────────────────────────────────── */}
      <div className="rounded-xl border bg-card">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Cargando notificaciones...
          </div>
        ) : notificaciones.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <BellOff className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">No hay notificaciones</p>
            <p className="text-xs mt-1">
              {soloNoLeidas
                ? 'No tenés notificaciones sin leer'
                : 'No hay notificaciones para mostrar con este filtro'}
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[calc(100vh-280px)]">
            {notificaciones.map((notif, idx) => {
              const Icon = iconosNotificacion[notif.tipo] || Bell;
              const isLast = idx === notificaciones.length - 1;
              return (
                <div
                  key={notif.id}
                  className={`group flex items-start gap-4 px-5 py-4 transition-colors ${
                    !notif.leido ? 'bg-primary/[0.03]' : ''
                  } ${!isLast ? 'border-b' : ''} hover:bg-muted/30`}
                >
                  {/* Icono */}
                  <div className={`h-9 w-9 rounded-xl ${coloresNotificacion[notif.tipo] || ''} flex items-center justify-center shrink-0 mt-0.5`}>
                    <Icon className="h-4.5 w-4.5" />
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={`text-sm ${!notif.leido ? 'font-semibold' : ''}`}>
                          {notif.titulo}
                        </p>
                        {notif.descripcion && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {notif.descripcion}
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground/60 whitespace-nowrap shrink-0 mt-0.5">
                        {formatRelative(notif.createdAt)}
                      </span>
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-1 mt-2">
                      {notif.href && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-primary"
                          onClick={() => router.push(notif.href!)}
                        >
                          Ver detalle
                        </Button>
                      )}
                      {!notif.leido ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-muted-foreground"
                          onClick={() => marcarLeida(notif.id)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Marcar leída
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-muted-foreground"
                          onClick={() => marcarNoLeida(notif.id)}
                        >
                          <EyeOff className="h-3 w-3 mr-1" />
                          Marcar no leída
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-destructive/70 hover:text-destructive"
                        onClick={() => eliminar(notif.id)}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Eliminar
                      </Button>
                    </div>
                  </div>

                  {/* Indicador no leído */}
                  {!notif.leido && (
                    <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />
                  )}
                </div>
              );
            })}
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
