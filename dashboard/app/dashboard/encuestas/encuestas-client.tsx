'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Star,
  StarHalf,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Meh,
  Stethoscope,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Respuesta {
  id: string;
  pacienteNombre: string;
  pacienteApellido: string;
  medicoNombre?: string;
  puntaje: number;
  comentario: string;
  sentimiento?: 'positivo' | 'neutral' | 'negativo';
  sentimientoScore?: number;
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
  return <span title={format(date, "d 'de' MMM 'a las' HH:mm", { locale: es })}>{distancia}</span>;
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
                  {resp.pacienteNombre.charAt(0)}
                  {resp.pacienteApellido.charAt(0)}
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
                <div className="flex items-center gap-2 flex-wrap mt-0.5">
                  {resp.medicoNombre && (
                    <span className="text-xs text-muted-foreground/70 flex items-center gap-1">
                      <Stethoscope className="h-3 w-3" />
                      {resp.medicoNombre}
                    </span>
                  )}
                  {resp.sentimiento && (
                    <Badge
                      variant="outline"
                      className={`
                      text-[10px] px-1.5 py-0 h-4 font-normal
                      ${resp.sentimiento === 'positivo' ? 'text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800' : ''}
                      ${resp.sentimiento === 'neutral' ? 'text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800' : ''}
                      ${resp.sentimiento === 'negativo' ? 'text-red-600 border-red-200 bg-red-50 dark:bg-red-950 dark:text-red-400 dark:border-red-800' : ''}
                    `}
                    >
                      {resp.sentimiento === 'positivo' && (
                        <ThumbsUp className="h-2.5 w-2.5 mr-0.5" />
                      )}
                      {resp.sentimiento === 'neutral' && <Meh className="h-2.5 w-2.5 mr-0.5" />}
                      {resp.sentimiento === 'negativo' && (
                        <ThumbsDown className="h-2.5 w-2.5 mr-0.5" />
                      )}
                      {resp.sentimiento}
                    </Badge>
                  )}
                </div>
                {resp.comentario && resp.comentario !== 'Sin comentarios' && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {resp.comentario}
                  </p>
                )}
                <p className="text-xs text-muted-foreground/60 mt-1">{formatFecha(resp.fecha)}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
