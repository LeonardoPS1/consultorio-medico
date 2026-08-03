'use client';

import { Flame } from 'lucide-react';
import { useMemo } from 'react';
import type { OcupacionReporte } from '@/lib/services/ocupacion-grilla';
import { construirGrillaOcupacion } from '@/lib/services/ocupacion-grilla';
import { cn } from '@/lib/utils';

interface HeatmapFranjasProps {
  data: OcupacionReporte | null;
  loading?: boolean;
}

/** Lunes→Domingo (reordenando el EXTRACT DOW 0=Dom) */
const DIAS_LABEL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const DIAS_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** Ventana horaria a mostrar */
  const HORA_MIN = 8;
  const HORA_MAX = 20;

/**
 * Color de una celda según ocupación 0-1:
 *  ~0.0 → gris claro (sin datos / sub-utilizado)
 *  0.0-0.5 → amarillo → naranja
 *  0.5-1.0 → naranja → rojo → verde (saturado)
 * @param valor
 */
function colorOcupacion(valor: number): string {
  if (valor <= 0) return 'bg-slate-100 dark:bg-slate-800';
  if (valor < 0.35) return 'bg-amber-200 dark:bg-amber-900/50';
  if (valor < 0.55) return 'bg-orange-300 dark:bg-orange-900/50';
  if (valor < 0.75) return 'bg-red-300 dark:bg-red-900/50';
  if (valor < 0.9) return 'bg-red-400 dark:bg-red-800/60';
  return 'bg-emerald-400 dark:bg-emerald-800/60';
}

function colorBorde(valor: number): string {
  if (valor <= 0) return 'border-slate-200 dark:border-slate-700';
  if (valor < 0.55) return 'border-amber-300/50 dark:border-amber-700/50';
  if (valor < 0.75) return 'border-orange-300/50 dark:border-orange-700/50';
  if (valor < 0.9) return 'border-red-300/50 dark:border-red-700/50';
  return 'border-emerald-300/50 dark:border-emerald-700/50';
}

function leyendaCelda(valor: number): string {
  if (valor <= 0) return 'Sin turnos';
  if (valor < 0.35) return `Sub-utilizada (${Math.round(valor * 100)}%)`;
  if (valor < 0.55) return `Modesto (${Math.round(valor * 100)}%)`;
  if (valor < 0.75) return `Media (${Math.round(valor * 100)}%)`;
  if (valor < 0.9) return `Alta (${Math.round(valor * 100)}%)`;
  return `Saturada (${Math.round(valor * 100)}%)`;
}

/**
 *
 * @param root0
 * @param root0.data
 * @param root0.loading
 */
export function HeatmapFranjas({ data, loading }: HeatmapFranjasProps) {
  const grilla: number[][] = useMemo(() => {
    if (!data) return [];
    return construirGrillaOcupacion(data);
  }, [data]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-12 gap-2">
          <div className="col-span-1" />
          {Array.from({ length: HORA_MAX - HORA_MIN + 1 }).map((_, i) => (
            <div key={i} className="text-center text-xs text-muted-foreground font-medium">
              {HORA_MIN + i}:00
            </div>
          ))}
          {Array.from({ length: 7 * (HORA_MAX - HORA_MIN + 1) }).map((_, i) => (
            <div key={i} className="aspect-square rounded bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Flame className="h-8 w-8 mx-auto mb-2 opacity-30" />
        <p>No hay datos suficientes para calcular la ocupación por franja.</p>
      </div>
    );
  }

  const horas = Array.from({ length: HORA_MAX - HORA_MIN + 1 }, (_, i) => HORA_MIN + i);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[450px]">
        {/* Header de horas */}
        <div className="grid grid-cols-[60px_repeat(13,_1fr)] gap-1">
          <div className="text-xs font-medium text-muted-foreground" />
          {horas.map((h) => (
            <div key={h} className="text-center text-xs font-medium text-muted-foreground w-[28px]">
              {h.toString().padStart(2, '0')}:00
            </div>
          ))}
        </div>

        {/* Filas de días */}
{DIAS_ORDER.map((dia) => {
            const nombreDia = DIAS_LABEL[dia === 0 ? 6 : dia - 1];
            const activo = data.totalPorDia?.[dia]?.total ?? 0;
            return (
              <div key={dia} className="grid grid-cols-[60px_repeat(13_28px)] gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground w-10 text-right truncate">{nombreDia}</span>
                  <span className="text-xs text-muted-foreground/60 whitespace-nowrap">{activo} turnos</span>
                </div>
                {horas.map((h) => {
                  const valor = grilla[dia]?.[h] ?? 0;
                  const total = data.franjas.find((f) => f.dia === dia && f.hora === h)?.total ?? 0;
                  return (
                    <div
                      key={`${dia}-${h}`}
                      className={cn(
                        'w-[28px] h-[28px] rounded-md border transition-[filter] hover:brightness-110 flex items-center justify-center',
                        colorOcupacion(valor),
                        colorBorde(valor),
                      )}
                      title={leyendaCelda(valor) + (total > 0 ? ` · ${total} turnos` : '')}
                    >
                      {total > 0 && (
                        <span className="text-[9px] font-medium text-foreground/90">{total}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
      </div>

      {/* Leyenda de colores */}
      <div className="mt-6 p-4 bg-muted/30 rounded-lg border">
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="font-medium">Escala:</span>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded border bg-slate-200 dark:bg-slate-700" />
              <span>Sin datos</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded border bg-amber-200 dark:bg-amber-900/50" />
              <span>Sub-utilizada (0-35%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded border bg-orange-300 dark:bg-orange-900/50" />
              <span>Modesto (35-55%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded border bg-red-300 dark:bg-red-900/50" />
              <span>Media (55-75%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded border bg-red-400 dark:bg-red-800/60" />
              <span>Alta (75-90%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded border bg-emerald-400 dark:bg-emerald-800/60" />
              <span>Saturada (90-100%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HeatmapFranjas;
