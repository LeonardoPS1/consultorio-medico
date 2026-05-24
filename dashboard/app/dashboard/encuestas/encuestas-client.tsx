'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, StarHalf, MessageSquare } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Respuesta {
  id: string;
  pacienteNombre: string;
  pacienteApellido: string;
  puntaje: number;
  comentario: string;
  fecha: string;
}

function StarRating({ puntaje }: { puntaje: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        if (star <= puntaje) {
          return <Star key={star} className="h-4 w-4 fill-amber-400 text-amber-400" />;
        }
        if (star - 0.5 <= puntaje) {
          return <StarHalf key={star} className="h-4 w-4 fill-amber-400 text-amber-400" />;
        }
        return <Star key={star} className="h-4 w-4 text-gray-300 dark:text-gray-600" />;
      })}
    </div>
  );
}

function formatFecha(fecha: string) {
  const date = new Date(fecha);
  const distancia = formatDistanceToNow(date, { addSuffix: true, locale: es });
  return (
    <span title={format(date, "d 'de' MMM 'a las' HH:mm", { locale: es })}>
      {distancia}
    </span>
  );
}

export function EncuestasClient({ respuestas }: { respuestas: Respuesta[] }) {
  if (respuestas.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Respuestas Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquare className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">Todavía no hay respuestas de encuestas</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Las respuestas aparecerán aquí cuando los pacientes califiquen su atención
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">
          Respuestas Recientes ({respuestas.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {respuestas.map((resp) => (
            <div
              key={resp.id}
              className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              {/* Avatar */}
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-primary">
                  {resp.pacienteNombre.charAt(0)}{resp.pacienteApellido.charAt(0)}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">
                    {resp.pacienteNombre} {resp.pacienteApellido}
                  </span>
                  <StarRating puntaje={resp.puntaje} />
                </div>
                {resp.comentario && resp.comentario !== 'Sin comentarios' && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {resp.comentario}
                  </p>
                )}
                <p className="text-xs text-muted-foreground/60 mt-1">
                  {formatFecha(resp.fecha)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
