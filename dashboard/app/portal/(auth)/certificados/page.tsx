/**
 * Portal Certificados Page
 * Lista certificados médicos emitidos
 */

'use client';

import { useState, useEffect } from 'react';
import { FileText, Download, ExternalLink, Loader2, SearchX } from 'lucide-react';

interface Certificado {
  id: string;
  titulo: string;
  createdAt: string;
  diagnosticDescripcion?: string | null;
  medicoNombre?: string | null;
}

function formatDate(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function PortalCertificadosPage() {
  const [certificados, setCertificados] = useState<Certificado[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/portal/certificados')
      .then((res) => res.json())
      .then((data) => {
        setCertificados(Array.isArray(data) ? data : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (certificados.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-6">Mis Certificados</h1>
        <div className="text-center py-16 text-muted-foreground/70">
          <div className="rounded-full bg-muted w-12 h-12 flex items-center justify-center mx-auto mb-3"><FileText className="h-6 w-6 text-muted-foreground/50" /></div>
          <p>No tienes certificados médicos emitidos</p>
          <p className="text-sm mt-2">Cuando tu médico emita un certificado, aparecerá aquí</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Mis Certificados</h1>

      <div className="space-y-2">
        {certificados.map((c) => (
          <div
            key={c.id}
            className="bg-card rounded-xl border border-border/50 p-4 flex items-start justify-between gap-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <h3 className="font-medium text-foreground truncate">{c.titulo}</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                {formatDate(c.createdAt)}
                {c.medicoNombre && <span> · Dr/a. {c.medicoNombre}</span>}
              </p>
            </div>

            <a
              href={`/api/portal/certificados/${c.id}`}
              target="_blank"
              className="shrink-0 inline-flex items-center gap-1 text-sm font-medium text-primary bg-primary/8 hover:bg-primary/15 px-3 py-1.5 rounded-xl transition-colors"
              title="Ver certificado"
            >
              <Download className="h-3.5 w-3.5" />
              PDF
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
