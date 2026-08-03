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
const CELL_SIZE = 36;

/**
 * Color de una celda según ocupación 0-1:
 *  0.0 → verde (libre/disponible)
 *  0.0-0.3 → verde claro
 *  0.3-0.5 → amarillo
 *  0.5-0.7 → naranja
 *  0.7-0.85 → naranja oscuro
 *  0.85-1.0 → rojo (saturado)
 */
function colorOcupacion(valor: number): string {
  if (valor <= 0) return 'bg-slate-100 dark:bg-slate-800';
  if (valor < 0.3) return 'bg-emerald-200 dark:bg-emerald-800/60';
  if (valor < 0.5) return 'bg-lime-300 dark:bg-lime-800/60';
  if (valor < 0.6) return 'bg-yellow-300 dark:bg-yellow-800/60';
  if (valor < 0.7) return 'bg-amber-400 dark:bg-amber-800/60';
  if (valor < 0.8) return 'bg-orange-400 dark:bg-orange-800/60';
  if (valor < 0.9) return 'bg-orange-500 dark:bg-orange-900/60';
  return 'bg-red-500 dark:bg-red-900/60';
}

function colorBorde(valor: number): string {
  if (valor <= 0) return 'border-slate-200 dark:border-slate-700';
  if (valor < 0.3) return 'border-emerald-300/50 dark:border-emerald-700/50';
  if (valor < 0.5) return 'border-lime-300/50 dark:border-lime-700/50';
  if (valor < 0.6) return 'border-yellow-300/50 dark:border-yellow-700/50';
  if (valor < 0.7) return 'border-amber-400/50 dark:border-amber-800/50';
  if (valor < 0.8) return 'border-orange-400/50 dark:border-orange-800/50';
  if (valor < 0.9) return 'border-orange-500/50 dark:border-orange-900/50';
  return 'border-red-500/50 dark:border-red-900/50';
}

function leyendaCelda(valor: number): string {
  if (valor <= 0) return 'Sin turnos';
  if (valor < 0.3) return `Muy baja (${Math.round(valor * 100)}%)`;
  if (valor < 0.5) return `Baja (${Math.round(valor * 100)}%)`;
  if (valor < 0.6) return `Media-baja (${Math.round(valor * 100)}%)`;
  if (valor < 0.7) return `Media (${Math.round(valor * 100)}%)`;
  if (valor < 0.8) return `Media-alta (${Math.round(valor * 100)}%)`;
  if (valor < 0.9) return `Alta (${Math.round(valor * 100)}%)`;
  return `Saturada (${Math.round(valor * 100)}%)`;
}

/** Formato hora: "08:00" */
function fmtHora(h: number): string {
  return `${h.toString().padStart(2, '0')}:00`;
}

export function HeatmapFranjas({ data, loading }: HeatmapFranjasProps) {
  const grilla: number[][] = useMemo(() => {
    if (!data) return [];
    return construirGrillaOcupacion(data);
  }, [data]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-[60px_repeat(13_36px)] gap-1">
          <div className="col-span-1" />
          {Array.from({ length: 13 }).map((_, i) => (
            <div key={i} className="h-8 w-[36px] bg-muted rounded animate-pulse" />
          ))}
          {Array.from({ length: 7 * 13 }).map((_, i) => (
            <div key={i} className="w-[36px] h-[36px] bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Flame className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">No hay datos suficientes para calcular la ocupación por franja.</p>
      </div>
    );
  }

  const horas = Array.from({ length: 13 }, (_, i) => HORA_MIN + i);

  return (
    <div className="space-y-6">
      {/* Header con título */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Ocupación por franja horaria (últimas 12 semanas)</h3>
        <span className="text-xs text-muted-foreground">Verde = disponible · Rojo = saturado</span>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[520px]">
          {/* Header de horas */}
          <div className="grid grid-cols-[72px_repeat(13_36px)] gap-1 mb-1">
            <div className="text-xs font-medium text-muted-foreground text-right pr-2">Día / Hora</div>
            {Array.from({ length: 13 }).map((_, i) => (
              <div key={i} className="text-center text-xs font-medium text-muted-foreground w-[36px]">
                {fmtHora(HORA_MIN + i)}
              </div>
            ))}
          </div>

          {/* Filas de días */}
          <div className="grid gap-1">
            {DIAS_ORDER.map((dia) => {
              const nombreDia = DIAS_LABEL[dia === 0 ? 6 : dia - 1];
              const activo = data.totalPorDia?.[dia]?.total ?? 0;
              return (
                <div key={dia} className="grid grid-cols-[72px_repeat(13_36px)] gap-1">
                  <div className="flex items-center justify-between px-2 text-xs text-muted-foreground">
                    <span className="font-medium w-auto truncate max-w-[60px]">{nombreDia}</span>
                    <span className="text-muted-foreground/60 whitespace-nowrap">{activo} turnos</span>
                  </div>
                  {Array.from({ length: 13 }).map((_, i) => {
                    const h = HORA_MIN + i;
                    const valor = grilla[dia]?.[h] ?? 0;
                    const total = data.franjas.find((f) => f.dia === dia && f.hora === h)?.total ?? 0;
                    return (
                      <div
                        key={`${dia}-${h}`}
                        className={cn(
                          'w-[36px] h-[36px] rounded border transition-all duration-150 hover:scale-[1.02] hover:shadow-md flex items-center justify-center cursor-default',
                          colorOcupacion(valor),
                        )}
                        title={`${leyendaCelda(valor)}${total > 0 ? ` · ${total} turnos` : ''}`}
                      >
                        {total > 0 && (
                          <span className="text-[11px] font-semibold text-white/95 drop-shadow-sm">
                            {total}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Leyenda compacta vertical */}
      <div className="bg-muted/30 rounded-lg border p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
          <LegendItem color="bg-slate-100 dark:bg-slate-800" border="border-slate-200 dark:border-slate-700" label="Sin datos" />
          <LegendItem color="bg-emerald-200 dark:bg-emerald-800/60" border="border-emerald-300/50" label="Muy baja (0-30%)" />
          <LegendItem color="bg-lime-300 dark:bg-lime-800/60" border="border-lime-300/50" label="Baja (30-50%)" />
          <LegendItem color="bg-yellow-300 dark:bg-yellow-800/60" border="border-yellow-300/50" label="Media-baja (50-60%)" />
          <LegendItem color="bg-amber-400 dark:bg-amber-800/60" border="border-amber-400/50" label="Media (60-70%)" />
          <LegendItem color="bg-orange-500 dark:bg-orange-900/60" border="border-orange-500/50" label="Alta (80-90%)" />
          <LegendItem color="bg-red-500 dark:bg-red-900/60" border="border-red-500/50" label="Saturada (90-100%)" />
        </div>
      </div>
    </div>
  );
}

function LegendItem({ color, border, label }: { color: string; border: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn('w-6 h-6 rounded border', color, border)} />
      <span className="text-xs text-muted-foreground whitespace-nowrap">{label}</span>
    </div>
  );
}

export default HeatmapFranjas;