/**
 * Portal Recetas Client
 */

'use client';

import { FileText, Pill, Clock, User } from 'lucide-react';

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
  return new Date(date).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function PortalRecetasClient({ recetas }: Props) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Mis Recetas</h1>

      {recetas.length > 0 ? (
        <div className="space-y-3">
          {recetas.map((r) => (
            <div
              key={r.id}
              className="bg-white rounded-xl border border-gray-200 p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Pill className="h-5 w-5 text-purple-600" />
                  <span className="font-semibold text-gray-900">
                    {r.medicamento}
                  </span>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    r.estado === 'activa'
                      ? 'bg-green-100 text-green-700'
                      : r.estado === 'vencida'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {r.estado}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                <div>
                  <span className="text-gray-500">Dosis:</span>{' '}
                  <span className="font-medium">{r.dosis}</span>
                </div>
                <div>
                  <span className="text-gray-500">Frecuencia:</span>{' '}
                  <span className="font-medium">{r.frecuencia}</span>
                </div>
                <div>
                  <span className="text-gray-500">Duración:</span>{' '}
                  <span className="font-medium">{r.duracion}</span>
                </div>
                <div>
                  <span className="text-gray-500">Inicio:</span>{' '}
                  <span className="font-medium">{formatDate(r.fechaInicio)}</span>
                </div>
              </div>

              {r.indicaciones && (
                <div className="bg-gray-50 rounded-lg p-3 mb-3 text-sm text-gray-600">
                  <strong>Indicaciones:</strong> {r.indicaciones}
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-gray-400">
                <User className="h-3 w-3" />
                Dr/a. {r.medicoNombre} · {r.medicoEspecialidad}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-400">
          <FileText className="h-12 w-12 mx-auto mb-3" />
          <p>No tenés recetas registradas</p>
        </div>
      )}
    </div>
  );
}
