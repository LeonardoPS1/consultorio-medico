/**
 * Portal Órdenes de Estudio Page
 * Lista órdenes de laboratorio/imagen con estado
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  FlaskConical,
  Image,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react';
import { PortalCard } from '@/components/portal/portal-card';
import { PortalBadge } from '@/components/portal/portal-badge';
import { PortalSkeleton } from '@/components/portal/portal-skeleton';

interface OrdenEstudio {
  id: string;
  titulo: string;
  descripcion?: string | null;
  tipo: string;
  estado: string;
  resultadoUrl?: string | null;
  observaciones?: string | null;
  createdAt: string;
  medicoNombre?: string;
}

function formatDate(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
}

function getTipoIcon(tipo: string) {
  switch (tipo) {
    case 'imagen':
      return <Image className="h-4 w-4" style={{ color: 'hsl(var(--portal-primary))' }} />;
    case 'laboratorio':
    default:
      return <FlaskConical className="h-4 w-4" style={{ color: 'hsl(var(--portal-primary))' }} />;
  }
}

function getEstadoBadge(estado: string) {
  switch (estado) {
    case 'completada':
      return (
        <PortalBadge variant="success" className="flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" /> Completada
        </PortalBadge>
      );
    case 'pendiente':
      return (
        <PortalBadge variant="warning" className="flex items-center gap-1">
          <Clock className="h-3 w-3" /> Pendiente
        </PortalBadge>
      );
    case 'cancelada':
      return (
        <PortalBadge variant="destructive" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" /> Cancelada
        </PortalBadge>
      );
    default:
      return <span className="text-xs" style={{ color: 'hsl(var(--portal-muted-foreground))' }}>{estado}</span>;
  }
}

export default function PortalOrdenesEstudioPage() {
  const [ordenes, setOrdenes] = useState<OrdenEstudio[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoverVerResultado, setHoverVerResultado] = useState<string | null>(null);

  const cargar = useCallback(() => {
    fetch('/api/portal/ordenes-estudio')
      .then((res) => res.json())
      .then((data) => {
        setOrdenes(Array.isArray(data) ? data : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (loading) {
    return <PortalSkeleton />;
  }

  if (ordenes.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6" style={{ color: 'hsl(var(--portal-foreground))' }}>Órdenes de Estudio</h1>
        <div className="text-center py-16" style={{ color: 'hsl(var(--portal-muted-foreground) / 0.7)' }}>
          <div className="rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3" style={{ background: 'hsl(var(--portal-muted))' }}>
            <FlaskConical className="h-6 w-6" />
          </div>
          <p>No tienes órdenes de estudio</p>
          <p className="text-sm mt-2">Cuando tu médico solicite un examen, aparecerá aquí</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1" style={{ color: 'hsl(var(--portal-foreground))' }}>Órdenes de Estudio</h1>
      <p className="text-sm mb-6" style={{ color: 'hsl(var(--portal-muted-foreground))' }}>
        Exámenes de laboratorio, imagen y otros solicitados
      </p>

      <div className="space-y-3">
        {ordenes.map((o) => (
          <PortalCard key={o.id} hover className="flex items-start gap-3">
            <div className="flex items-start gap-3">
              <div
                className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'hsl(var(--portal-muted))' }}
              >
                {getTipoIcon(o.tipo)}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <h3 className="font-medium truncate" style={{ color: 'hsl(var(--portal-foreground))' }}>{o.titulo}</h3>
                  {getEstadoBadge(o.estado)}
                </div>

                {o.descripcion && (
                  <p className="text-sm mb-1 line-clamp-2" style={{ color: 'hsl(var(--portal-muted-foreground) / 0.8)' }}>
                    {o.descripcion}
                  </p>
                )}

                <div className="text-xs space-x-2" style={{ color: 'hsl(var(--portal-muted-foreground) / 0.7)' }}>
                  <span>{formatDate(o.createdAt)}</span>
                  {o.medicoNombre && <span>· Dr/a. {o.medicoNombre}</span>}
                  {o.tipo === 'laboratorio' && <span style={{ color: 'hsl(var(--portal-primary))' }}>Laboratorio</span>}
                  {o.tipo === 'imagen' && <span style={{ color: 'hsl(var(--portal-accent))' }}>Imagen</span>}
                </div>

                {o.estado === 'completada' && o.resultadoUrl && (
                  <a
                    href={o.resultadoUrl}
                    target="_blank"
                    className="mt-2 inline-flex items-center gap-1 text-sm font-medium"
                    style={{
                      color: hoverVerResultado === o.id ? 'hsl(var(--portal-primary) / 0.8)' : 'hsl(var(--portal-primary))',
                      transition: 'color 200ms ease-out',
                    }}
                    onMouseEnter={() => setHoverVerResultado(o.id)}
                    onMouseLeave={() => setHoverVerResultado(null)}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Ver resultado
                  </a>
                )}

                {o.observaciones && (
                  <p
                    className="mt-2 text-sm rounded-xl p-2"
                    style={{
                      color: 'hsl(var(--portal-muted-foreground))',
                      background: 'hsl(var(--portal-muted))',
                    }}
                  >
                    <strong>Observaciones: </strong>
                    {o.observaciones}
                  </p>
                )}
              </div>
            </div>
          </PortalCard>
        ))}
      </div>
    </div>
  );
}
