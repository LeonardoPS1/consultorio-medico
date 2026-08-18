/**
 * Portal Historial Client
 * Rediseñado con portal design system tokens.
 */

'use client';

import { ClipboardList, Stethoscope, FileText } from 'lucide-react';
import { PortalBadge } from '@/components/portal/portal-badge';
import { PortalCard } from '@/components/portal/portal-card';
import { AvatarInitials } from '@/components/portal/avatar-initials';

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

/**
 *
 * @param root0
 * @param root0.historial
 */
export default function PortalHistorialClient({
  historial,
}: Props) {
  return (
    <div>
      <h1 className="text-[20px] font-semibold tracking-[0.01em] mb-6 text-portal-fg">
        Historial Médico
      </h1>

      {historial.length > 0 ? (
        <div className="space-y-3">
          {historial.map((h) => {
            const isConsulta = h.tipo === 'consulta';
            const isEncuesta = h.tipo === 'encuesta';
            const chipColor = isConsulta
              ? 'bg-[#93C5FD]/15 text-[#2563EB]'
              : isEncuesta
              ? 'bg-[#A78BFA]/15 text-[#7C3AED]'
              : 'bg-portal-muted text-portal-muted-fg';
            const chipIcon = isConsulta ? (
              <Stethoscope className="h-3.5 w-3.5" />
            ) : isEncuesta ? (
              <FileText className="h-3.5 w-3.5" />
            ) : (
              <ClipboardList className="h-3.5 w-3.5" />
            );

            return (
              <PortalCard key={h.id} hover padding="md">
                <div className="flex items-start gap-3 mb-2">
                  <div className={`mt-0.5 shrink-0 ${chipColor} rounded-full p-2`}>
                    {chipIcon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-portal-fg text-[14px]">
                      {h.titulo}
                    </div>
                    <div className="text-sm text-portal-muted-fg mt-1">
                      {formatDate(h.createdAt)} · Dr/a. {h.medicoNombre}
                    </div>
                    {h.descripcion && (
                      <p className="text-sm text-portal-muted-fg/80 mt-2">
                        {h.descripcion}
                      </p>
                    )}
                    {h.diagnosticoDescripcion && (
                      <PortalBadge
                        variant="teal"
                        className="mt-2 rounded-full px-3 py-1.5 text-sm font-normal"
                      >
                        <span className="text-xs text-[#0D9488] dark:text-[#2DD4BF]">
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
            );
          })}
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
