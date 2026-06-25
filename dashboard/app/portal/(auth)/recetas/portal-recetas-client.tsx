/**
 * Portal Recetas Client
 */

'use client';

import { FileText, Pill, Clock, User, Download } from 'lucide-react';

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
}

function formatDate(date: string): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function PortalRecetasClient({ recetas }: Props) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Mis Recetas</h1>

      {recetas.length > 0 ? (
        <div className="space-y-3">
          {recetas.map((r) => (
            <div key={r.id} className="bg-card rounded-xl border border-border/50 p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Pill className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-foreground">{r.medicamento}</span>
                </div>
                <span
                   className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    r.estado === 'activa'
                      ? 'bg-emerald-100 text-emerald-700'
                      : r.estado === 'vencida'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {r.estado}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                <div>
                  <span className="text-muted-foreground">Dosis:</span>{' '}
                  <span className="font-medium">{r.dosis}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Frecuencia:</span>{' '}
                  <span className="font-medium">{r.frecuencia}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Duración:</span>{' '}
                  <span className="font-medium">{r.duracion}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Inicio:</span>{' '}
                  <span className="font-medium">{formatDate(r.fechaInicio)}</span>
                </div>
              </div>

              {r.indicaciones && (
                <div className="bg-muted rounded-lg p-3 mb-3 text-sm text-muted-foreground">
                  <strong>Indicaciones:</strong> {r.indicaciones}
                </div>
              )}

              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
                  <User className="h-3 w-3" />
                  Dr/a. {r.medicoNombre} · {r.medicoEspecialidad}
                </div>
                <a
                  href={`/api/portal/recetas/${r.id}`}
                  target="_blank"
                  className="text-xs font-medium text-primary hover:text-primary/80 flex items-center gap-1"
                  title="Descargar PDF"
                >
                  <Download className="h-3.5 w-3.5" />
                  PDF
                </a>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground/70">
          <div className="rounded-full bg-muted w-12 h-12 flex items-center justify-center mx-auto mb-3">
            <FileText className="h-6 w-6" />
          </div>
          <p>No tienes recetas registradas</p>
        </div>
      )}
    </div>
  );
}
