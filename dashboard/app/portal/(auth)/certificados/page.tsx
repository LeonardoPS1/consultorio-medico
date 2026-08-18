/**
 * Portal Certificados Page
 * Lista certificados médicos emitidos
 */

'use client';

import { FileText, Download, ExternalLink } from 'lucide-react';
import { useState, useEffect } from 'react';
import { PortalBadge } from '@/components/portal/portal-badge';
import { PortalButton } from '@/components/portal/portal-button';
import { PortalCard } from '@/components/portal/portal-card';
import { PortalSkeleton } from '@/components/portal/portal-skeleton';

interface Certificado {
  id: string;
  titulo: string;
  createdAt: string;
  diagnosticDescripcion?: string | null;
  medicoNombre?: string | null;
  estado?: string;
}

function formatDate(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 *
 */
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
    return <PortalSkeleton />;
  }

  if (certificados.length === 0) {
    return (
      <div>
        <h1 className="text-[20px] font-semibold tracking-[0.01em] mb-6 text-portal-fg">Mis Certificados</h1>
        <PortalCard padding="lg" className="text-center text-portal-muted-fg/70">
          <div className="rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3 bg-portal-muted">
            <FileText className="h-6 w-6 text-portal-muted-fg/50" />
          </div>
          <p>No tienes certificados médicos emitidos</p>
          <p className="text-sm mt-2">Cuando tu médico emita un certificado, aparecerá aquí</p>
        </PortalCard>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-[20px] font-semibold tracking-[0.01em] mb-6 text-portal-fg">Mis Certificados</h1>

      <div className="space-y-2">
        {certificados.map((c) => (
          <PortalCard key={c.id} hover className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-4 w-4 shrink-0 text-portal-primary" />
                <h3 className="font-medium truncate text-portal-fg">{c.titulo}</h3>
              </div>
              <p className="text-sm text-portal-muted-fg">
                {formatDate(c.createdAt)}
                {c.medicoNombre && <span> · Dr/a. {c.medicoNombre}</span>}
              </p>
              {c.diagnosticDescripcion && (
                <p className="text-sm text-portal-muted-fg/80 mt-1 line-clamp-2">
                  {c.diagnosticDescripcion}
                </p>
              )}
            </div>

            <div className="shrink-0 flex items-center gap-2">
              {c.estado && (
                <PortalBadge
                  variant={
                    c.estado === 'emitido' ? 'success' :
                    c.estado === 'revocado' || c.estado === 'cancelado' ? 'destructive' : 'muted'
                  }
                >
                  {c.estado}
                </PortalBadge>
              )}
              <a
                href={`/api/portal/certificados/${c.id}`}
                target="_blank"
                className="inline-flex items-center gap-1 text-sm font-medium px-3 py-1.5 h-9 rounded-full bg-white text-portal-fg border border-portal-border hover:bg-portal-muted transition-all duration-200"
                rel="noreferrer"
              >
                <Download className="h-3.5 w-3.5" />
                PDF
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </PortalCard>
        ))}
      </div>
    </div>
  );
}
