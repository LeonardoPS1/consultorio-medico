/**
 * Portal Consentimientos Page
 * Lista y permite firmar consentimientos informados
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileText, PenSquare, CheckCircle2, Loader2, Eye } from 'lucide-react';

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
  const [hoverFirmar, setHoverFirmar] = useState<string | null>(null);
  const [hoverVer, setHoverVer] = useState<string | null>(null);

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
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'hsl(var(--portal-primary))' }} />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1" style={{ color: 'hsl(var(--portal-foreground))' }}>Consentimientos</h1>
      <p className="text-sm mb-6" style={{ color: 'hsl(var(--portal-muted-foreground))' }}>
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
        <div className="text-center py-16" style={{ color: 'hsl(var(--portal-muted-foreground) / 0.7)' }}>
          <div className="rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3" style={{ background: 'hsl(var(--portal-muted))' }}>
            <FileText className="h-6 w-6" style={{ color: 'hsl(var(--portal-muted-foreground))' }} />
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
              <div
                key={c.id}
                className="rounded-xl p-4"
                style={{
                  background: 'var(--portal-bg-alt)',
                  border: firmado
                    ? '1px solid hsl(var(--portal-primary) / 0.3)'
                    : '1px solid hsl(var(--portal-border-light))',
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {firmado ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: 'hsl(var(--portal-primary))' }} />
                      ) : (
                        <FileText className="h-4 w-4 shrink-0" style={{ color: 'hsl(var(--portal-primary))' }} />
                      )}
                      <h3 className="font-medium truncate" style={{ color: 'hsl(var(--portal-foreground))' }}>{c.titulo}</h3>
                      {firmado && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full shrink-0"
                          style={{ background: 'hsl(var(--portal-primary) / 0.12)', color: 'hsl(var(--portal-primary))' }}
                        >
                          Firmado
                        </span>
                      )}
                      {!firmado && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full shrink-0"
                          style={{ background: 'hsl(var(--portal-primary) / 0.1)', color: 'hsl(var(--portal-primary))' }}
                        >
                          Pendiente
                        </span>
                      )}
                    </div>

                    {c.descripcion && (
                      <p className="text-sm mb-1 line-clamp-2" style={{ color: 'hsl(var(--portal-muted-foreground) / 0.8)' }}>
                        {c.descripcion}
                      </p>
                    )}

                    <div className="text-xs space-x-2" style={{ color: 'hsl(var(--portal-muted-foreground) / 0.7)' }}>
                      <span>{formatDate(c.createdAt)}</span>
                      {c.medicoNombre && <span>· Dr/a. {c.medicoNombre}</span>}
                      {firmado && c.fechaFirma && (
                        <span>· Firmado: {formatDate(c.fechaFirma)}</span>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 flex flex-col gap-1.5">
                    {!firmado && (
                      <button
                        onClick={() => firmar(c.id)}
                        disabled={firmando === c.id}
                        className="inline-flex items-center gap-1 text-sm font-medium disabled:opacity-50 px-3 py-1.5 rounded-xl"
                        style={{
                          color: 'white',
                          background: 'linear-gradient(135deg, hsl(var(--portal-primary)), hsl(var(--portal-accent)))',
                          opacity: hoverFirmar === c.id ? 0.9 : 1,
                          transition: 'opacity 200ms ease-out',
                        }}
                        onMouseEnter={() => setHoverFirmar(c.id)}
                        onMouseLeave={() => setHoverFirmar(null)}
                      >
                        {firmando === c.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <PenSquare className="h-3.5 w-3.5" />
                        )}
                        Firmar
                      </button>
                    )}
                    {c.documentoPdf && (
                      <a
                        href={c.documentoPdf}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-xl"
                        style={{
                          color: hoverVer === c.id ? 'hsl(var(--portal-foreground))' : 'hsl(var(--portal-muted-foreground))',
                          background: hoverVer === c.id ? 'hsl(var(--portal-muted) / 0.9)' : 'hsl(var(--portal-muted))',
                          transition: 'all 200ms ease-out',
                        }}
                        onMouseEnter={() => setHoverVer(c.id)}
                        onMouseLeave={() => setHoverVer(null)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Ver
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
