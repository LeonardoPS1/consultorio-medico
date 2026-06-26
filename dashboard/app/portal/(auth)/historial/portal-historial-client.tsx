/**
 * Portal Historial Client
 * Rediseñado con portal design system tokens.
 */

'use client';

import { ClipboardList, Stethoscope, FileText } from 'lucide-react';

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

/* ─── Reusable card style ───────────────────────────────── */
const cardStyle: React.CSSProperties = {
  background: 'var(--portal-bg-alt)',
  border: '1px solid hsl(var(--portal-border-light))',
  borderRadius: '0.75rem',
  boxShadow: 'var(--portal-shadow-sm)',
};

export default function PortalHistorialClient({
  historial,
}: Props) {
  return (
    <div>
      <h1
        className="text-2xl font-bold mb-6"
        style={{ color: 'hsl(var(--portal-foreground))' }}
      >
        Historial Médico
      </h1>

      {historial.length > 0 ? (
        <div className="space-y-3">
          {historial.map((h) => (
            <div
              key={h.id}
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
              <div className="flex items-start gap-3 mb-2">
                <div
                  className="mt-1 shrink-0"
                  style={
                    h.tipo === 'consulta'
                      ? { color: 'hsl(var(--portal-primary))' }
                      : h.tipo === 'encuesta'
                        ? { color: 'hsl(var(--portal-accent))' }
                        : {
                            color:
                              'hsl(var(--portal-muted-foreground))',
                          }
                  }
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
                  <div
                    className="font-semibold"
                    style={{ color: 'hsl(var(--portal-foreground))' }}
                  >
                    {h.titulo}
                  </div>
                  <div
                    className="text-sm mb-2"
                    style={{ color: 'hsl(var(--portal-muted-foreground))' }}
                  >
                    {formatDate(h.createdAt)} · Dr/a. {h.medicoNombre}
                  </div>
                  {h.descripcion && (
                    <p
                      className="text-sm mb-2"
                      style={{
                        color: 'hsl(var(--portal-muted-foreground) / 0.8)',
                      }}
                    >
                      {h.descripcion}
                    </p>
                  )}
                  {h.diagnosticoDescripcion && (
                    <div
                      className="inline-block rounded-lg px-3 py-1.5 text-sm"
                      style={{
                        background: 'hsl(var(--portal-muted))',
                        color: 'hsl(var(--portal-muted-foreground))',
                      }}
                    >
                      <span
                        className="text-xs"
                        style={{
                          color:
                            'hsl(var(--portal-muted-foreground) / 0.6)',
                        }}
                      >
                        Diagnóstico:{' '}
                      </span>
                      {h.diagnosticoCodigo && (
                        <span
                          className="font-mono text-xs px-1 rounded mr-1"
                          style={{
                            background:
                              'hsl(var(--portal-muted-foreground) / 0.15)',
                          }}
                        >
                          {h.diagnosticoCodigo}
                        </span>
                      )}
                      {h.diagnosticoDescripcion}
                    </div>
                  )}
                </div>
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
            <ClipboardList
              className="h-6 w-6"
              style={{
                color: 'hsl(var(--portal-muted-foreground) / 0.5)',
              }}
            />
          </div>
          <p style={{ color: 'hsl(var(--portal-muted-foreground))' }}>
            No tienes historial médico registrado
          </p>
        </div>
      )}
    </div>
  );
}
