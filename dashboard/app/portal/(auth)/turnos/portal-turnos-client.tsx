/**
 * Portal Turnos Client
 */

'use client';

import { useState } from 'react';
import { Calendar, MapPin, Video, Phone, Clock, XCircle, AlertCircle, ExternalLink } from 'lucide-react';

interface Turno {
  id: string;
  fechaHora: string;
  hora: string;
  estado: string;
  motivo?: string;
  tipoConsulta: string;
  duracionMinutos: number;
  linkVideollamada?: string;
  medicoNombre: string;
  medicoEspecialidad: string;
}

interface Props {
  turnos: Turno[];
}

const TIPO_ICONS: Record<string, React.ReactNode> = {
  presencial: <MapPin className="h-4 w-4" />,
  virtual: <Video className="h-4 w-4" />,
  telefonica: <Phone className="h-4 w-4" />,
};

function formatDate(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export default function PortalTurnosClient({ turnos }: Props) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [cancelados, setCancelados] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');

  async function cancelarTurno(turnoId: string) {
    if (!confirm('¿Estás seguro de cancelar este turno?')) return;
    setError('');
    setLoadingId(turnoId);

    try {
      const res = await fetch(`/api/portal/turnos/${turnoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'cancelada', motivo: 'Cancelado por el paciente' }),
      });

      if (res.ok) {
        setCancelados((prev) => new Set(prev).add(turnoId));
      } else {
        const data = await res.json();
        setError(data.error || 'Error al cancelar');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setLoadingId(null);
    }
  }

  const pendientes = turnos.filter((t) => t.estado === 'pendiente' || t.estado === 'confirmada');
  const pasados = turnos.filter((t) => !['pendiente', 'confirmada'].includes(t.estado));

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Mis Turnos</h1>

      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-2 rounded-lg text-sm mb-4">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      {pendientes.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Próximos</h2>
          <div className="space-y-3">
            {pendientes.map((t) => (
              <div
                key={t.id}
                className={`bg-white rounded-xl border border-gray-200 p-4 ${
                  cancelados.has(t.id) ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-gray-700 mb-1">
                      <Calendar className="h-4 w-4" />
                      <span className="font-medium">{formatDate(t.fechaHora)} · {t.hora}</span>
                    </div>
                    <div className="text-sm text-gray-500 mb-2">
                      Dr/a. {t.medicoNombre} · {t.medicoEspecialidad}
                    </div>
                    {t.motivo && (
                      <div className="text-sm text-gray-600 mb-1">{t.motivo}</div>
                    )}
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        {TIPO_ICONS[t.tipoConsulta] || null}
                        {t.tipoConsulta}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {t.duracionMinutos} min
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 items-end">
                    {!cancelados.has(t.id) && t.tipoConsulta === 'virtual' && t.linkVideollamada && (
                      <a
                        href={t.linkVideollamada}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <Video className="h-3.5 w-3.5" />
                        Ingresar
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}

                    {!cancelados.has(t.id) && (
                      <button
                        onClick={() => cancelarTurno(t.id)}
                        disabled={loadingId === t.id}
                        className="text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors p-1"
                        title="Cancelar turno"
                      >
                        {loadingId === t.id ? (
                          <span className="h-4 w-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin inline-block" />
                        ) : (
                          <XCircle className="h-5 w-5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pasados.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Historial</h2>
          <div className="space-y-2">
            {pasados.map((t) => (
              <div
                key={t.id}
                className="bg-white/60 rounded-lg border border-gray-100 p-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm font-medium text-gray-700">
                      {formatDate(t.fechaHora)} · {t.hora}
                    </div>
                    <div className="text-xs text-gray-400">
                      Dr/a. {t.medicoNombre} · {t.tipoConsulta}
                    </div>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      t.estado === 'atendido'
                        ? 'bg-green-100 text-green-700'
                        : t.estado === 'cancelada'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {t.estado}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {turnos.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Calendar className="h-12 w-12 mx-auto mb-3" />
          <p>No tienes turnos registrados</p>
        </div>
      )}
    </div>
  );
}
