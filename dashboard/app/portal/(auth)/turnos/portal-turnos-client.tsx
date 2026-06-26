/**
 * Portal Turnos Client
 * Rediseñado con portal design system tokens.
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
import { PortalCard } from '@/components/portal/portal-card';
import { PortalBadge } from '@/components/portal/portal-badge';

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
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setLoadingId(null);
    }
  }

  const pendientes = turnos.filter(
    (t) => t.estado === 'pendiente' || t.estado === 'confirmada',
  );
  const pasados = turnos.filter(
    (t) => !['pendiente', 'confirmada'].includes(t.estado),
  );

  return (
    <div>
      <h1
        className="text-2xl font-bold mb-6"
        style={{ color: 'hsl(var(--portal-foreground))' }}
      >
        Mis Turnos
      </h1>

      {error && (
        <div
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm mb-4"
          style={{
            color: 'hsl(var(--portal-destructive))',
            background: 'hsl(var(--portal-destructive) / 0.08)',
            border: '1px solid hsl(var(--portal-destructive) / 0.15)',
          }}
        >
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {successMsg && (
        <div
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm mb-4"
          style={{
            color: 'hsl(var(--portal-primary))',
            background: 'hsl(var(--portal-primary) / 0.08)',
            border: '1px solid hsl(var(--portal-primary) / 0.15)',
          }}
        >
          <span>{successMsg}</span>
        </div>
      )}

      {pendientes.length > 0 && (
        <div className="mb-6">
          <h2
            className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: 'hsl(var(--portal-muted-foreground))' }}
          >
            Próximos
          </h2>
          <div className="space-y-3">
            {pendientes.map((t) => (
              <PortalCard
                key={t.id}
                padding="md"
                hover
                style={{ opacity: cancelados.has(t.id) ? 0.5 : 1 }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div
                      className="flex items-center gap-2 mb-1"
                      style={{ color: 'hsl(var(--portal-foreground))' }}
                    >
                      <Calendar
                        className="h-4 w-4 shrink-0"
                        style={{ color: 'hsl(var(--portal-primary))' }}
                      />
                      <span className="font-medium truncate">
                        {formatDate(t.fechaHora)} · {t.hora}
                      </span>
                    </div>
                    <div
                      className="text-sm mb-2"
                      style={{ color: 'hsl(var(--portal-muted-foreground))' }}
                    >
                      Dr/a. {t.medicoNombre} · {t.medicoEspecialidad}
                    </div>
                    {t.motivo && (
                      <div
                        className="text-sm mb-1"
                        style={{
                          color: 'hsl(var(--portal-muted-foreground) / 0.8)',
                        }}
                      >
                        {t.motivo}
                      </div>
                    )}
                    <div
                      className="flex items-center gap-3 text-xs"
                      style={{
                        color: 'hsl(var(--portal-muted-foreground) / 0.6)',
                      }}
                    >
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

                  <div className="flex flex-col gap-1 items-end shrink-0 ml-3">
                    {!cancelados.has(t.id) &&
                      t.tipoConsulta === 'virtual' &&
                      t.linkVideollamada && (
                        <a
                          href={t.linkVideollamada}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                          style={{
                            color: 'hsl(var(--portal-primary))',
                            background: 'hsl(var(--portal-primary) / 0.08)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background =
                              'hsl(var(--portal-primary) / 0.12)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background =
                              'hsl(var(--portal-primary) / 0.08)';
                          }}
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
                          className="transition-colors p-1 disabled:opacity-50"
                          style={{
                            color: 'hsl(var(--portal-primary))',
                          }}
                          title="Reagendar turno"
                        >
                          <RefreshCw className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => cancelarTurno(t.id)}
                          disabled={loadingId === t.id}
                          className="transition-colors p-1 disabled:opacity-50"
                          style={{
                            color: 'hsl(var(--portal-destructive))',
                          }}
                          title="Cancelar turno"
                        >
                          {loadingId === t.id ? (
                            <span
                              className="h-4 w-4 border-2 border-t-transparent rounded-full animate-spin inline-block"
                              style={{
                                borderColor:
                                  'hsl(var(--portal-destructive) / 0.3)',
                                borderTopColor:
                                  'hsl(var(--portal-destructive))',
                              }}
                            />
                          ) : (
                            <XCircle className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </PortalCard>
            ))}
          </div>
        </div>
      )}

      {pasados.length > 0 && (
        <div>
          <h2
            className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: 'hsl(var(--portal-muted-foreground))' }}
          >
            Historial
          </h2>
          <div className="space-y-2">
            {pasados.map((t) => (
              <PortalCard
                key={t.id}
                padding="sm"
                hover
                style={{ opacity: 0.8 }}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <div
                      className="text-sm font-medium truncate"
                      style={{ color: 'hsl(var(--portal-foreground))' }}
                    >
                      {formatDate(t.fechaHora)} · {t.hora}
                    </div>
                    <div
                      className="text-xs"
                      style={{
                        color: 'hsl(var(--portal-muted-foreground) / 0.7)',
                      }}
                    >
                      Dr/a. {t.medicoNombre} · {t.tipoConsulta}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {t.pagado && (
                      <a
                        href={`/api/portal/recibos/${t.id}`}
                        target="_blank"
                        className="text-xs font-medium flex items-center gap-1 transition-colors"
                        style={{
                          color: 'hsl(var(--portal-primary))',
                        }}
                        title="Ver recibo"
                      >
                        <Receipt className="h-3.5 w-3.5" />
                        Recibo
                      </a>
                    )}
                    <PortalBadge
                      variant={
                        t.estado === 'atendido'
                          ? 'success'
                          : t.estado === 'cancelada'
                            ? 'destructive'
                            : 'warning'
                      }
                    >
                      {t.estado}
                    </PortalBadge>
                  </div>
                </div>
              </PortalCard>
            ))}
          </div>
        </div>
      )}

      {turnos.length === 0 && (
        <PortalCard padding="lg" className="text-center">
          <div className="py-8">
            <div
              className="h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: 'hsl(var(--portal-muted))' }}
            >
              <Calendar
                className="h-8 w-8"
                style={{
                  color: 'hsl(var(--portal-muted-foreground) / 0.4)',
                }}
              />
            </div>
            <p
              className="font-medium"
              style={{ color: 'hsl(var(--portal-muted-foreground))' }}
            >
              No tienes turnos registrados
            </p>
            <p
              className="text-xs mt-1"
              style={{
                color: 'hsl(var(--portal-muted-foreground) / 0.6)',
              }}
            >
              Agendá tu primer turno desde la sección Agendar
            </p>
          </div>
        </PortalCard>
      )}
    </div>
  );
}
