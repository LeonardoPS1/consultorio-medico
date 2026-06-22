/**
 * Portal Encuestas Page
 * Lista y responde encuestas de satisfacción post-consulta
 */

'use client';

import { useState, useEffect } from 'react';
import { Star, MessageSquareText, Loader2, ClipboardCheck } from 'lucide-react';

interface Encuesta {
  id: string;
  titulo: string;
  descripcion: string;
  createdAt: string;
  archivos: Record<string, unknown> | null;
  turnoId: string | null;
  medicoNombre: string | null;
}

function formatDate(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
}

function extractPuntaje(titulo: string): number {
  const match = titulo.match(/(\d+)\/5/);
  return match ? parseInt(match[1], 10) : 0;
}

function StarRating({ puntaje }: { puntaje: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= puntaje ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'
          }`}
        />
      ))}
    </div>
  );
}

export default function PortalEncuestasPage() {
  const [encuestas, setEncuestas] = useState<Encuesta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/portal/encuestas')
      .then((res) => res.json())
      .then((data) => {
        setEncuestas(Array.isArray(data) ? data : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (encuestas.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Mis Encuestas</h1>
        <div className="text-center py-16 text-gray-400">
          <ClipboardCheck className="h-12 w-12 mx-auto mb-3" />
          <p>No tienes encuestas registradas</p>
          <p className="text-sm mt-2">
            Después de cada consulta, recibirás una encuesta por WhatsApp para calificar tu atención.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Mis Encuestas</h1>

      <div className="space-y-2">
        {encuestas.map((e) => {
          const puntaje = extractPuntaje(e.titulo);
          return (
            <div
              key={e.id}
              className="bg-white rounded-lg border border-gray-200 p-4"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <StarRating puntaje={puntaje} />
                  <span className="text-sm font-medium text-gray-700">
                    {puntaje}/5
                  </span>
                </div>
                <span className="text-xs text-gray-400 shrink-0">
                  {formatDate(e.createdAt)}
                </span>
              </div>

              {e.medicoNombre && (
                <p className="text-sm text-gray-500 mb-1">
                  Dr/a. {e.medicoNombre}
                </p>
              )}

              {e.descripcion && e.descripcion !== 'Sin comentarios' && (
                <div className="flex items-start gap-1.5 mt-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                  <MessageSquareText className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                  <p>{e.descripcion}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
