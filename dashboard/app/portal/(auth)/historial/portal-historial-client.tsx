/**
 * Portal Historial Client
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

export default function PortalHistorialClient({ historial }: Props) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Historial Médico</h1>

      {historial.length > 0 ? (
        <div className="space-y-3">
          {historial.map((h) => (
            <div key={h.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start gap-3 mb-2">
                <div className="mt-1">
                  {h.tipo === 'consulta' ? (
                    <Stethoscope className="h-5 w-5 text-blue-600" />
                  ) : h.tipo === 'encuesta' ? (
                    <FileText className="h-5 w-5 text-yellow-600" />
                  ) : (
                    <ClipboardList className="h-5 w-5 text-gray-600" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">{h.titulo}</div>
                  <div className="text-sm text-gray-500 mb-2">
                    {formatDate(h.createdAt)} · Dr/a. {h.medicoNombre}
                  </div>
                  {h.descripcion && <p className="text-sm text-gray-600 mb-2">{h.descripcion}</p>}
                  {h.diagnosticoDescripcion && (
                    <div className="inline-block bg-gray-50 rounded-lg px-3 py-1.5 text-sm text-gray-600">
                      <span className="text-gray-400 text-xs">Diagnóstico: </span>
                      {h.diagnosticoCodigo && (
                        <span className="font-mono text-xs bg-gray-200 px-1 rounded mr-1">
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
        <div className="text-center py-12 text-gray-400">
          <ClipboardList className="h-12 w-12 mx-auto mb-3" />
          <p>No tienes historial médico registrado</p>
        </div>
      )}
    </div>
  );
}
