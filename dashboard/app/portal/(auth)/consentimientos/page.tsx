/**
 * Portal Consentimientos Page
 * Lista y permite firmar consentimientos informados
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileText, PenSquare, CheckCircle2, Eye } from 'lucide-react';
import { PortalCard } from '@/components/portal/portal-card';
import { PortalBadge } from '@/components/portal/portal-badge';
import { PortalButton } from '@/components/portal/portal-button';
import { PortalSkeleton } from '@/components/portal/portal-skeleton';

interface Consentimiento {
  id: string;
  tipo: string;
  titulo: string;
  descripcion?: string | null;
  fechaFirma?: string | null;
  documentoPdf?: string | null;
  createdAt: string;
  medicoNombre?: string | null;
}

function formatDate(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function PortalConsentimientosPage() {
  const [consentimientos, setConsentimientos] = useState<Consentimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [firmando, setFirmando] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const cargar = useCallback(() => {
    fetch('/api/portal/consentimientos')
      .then((res) => res.json())
      .then((data) => {
        setConsentimientos(Array.isArray(data) ? data : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const firmar = async (id: string) => {
    setFirmando(id);
    setMsg(null);
    try {
      const res = await fetch(`/api/portal/consentimientos/${id}/firmar`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setMsg({ type: 'success', text: data.mensaje });
        cargar();
      } else {
        setMsg({ type: 'error', text: data.error || 'Error al firmar' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Error de conexión' });
    } finally {
      setFirmando(null);
    }
  };

  if (loading) {
    return <PortalSkeleton />;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1 text-portal-fg">Consentimientos</h1>
      <p className="text-sm mb-6 text-portal-muted-fg">
        Documentos que requieren o han recibido tu firma digital
      </p>

      {msg && (
        <div
          className="mb-4 p-3 rounded-lg text-sm"
          style={
            msg.type === 'success'
              ? {
                  background: 'hsl(var(--portal-primary) / 0.08)',
                  color: 'hsl(var(--portal-primary))',
                  border: '1px solid hsl(var(--portal-primary) / 0.25)',
                }
              : {
                  background: 'hsl(var(--portal-destructive) / 0.08)',
                  color: 'hsl(var(--portal-destructive))',
                  border: '1px solid hsl(var(--portal-destructive) / 0.15)',
                }
          }
        >
          {msg.text}
        </div>
      )}

      {consentimientos.length === 0 ? (
        <div className="text-center py-16 text-portal-muted-fg/70">
          <div className="rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3 bg-portal-muted">
            <FileText className="h-6 w-6 text-portal-muted-fg" />
          </div>
          <p>No tienes consentimientos pendientes</p>
          <p className="text-sm mt-2">
            Cuando tu médico registre un consentimiento, aparecerá aquí para que lo firmes
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {consentimientos.map((c) => {
            const firmado = !!c.fechaFirma;
            return (
              <PortalCard
                key={c.id}
                hover
                style={firmado ? { border: '1px solid hsl(var(--portal-primary) / 0.3)' } : undefined}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {firmado ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-portal-primary" />
                      ) : (
                        <FileText className="h-4 w-4 shrink-0 text-portal-primary" />
                      )}
                      <h3 className="font-medium truncate text-portal-fg">{c.titulo}</h3>
                      {firmado && (
                        <PortalBadge variant="primary">
                          Firmado
                        </PortalBadge>
                      )}
                      {!firmado && (
                        <PortalBadge variant="warning">
                          Pendiente
                        </PortalBadge>
                      )}
                    </div>

                    {c.descripcion && (
                      <p className="text-sm mb-1 line-clamp-2 text-portal-muted-fg/80">
                        {c.descripcion}
                      </p>
                    )}

                    <div className="text-xs space-x-2 text-portal-muted-fg/70">
                      <span>{formatDate(c.createdAt)}</span>
                      {c.medicoNombre && <span>· Dr/a. {c.medicoNombre}</span>}
                      {firmado && c.fechaFirma && (
                        <span>· Firmado: {formatDate(c.fechaFirma)}</span>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 flex flex-col gap-1.5">
                    {!firmado && (
                      <PortalButton
                        onClick={() => firmar(c.id)}
                        loading={firmando === c.id}
                        variant="primary"
                      >
                        <PenSquare className="h-3.5 w-3.5" />
                        Firmar
                      </PortalButton>
                    )}
                    {c.documentoPdf && (
                      <a
                        href={c.documentoPdf}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-xl transition-colors duration-200 text-portal-muted-fg bg-portal-muted hover:bg-hsl(var(--portal-muted) / 0.9) hover:text-hsl(var(--portal-foreground))"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Ver
                      </a>
                    )}
                  </div>
                </div>
              </PortalCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
