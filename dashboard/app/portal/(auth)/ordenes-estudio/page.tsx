/**
 * Portal Órdenes de Estudio Page
 * Lista órdenes de laboratorio/imagen con estado
 */

'use client';

import {
  FileText,
  FlaskConical,
  Image,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { PortalBadge } from '@/components/portal/portal-badge';
import { PortalCard } from '@/components/portal/portal-card';
import { PortalSkeleton } from '@/components/portal/portal-skeleton';
import { AvatarInitials } from '@/components/portal/avatar-initials';

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

function getTipoChip(tipo: string) {
  if (tipo === 'laboratorio') {
    return (
      <PortalBadge variant="primary" className="text-[11px]">
        Laboratorio
      </PortalBadge>
    );
  }
  return (
    <PortalBadge variant="primary" className="text-[11px]">
      Imagen
    </PortalBadge>
  );
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
      return (
        <PortalBadge variant="muted" className="flex items-center gap-1">
          {estado}
        </PortalBadge>
      );
  }
}

/**
 *
 */
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
        <h1 className="text-[20px] font-semibold tracking-[0.01em] mb-6 text-portal-fg">Órdenes de Estudio</h1>
        <div className="text-center py-16 text-portal-muted-fg/70">
          <div className="rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3 bg-portal-muted">
            <FlaskConical className="h-6 w-6 text-portal-muted-fg" />
          </div>
          <p>No tienes órdenes de estudio</p>
          <p className="text-sm mt-2">Cuando tu médico solicite un examen, aparecerá aquí</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-[20px] font-semibold tracking-[0.01em] mb-1 text-portal-fg">Órdenes de Estudio</h1>
      <p className="text-sm mb-6 text-portal-muted-fg">
        Exámenes de laboratorio, imagen y otros solicitados
      </p>

      <div className="space-y-3">
        {ordenes.map((o) => (
          <PortalCard key={o.id} hover className="flex items-start gap-3">
            <div className="flex items-start gap-3">
              <div
                className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-portal-muted"
              >
                {o.tipo === 'imagen' ? (
                  <Image className="h-5 w-5 text-portal-primary" />
                ) : (
                  <FlaskConical className="h-5 w-5 text-portal-primary" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
                  <h3 className="font-medium truncate text-portal-fg">{o.titulo}</h3>
                  <div className="flex items-center gap-2">
                    {getEstadoBadge(o.estado)}
                    {getTipoChip(o.tipo)}
                  </div>
                </div>

                {o.descripcion && (
                  <p className="text-sm mb-1 line-clamp-2 text-portal-muted-fg/80">
                    {o.descripcion}
                  </p>
                )}

                <div className="text-xs space-x-2 text-portal-muted-fg/70">
                  <span>{formatDate(o.createdAt)}</span>
                  {o.medicoNombre && <span>· Dr/a. {o.medicoNombre}</span>}
                </div>

                {o.estado === 'completada' && o.resultadoUrl && (
                  <a
                    href={o.resultadoUrl}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-sm font-medium px-3 py-1.5 h-9 mt-2 rounded-full bg-white text-portal-fg border border-portal-border hover:bg-portal-muted transition-all duration-200"
                    rel="noreferrer"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Ver resultado
                  </a>
                )}

                {o.observaciones && (
                  <p className="mt-2 text-sm rounded-xl p-2 text-portal-muted-fg bg-portal-muted">
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
