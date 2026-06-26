/**
 * Portal — Página de notificaciones
 * Rediseñado con portal design system tokens.
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
  turno: (
    <Calendar
      className="h-4 w-4"
      style={{ color: 'hsl(var(--portal-primary))' }}
    />
  ),
  mensaje: (
    <MessageSquare
      className="h-4 w-4"
      style={{ color: 'hsl(var(--portal-accent))' }}
    />
  ),
  receta: (
    <FileText
      className="h-4 w-4"
      style={{ color: 'hsl(38 92% 50%)' }}
    />
  ),
  sistema: (
    <Bell
      className="h-4 w-4"
      style={{ color: 'hsl(var(--portal-primary))' }}
    />
  ),
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return 'Ahora';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min`;
  if (diff < 86400000) return `Hace ${Math.floor(diff / 3600000)}h`;
  return d.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
  });
}

export default function PortalNotificacionesPage() {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>(
    [],
  );
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
    setNotificaciones((prev) =>
      prev.map((n) => (n.id === id ? { ...n, leido: true } : n)),
    );
    await fetch(`/api/portal/notificaciones/${id}`, {
      method: 'PATCH',
    });
  }

  async function marcarTodasLeidas() {
    setNotificaciones((prev) =>
      prev.map((n) => ({ ...n, leido: true })),
    );
    await fetch('/api/portal/notificaciones', { method: 'PATCH' });
  }

  const noLeidas = notificaciones.filter((n) => !n.leido).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw
          className="h-6 w-6 animate-spin"
          style={{ color: 'hsl(var(--portal-muted-foreground) / 0.7)' }}
        />
      </div>
    );
  }

  return (
    <div className="pb-24">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1
            className="text-xl font-bold"
            style={{ color: 'hsl(var(--portal-foreground))' }}
          >
            Notificaciones
          </h1>
          {noLeidas > 0 && (
            <p
              className="text-sm"
              style={{ color: 'hsl(var(--portal-muted-foreground))' }}
            >
              {noLeidas} sin leer
            </p>
          )}
        </div>
        {noLeidas > 0 && (
          <button
            onClick={marcarTodasLeidas}
            className="text-xs font-medium flex items-center gap-1 transition-colors"
            style={{ color: 'hsl(var(--portal-primary))' }}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Marcar todas leídas
          </button>
        )}
      </div>

      {error && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm mb-4"
          style={{
            color: 'hsl(var(--portal-destructive))',
            background: 'hsl(var(--portal-destructive) / 0.08)',
            border: '1px solid hsl(var(--portal-destructive) / 0.15)',
          }}
        >
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      {notificaciones.length === 0 ? (
        <div className="text-center py-16">
          <div
            className="rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3"
            style={{ background: 'hsl(var(--portal-muted))' }}
          >
            <Bell
              className="h-6 w-6"
              style={{
                color: 'hsl(var(--portal-muted-foreground) / 0.5)',
              }}
            />
          </div>
          <p
            className="text-sm"
            style={{
              color: 'hsl(var(--portal-muted-foreground) / 0.7)',
            }}
          >
            No tienes notificaciones
          </p>
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
                  className="w-full text-left flex items-start gap-3 p-3 rounded-lg transition-colors"
                  style={
                    n.leido
                      ? {
                          background: 'var(--portal-bg-alt)',
                        }
                      : {
                          background:
                            'hsl(var(--portal-primary) / 0.05)',
                        }
                  }
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background =
                      'hsl(var(--portal-primary) / 0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = n.leido
                      ? 'var(--portal-bg-alt)'
                      : 'hsl(var(--portal-primary) / 0.05)';
                  }}
                >
                  <div className="mt-0.5 shrink-0">{Icon}</div>
                  <div className="flex-1 min-w-0 text-left">
                    <p
                      className="text-sm"
                      style={{
                        color: n.leido
                          ? 'hsl(var(--portal-muted-foreground) / 0.8)'
                          : 'hsl(var(--portal-foreground))',
                        fontWeight: n.leido ? 400 : 600,
                      }}
                    >
                      {n.titulo}
                    </p>
                    {n.descripcion && (
                      <p
                        className="text-xs mt-0.5 line-clamp-2"
                        style={{
                          color:
                            'hsl(var(--portal-muted-foreground) / 0.7)',
                        }}
                      >
                        {n.descripcion}
                      </p>
                    )}
                    <p
                      className="text-[10px] mt-1"
                      style={{
                        color:
                          'hsl(var(--portal-muted-foreground) / 0.5)',
                      }}
                    >
                      {formatDate(n.createdAt)}
                    </p>
                  </div>
                  {!n.leido && (
                    <span
                      className="w-2 h-2 rounded-full mt-2 shrink-0"
                      style={{
                        background: 'hsl(var(--portal-primary))',
                      }}
                    />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
