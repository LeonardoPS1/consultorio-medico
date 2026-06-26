/**
 * Portal Recetas Client
 * Rediseñado con portal design system tokens.
 */

'use client';

import { FileText, Pill, Download } from 'lucide-react';

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

/* ─── Reusable card style ───────────────────────────────── */
const cardStyle: React.CSSProperties = {
  background: 'var(--portal-bg-alt)',
  border: '1px solid hsl(var(--portal-border-light))',
  borderRadius: '0.75rem',
  boxShadow: 'var(--portal-shadow-sm)',
};

export default function PortalRecetasClient({ recetas }: Props) {
  return (
    <div>
      <h1
        className="text-2xl font-bold mb-6"
        style={{ color: 'hsl(var(--portal-foreground))' }}
      >
        Mis Recetas
      </h1>

      {recetas.length > 0 ? (
        <div className="space-y-3">
          {recetas.map((r) => (
            <div
              key={r.id}
              style={{
                ...cardStyle,
                padding: '1rem',
                transition: 'box-shadow 200ms ease-out',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = 'var(--portal-shadow-md)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'var(--portal-shadow-sm)';
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Pill
                    className="h-5 w-5 shrink-0"
                    style={{ color: 'hsl(var(--portal-primary))' }}
                  />
                  <span
                    className="font-semibold"
                    style={{ color: 'hsl(var(--portal-foreground))' }}
                  >
                    {r.medicamento}
                  </span>
                </div>
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ml-2"
                  style={
                    r.estado === 'activa'
                      ? {
                          background:
                            'hsl(var(--portal-primary) / 0.12)',
                          color: 'hsl(var(--portal-primary))',
                        }
                      : r.estado === 'vencida'
                        ? {
                            background:
                              'hsl(var(--portal-destructive) / 0.12)',
                            color: 'hsl(var(--portal-destructive))',
                          }
                        : {
                            background: 'hsl(var(--portal-muted))',
                            color: 'hsl(var(--portal-muted-foreground))',
                          }
                  }
                >
                  {r.estado}
                </span>
              </div>

              <div
                className="grid grid-cols-2 gap-2 text-sm mb-3"
                style={{ color: 'hsl(var(--portal-muted-foreground))' }}
              >
                <div>
                  <span style={{ opacity: 0.6 }}>Dosis:</span>{' '}
                  <span
                    className="font-medium"
                    style={{ color: 'hsl(var(--portal-foreground))' }}
                  >
                    {r.dosis}
                  </span>
                </div>
                <div>
                  <span style={{ opacity: 0.6 }}>Frecuencia:</span>{' '}
                  <span
                    className="font-medium"
                    style={{ color: 'hsl(var(--portal-foreground))' }}
                  >
                    {r.frecuencia}
                  </span>
                </div>
                <div>
                  <span style={{ opacity: 0.6 }}>Duración:</span>{' '}
                  <span
                    className="font-medium"
                    style={{ color: 'hsl(var(--portal-foreground))' }}
                  >
                    {r.duracion}
                  </span>
                </div>
                <div>
                  <span style={{ opacity: 0.6 }}>Inicio:</span>{' '}
                  <span
                    className="font-medium"
                    style={{ color: 'hsl(var(--portal-foreground))' }}
                  >
                    {formatDate(r.fechaInicio)}
                  </span>
                </div>
              </div>

              {r.indicaciones && (
                <div
                  className="rounded-lg p-3 mb-3 text-sm"
                  style={{
                    background: 'hsl(var(--portal-muted))',
                    color: 'hsl(var(--portal-muted-foreground))',
                  }}
                >
                  <strong>Indicaciones:</strong> {r.indicaciones}
                </div>
              )}

              <div className="flex items-center justify-between mt-2">
                <div
                  className="flex items-center gap-2 text-xs"
                  style={{
                    color: 'hsl(var(--portal-muted-foreground) / 0.7)',
                  }}
                >
                  Dr/a. {r.medicoNombre} · {r.medicoEspecialidad}
                </div>
                <a
                  href={`/api/portal/recetas/${r.id}`}
                  target="_blank"
                  className="text-xs font-medium flex items-center gap-1 transition-colors"
                  style={{ color: 'hsl(var(--portal-primary))' }}
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
        <div className="text-center py-12">
          <div
            className="rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3"
            style={{ background: 'hsl(var(--portal-muted))' }}
          >
            <FileText
              className="h-6 w-6"
              style={{
                color: 'hsl(var(--portal-muted-foreground) / 0.5)',
              }}
            />
          </div>
          <p style={{ color: 'hsl(var(--portal-muted-foreground))' }}>
            No tienes recetas registradas
          </p>
        </div>
      )}
    </div>
  );
}
