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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-1">Consentimientos</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Documentos que requieren o han recibido tu firma digital
      </p>

      {msg && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm ${
            msg.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-destructive/5 text-destructive border border-destructive/10'
          }`}
        >
          {msg.text}
        </div>
      )}

      {consentimientos.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground/70">
          <div className="rounded-full bg-muted w-12 h-12 flex items-center justify-center mx-auto mb-3">
            <FileText className="h-6 w-6" />
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
                className={`bg-card rounded-xl border p-4 ${
                  firmado ? 'border-green-200' : 'border-border/50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {firmado ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      ) : (
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                      )}
                      <h3 className="font-medium text-foreground truncate">{c.titulo}</h3>
                      {firmado && (
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full shrink-0">
                          Firmado
                        </span>
                      )}
                      {!firmado && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full shrink-0">
                          Pendiente
                        </span>
                      )}
                    </div>

                    {c.descripcion && (
                      <p className="text-sm text-muted-foreground/80 mb-1 line-clamp-2">{c.descripcion}</p>
                    )}

                    <div className="text-xs text-muted-foreground/70 space-x-2">
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
                        className="inline-flex items-center gap-1 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 px-3 py-1.5 rounded-xl transition-colors"
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
                        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground bg-muted hover:bg-muted/80 px-3 py-1.5 rounded-xl transition-colors"
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
