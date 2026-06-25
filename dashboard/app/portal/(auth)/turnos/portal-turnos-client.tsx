/**
 * Portal Turnos Client
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  MapPin,
  Video,
  Phone,
  Clock,
  XCircle,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Receipt,
} from 'lucide-react';

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
  pagado: boolean;
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
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [cancelados, setCancelados] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  function reagendarTurno(turnoId: string) {
    router.push(`/portal/agendar?reschedule=${turnoId}`);
  }

  async function cancelarTurno(turnoId: string) {
    setError('');
    setSuccessMsg('');
    setLoadingId(turnoId);

    try {
      const res = await fetch(`/api/portal/turnos/${turnoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'cancelada', motivo: 'Cancelado por el paciente' }),
      });

      const data = await res.json();
      if (res.ok) {
        setCancelados((prev) => new Set(prev).add(turnoId));
        setError('');
        if (data.reembolso) {
          if (data.reembolso.procesado) {
            setSuccessMsg(
              `✅ Turno cancelado. ${data.reembolso.mensaje} — Monto reembolsado: $${Number(data.reembolso.monto).toLocaleString('es-CL')}`,
            );
          } else {
            setSuccessMsg(`Turno cancelado. ${data.reembolso.mensaje}`);
          }
        } else {
          setSuccessMsg('Turno cancelado correctamente');
        }
      } else {
        setError(data.error || 'Error al cancelar');
        setSuccessMsg('');
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
      <h1 className="text-2xl font-bold text-foreground mb-6">Mis Turnos</h1>

      {error && (
        <div className="flex items-center gap-2 text-destructive bg-destructive/5 px-3 py-2.5 rounded-xl border border-destructive/10 text-sm mb-4">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 text-sm mb-4">
          <span>{successMsg}</span>
        </div>
      )}

      {pendientes.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Próximos</h2>
          <div className="space-y-3">
            {pendientes.map((t) => (
              <div
                key={t.id}
                className={`bg-card rounded-xl border border-border/50 p-4 transition-all duration-200 hover:shadow-card-hover ${
                  cancelados.has(t.id) ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-foreground mb-1">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="font-medium">
                        {formatDate(t.fechaHora)} · {t.hora}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">
                      Dr/a. {t.medicoNombre} · {t.medicoEspecialidad}
                    </div>
                    {t.motivo && <div className="text-sm text-muted-foreground/80 mb-1">{t.motivo}</div>}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground/60">
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
                    {!cancelados.has(t.id) &&
                      t.tipoConsulta === 'virtual' &&
                      t.linkVideollamada && (
                        <a
                          href={t.linkVideollamada}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/8 hover:bg-primary/12 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <Video className="h-3.5 w-3.5" />
                          Ingresar
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}

                    {!cancelados.has(t.id) && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => reagendarTurno(t.id)}
                          disabled={loadingId === t.id}
                          className="text-primary hover:text-primary/80 disabled:opacity-50 transition-colors p-1"
                          title="Reagendar turno"
                        >
                          <RefreshCw className="h-5 w-5" />
                        </button>
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
                      </div>
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
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Historial</h2>
          <div className="space-y-2">
            {pasados.map((t) => (
              <div key={t.id} className="bg-card/60 rounded-xl border border-border/30 p-3 transition-all duration-200 hover:bg-card">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {formatDate(t.fechaHora)} · {t.hora}
                    </div>
                    <div className="text-xs text-muted-foreground/70">
                      Dr/a. {t.medicoNombre} · {t.tipoConsulta}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {t.pagado && (
                      <a
                        href={`/api/portal/recibos/${t.id}`}
                        target="_blank"
                        className="text-xs font-medium text-primary hover:text-primary/80 flex items-center gap-1"
                        title="Ver recibo"
                      >
                        <Receipt className="h-3.5 w-3.5" />
                        Recibo
                      </a>
                    )}
                    <span
                      className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full ${
                        t.estado === 'atendido'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                          : t.estado === 'cancelada'
                            ? 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                      }`}
                    >
                      {t.estado}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {turnos.length === 0 && (
        <div className="text-center py-16">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Calendar className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <p className="text-muted-foreground font-medium">No tienes turnos registrados</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Agendá tu primer turno desde la sección Agendar</p>
        </div>
      )}
    </div>
  );
}
