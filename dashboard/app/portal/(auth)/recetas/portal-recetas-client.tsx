/**
 * Portal Recetas Client
 * Rediseñado con portal design system tokens.
 */

'use client';

import { FileText, Pill, Download } from 'lucide-react';
import { useState } from 'react';
import { PortalBadge } from '@/components/portal/portal-badge';
import { PortalCard } from '@/components/portal/portal-card';
import { RecetaPreviewDialog } from '@/components/recetas/receta-preview-dialog';
import type { RecetaLike } from '@/lib/receta-pdf';

interface Receta {
  id: string;
  estado: string;
  medicamento: string;
  dosis: string;
  frecuencia: string;
  duracion: string;
  indicaciones: string;
  fechaInicio: string;
  fechaFin: string;
  medicoNombre: string;
  medicoEspecialidad: string;
}

interface Props {
  recetas: Receta[];
  pacienteNombre: string;
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
 * @param root0.recetas
 * @param root0.pacienteNombre
 */
export default function PortalRecetasClient({ recetas, pacienteNombre }: Props) {
  const [previewReceta, setPreviewReceta] = useState<RecetaLike | null>(null);

  const toRecetaLike = (r: Receta): RecetaLike => ({
    id: r.id,
    paciente: pacienteNombre || 'Paciente',
    medicamento: r.medicamento,
    dosis: r.dosis,
    duracion: r.duracion || r.frecuencia,
    vence: r.fechaFin || r.fechaInicio,
    indicaciones: r.indicaciones || undefined,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-portal-fg">Mis Recetas</h1>

      {recetas.length > 0 ? (
        <div className="space-y-3">
          {recetas.map((r) => (
            <PortalCard key={r.id} hover padding="md">
              <button
                type="button"
                onClick={() => setPreviewReceta(toRecetaLike(r))}
                className="w-full text-left focus:outline-none"
                aria-label={`Ver vista previa de ${r.medicamento}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Pill className="h-5 w-5 shrink-0 text-portal-primary" />
                    <span className="font-semibold text-portal-fg">{r.medicamento}</span>
                  </div>
                  <PortalBadge variant={r.estado === 'activa' ? 'success' : 'destructive'}>
                    {r.estado}
                  </PortalBadge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm mb-3 text-portal-muted-fg">
                  <div>
                    <span className="opacity-60">Dosis:</span>{' '}
                    <span className="font-medium text-portal-fg">{r.dosis}</span>
                  </div>
                  <div>
                    <span className="opacity-60">Frecuencia:</span>{' '}
                    <span className="font-medium text-portal-fg">{r.frecuencia}</span>
                  </div>
                  <div>
                    <span className="opacity-60">Duración:</span>{' '}
                    <span className="font-medium text-portal-fg">{r.duracion}</span>
                  </div>
                  <div>
                    <span className="opacity-60">Inicio:</span>{' '}
                    <span className="font-medium text-portal-fg">{formatDate(r.fechaInicio)}</span>
                  </div>
                </div>

                {r.indicaciones && (
                  <div className="rounded-lg p-3 mb-3 text-sm bg-portal-muted text-portal-muted-fg">
                    <strong>Indicaciones:</strong> {r.indicaciones}
                  </div>
                )}
              </button>

              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2 text-xs text-portal-muted-fg/70">
                  Dr/a. {r.medicoNombre} · {r.medicoEspecialidad}
                </div>
                <a
                  href={`/api/portal/recetas/${r.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium flex items-center gap-1 transition-colors text-portal-primary"
                  title="Descargar PDF"
                >
                  <Download className="h-3.5 w-3.5" />
                  PDF
                </a>
              </div>
            </PortalCard>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3 bg-portal-muted">
            <FileText className="h-6 w-6 text-portal-muted-fg/50" />
          </div>
          <p className="text-portal-muted-fg">No tienes recetas registradas</p>
        </div>
      )}

      {previewReceta && (
        <RecetaPreviewDialog
          key={previewReceta.id}
          receta={previewReceta}
          onClose={() => setPreviewReceta(null)}
        />
      )}
    </div>
  );
}
