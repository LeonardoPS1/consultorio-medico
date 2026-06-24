/**
 * Portal Órdenes de Estudio Page
 * Lista órdenes de laboratorio/imagen con estado
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Loader2,
  SearchX,
  FlaskConical,
  Image,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react';

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
      return <Image className="h-4 w-4 text-purple-500" />;
    case 'laboratorio':
    default:
      return <FlaskConical className="h-4 w-4 text-blue-500" />;
  }
}

function getEstadoBadge(estado: string) {
  switch (estado) {
    case 'completada':
      return (
        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
          <CheckCircle2 className="h-3 w-3" /> Completada
        </span>
      );
    case 'pendiente':
      return (
        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
          <Clock className="h-3 w-3" /> Pendiente
        </span>
      );
    case 'cancelada':
      return (
        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
          <XCircle className="h-3 w-3" /> Cancelada
        </span>
      );
    default:
      return <span className="text-xs text-gray-500">{estado}</span>;
  }
}

export default function PortalOrdenesEstudioPage() {
  const [ordenes, setOrdenes] = useState<OrdenEstudio[]>([]);
  const [loading, setLoading] = useState(true);

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
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (ordenes.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Órdenes de Estudio</h1>
        <div className="text-center py-16 text-gray-400">
          <FlaskConical className="h-12 w-12 mx-auto mb-3" />
          <p>No tienes órdenes de estudio</p>
          <p className="text-sm mt-2">Cuando tu médico solicite un examen, aparecerá aquí</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Órdenes de Estudio</h1>
      <p className="text-sm text-gray-500 mb-6">
        Exámenes de laboratorio, imagen y otros solicitados
      </p>

      <div className="space-y-3">
        {ordenes.map((o) => (
          <div key={o.id} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
                {getTipoIcon(o.tipo)}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <h3 className="font-medium text-gray-900 truncate">{o.titulo}</h3>
                  {getEstadoBadge(o.estado)}
                </div>

                {o.descripcion && (
                  <p className="text-sm text-gray-600 mb-1 line-clamp-2">{o.descripcion}</p>
                )}

                <div className="text-xs text-gray-400 space-x-2">
                  <span>{formatDate(o.createdAt)}</span>
                  {o.medicoNombre && <span>· Dr/a. {o.medicoNombre}</span>}
                  {o.tipo === 'laboratorio' && <span className="text-blue-500">Laboratorio</span>}
                  {o.tipo === 'imagen' && <span className="text-purple-500">Imagen</span>}
                </div>

                {o.estado === 'completada' && o.resultadoUrl && (
                  <a
                    href={o.resultadoUrl}
                    target="_blank"
                    className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Ver resultado
                  </a>
                )}

                {o.observaciones && (
                  <p className="mt-2 text-sm text-gray-500 bg-gray-50 rounded-lg p-2">
                    <strong>Observaciones: </strong>
                    {o.observaciones}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
