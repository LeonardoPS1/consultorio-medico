/**
 * Portal — Página de notificaciones
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  CheckCheck,
  RefreshCw,
  AlertCircle,
  Calendar,
  MessageSquare,
  FileText,
} from 'lucide-react';
import Link from 'next/link';

interface Notificacion {
  id: string;
  titulo: string;
  descripcion: string | null;
  tipo: string;
  leido: boolean;
  href: string | null;
  createdAt: string;
}

const TIPO_ICONS: Record<string, React.ReactNode> = {
  turno: <Calendar className="h-4 w-4 text-primary" />,
  mensaje: <MessageSquare className="h-4 w-4 text-emerald-500" />,
  receta: <FileText className="h-4 w-4 text-amber-500" />,
  sistema: <Bell className="h-4 w-4 text-primary" />,
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return 'Ahora';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min`;
  if (diff < 86400000) return `Hace ${Math.floor(diff / 3600000)}h`;
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
}

export default function PortalNotificacionesPage() {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchNotificaciones = useCallback(async () => {
    try {
      const res = await fetch('/api/portal/notificaciones');
      if (res.ok) {
        const data = await res.json();
        setNotificaciones(data.data ?? []);
      } else {
        setError('Error al cargar notificaciones');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotificaciones();
  }, [fetchNotificaciones]);

  async function marcarLeida(id: string) {
    // Optimistic update
    setNotificaciones((prev) => prev.map((n) => (n.id === id ? { ...n, leido: true } : n)));
    await fetch(`/api/portal/notificaciones/${id}`, { method: 'PATCH' });
  }

  async function marcarTodasLeidas() {
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leido: true })));
    await fetch('/api/portal/notificaciones', { method: 'PATCH' });
  }

  const noLeidas = notificaciones.filter((n) => !n.leido).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground/70" />
      </div>
    );
  }

  return (
    <div className="pb-24">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Notificaciones</h1>
          {noLeidas > 0 && <p className="text-sm text-muted-foreground">{noLeidas} sin leer</p>}
        </div>
        {noLeidas > 0 && (
          <button
            onClick={marcarTodasLeidas}
            className="text-xs font-medium text-primary hover:text-primary/80 flex items-center gap-1"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Marcar todas leídas
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-destructive bg-destructive/5 border border-destructive/10 px-3 py-2 rounded-xl text-sm mb-4">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      {notificaciones.length === 0 ? (
        <div className="text-center py-16">
          <div className="rounded-full bg-muted w-12 h-12 flex items-center justify-center mx-auto mb-3"><Bell className="h-6 w-6 text-muted-foreground/50" /></div>
          <p className="text-muted-foreground/70 text-sm">No tienes notificaciones</p>
        </div>
      ) : (
        <div className="space-y-1">
          {notificaciones.map((n) => {
            const Icon = TIPO_ICONS[n.tipo] || TIPO_ICONS.sistema;

            return (
              <div key={n.id} className="block">
                <button
                  onClick={() => {
                    if (!n.leido) marcarLeida(n.id);
                    if (n.href) window.location.href = n.href;
                  }}
                  className={`w-full text-left flex items-start gap-3 p-3 rounded-lg transition-colors ${
                    n.leido ? 'bg-card hover:bg-accent/50' : 'bg-primary/5 hover:bg-primary/10'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">{Icon}</div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm ${n.leido ? 'text-muted-foreground/80' : 'text-foreground font-medium'}`}
                    >
                      {n.titulo}
                    </p>
                    {n.descripcion && (
                      <p className="text-xs text-muted-foreground/70 mt-0.5 line-clamp-2">{n.descripcion}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground/50 mt-1">{formatDate(n.createdAt)}</p>
                  </div>
                  {!n.leido && <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
