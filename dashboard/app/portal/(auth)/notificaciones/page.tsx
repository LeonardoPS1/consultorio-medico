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
  turno: <Calendar className="h-4 w-4 text-blue-500" />,
  mensaje: <MessageSquare className="h-4 w-4 text-emerald-500" />,
  receta: <FileText className="h-4 w-4 text-amber-500" />,
  sistema: <Bell className="h-4 w-4 text-purple-500" />,
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
        <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="pb-24">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Notificaciones</h1>
          {noLeidas > 0 && <p className="text-sm text-gray-500">{noLeidas} sin leer</p>}
        </div>
        {noLeidas > 0 && (
          <button
            onClick={marcarTodasLeidas}
            className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Marcar todas leídas
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-2 rounded-lg text-sm mb-4">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      {notificaciones.length === 0 ? (
        <div className="text-center py-16">
          <Bell className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-400 text-sm">No tienes notificaciones</p>
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
                    n.leido ? 'bg-white hover:bg-gray-50' : 'bg-blue-50 hover:bg-blue-100'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">{Icon}</div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm ${n.leido ? 'text-gray-600' : 'text-gray-900 font-medium'}`}
                    >
                      {n.titulo}
                    </p>
                    {n.descripcion && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.descripcion}</p>
                    )}
                    <p className="text-[10px] text-gray-400 mt-1">{formatDate(n.createdAt)}</p>
                  </div>
                  {!n.leido && <span className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0" />}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
