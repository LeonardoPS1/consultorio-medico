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

  useEffect(() => { cargar(); }, [cargar]);

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
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Consentimientos</h1>
      <p className="text-sm text-gray-500 mb-6">
        Documentos que requieren o han recibido tu firma digital
      </p>

      {msg && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm ${
            msg.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {msg.text}
        </div>
      )}

      {consentimientos.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileText className="h-12 w-12 mx-auto mb-3" />
          <p>No tienes consentimientos pendientes</p>
          <p className="text-sm mt-2">Cuando tu médico registre un consentimiento, aparecerá aquí para que lo firmes</p>
        </div>
      ) : (
        <div className="space-y-3">
          {consentimientos.map((c) => {
            const firmado = !!c.fechaFirma;
            return (
              <div
                key={c.id}
                className={`bg-white rounded-lg border p-4 ${
                  firmado ? 'border-green-200' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {firmado ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                      ) : (
                        <FileText className="h-4 w-4 text-amber-500 shrink-0" />
                      )}
                      <h3 className="font-medium text-gray-900 truncate">{c.titulo}</h3>
                      {firmado && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full shrink-0">
                          Firmado
                        </span>
                      )}
                      {!firmado && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full shrink-0">
                          Pendiente
                        </span>
                      )}
                    </div>

                    {c.descripcion && (
                      <p className="text-sm text-gray-600 mb-1 line-clamp-2">{c.descripcion}</p>
                    )}

                    <div className="text-xs text-gray-400 space-x-2">
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
                        className="inline-flex items-center gap-1 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
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
                        className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors"
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
