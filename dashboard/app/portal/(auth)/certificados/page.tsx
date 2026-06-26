/**
 * Portal Certificados Page
 * Lista certificados médicos emitidos
 */

'use client';

import { useState, useEffect } from 'react';
import { FileText, Download, ExternalLink, Loader2, SearchX } from 'lucide-react';
import { PortalCard } from '@/components/portal/portal-card';

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
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);

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
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'hsl(var(--portal-primary))' }} />
      </div>
    );
  }

  if (certificados.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6" style={{ color: 'hsl(var(--portal-foreground))' }}>Mis Certificados</h1>
        <PortalCard padding="lg" className="text-center" style={{ color: 'hsl(var(--portal-muted-foreground) / 0.7)' }}>
          <div className="rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3" style={{ background: 'hsl(var(--portal-muted))' }}>
            <FileText className="h-6 w-6" style={{ color: 'hsl(var(--portal-muted-foreground) / 0.5)' }} />
          </div>
          <p>No tienes certificados médicos emitidos</p>
          <p className="text-sm mt-2">Cuando tu médico emita un certificado, aparecerá aquí</p>
        </PortalCard>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'hsl(var(--portal-foreground))' }}>Mis Certificados</h1>

      <div className="space-y-2">
        {certificados.map((c) => (
          <PortalCard key={c.id} hover className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-4 w-4 shrink-0" style={{ color: 'hsl(var(--portal-primary))' }} />
                <h3 className="font-medium truncate" style={{ color: 'hsl(var(--portal-foreground))' }}>{c.titulo}</h3>
              </div>
              <p className="text-sm" style={{ color: 'hsl(var(--portal-muted-foreground))' }}>
                {formatDate(c.createdAt)}
                {c.medicoNombre && <span> · Dr/a. {c.medicoNombre}</span>}
              </p>
            </div>

            <a
              href={`/api/portal/certificados/${c.id}`}
              target="_blank"
              className="shrink-0 inline-flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-xl"
              style={{
                color: 'hsl(var(--portal-primary))',
                background: hoveredLink === c.id ? 'hsl(var(--portal-primary) / 0.15)' : 'hsl(var(--portal-primary) / 0.08)',
                transition: 'background 200ms ease-out',
              }}
              onMouseEnter={() => setHoveredLink(c.id)}
              onMouseLeave={() => setHoveredLink(null)}
              title="Ver certificado"
            >
              <Download className="h-3.5 w-3.5" />
              PDF
              <ExternalLink className="h-3 w-3" />
            </a>
          </PortalCard>
        ))}
      </div>
    </div>
  );
}
