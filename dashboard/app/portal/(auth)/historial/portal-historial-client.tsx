/**
 * Portal Historial Client
 * Rediseñado con portal design system tokens.
 */

'use client';

import { ClipboardList, Stethoscope, FileText } from 'lucide-react';
import { PortalCard } from '@/components/portal/portal-card';
import { PortalBadge } from '@/components/portal/portal-badge';

interface HistorialEntry {
  id: string;
  tipo: string;
  titulo: string;
  descripcion: string;
  diagnosticoCodigo?: string;
  diagnosticoDescripcion?: string;
  createdAt: string;
  medicoNombre: string;
}

interface Props {
  historial: HistorialEntry[];
}

function formatDate(date: string): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function PortalHistorialClient({
  historial,
}: Props) {
  return (
    <div>
      <h1
        className="text-2xl font-bold mb-6 text-portal-fg"
      >
        Historial Médico
      </h1>

      {historial.length > 0 ? (
        <div className="space-y-3">
          {historial.map((h) => (
            <PortalCard key={h.id} hover padding="md">
              <div className="flex items-start gap-3 mb-2">
                <div
                  className={`mt-1 shrink-0 ${
                    h.tipo === 'consulta' ? 'text-portal-primary' : h.tipo === 'encuesta' ? 'text-portal-accent' : 'text-portal-muted-fg'
                  }`}
                >
                  {h.tipo === 'consulta' ? (
                    <Stethoscope className="h-5 w-5" />
                  ) : h.tipo === 'encuesta' ? (
                    <FileText className="h-5 w-5" />
                  ) : (
                    <ClipboardList className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-portal-fg">
                    {h.titulo}
                  </div>
                  <div className="text-sm mb-2 text-portal-muted-fg">
                    {formatDate(h.createdAt)} · Dr/a. {h.medicoNombre}
                  </div>
                  {h.descripcion && (
                    <p className="text-sm mb-2 text-portal-muted-fg/80">
                      {h.descripcion}
                    </p>
                  )}
                  {h.diagnosticoDescripcion && (
                    <PortalBadge variant="muted" className="rounded-lg px-3 py-1.5 text-sm font-normal">
                      <span className="text-xs text-portal-muted-fg/60">
                        Diagnóstico:{' '}
                      </span>
                      {h.diagnosticoCodigo && (
                        <span className="font-mono text-xs">
                          {h.diagnosticoCodigo}
                        </span>
                      )}
                      {h.diagnosticoDescripcion}
                    </PortalBadge>
                  )}
                </div>
              </div>
            </PortalCard>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
            <div className="rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3 bg-portal-muted">
              <ClipboardList className="h-6 w-6 text-portal-muted-fg/50" />
            </div>
            <p className="text-portal-muted-fg">
            No tienes historial médico registrado
          </p>
        </div>
      )}
    </div>
  );
}
