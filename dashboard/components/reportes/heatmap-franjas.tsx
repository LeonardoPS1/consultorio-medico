'use client';

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
const DIAS_ABREV = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DIAS_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** Ventana horaria a mostrar */
const HORA_MIN = 8;
const HORA_MAX = 20;

/**
 * Niveles de ocupación (0-1). Cada nivel define el fondo, el borde, el
 * color de texto y la etiqueta para la leyenda. Escala semáforo:
 * verde (disponible) → amarillo → rojo (saturado).
 */
const NIVELES = [
  { max: 0, bg: 'bg-slate-100 dark:bg-slate-800', border: 'border-slate-200 dark:border-slate-700', text: 'text-slate-400 dark:text-slate-500', label: 'Sin turnos' },
  { max: 0.3, bg: 'bg-emerald-200 dark:bg-emerald-800/70', border: 'border-emerald-300/60 dark:border-emerald-700/60', text: 'text-emerald-900 dark:text-emerald-100', label: 'Muy baja' },
  { max: 0.5, bg: 'bg-lime-300 dark:bg-lime-800/70', border: 'border-lime-400/60 dark:border-lime-700/60', text: 'text-lime-950 dark:text-lime-100', label: 'Baja' },
  { max: 0.6, bg: 'bg-yellow-300 dark:bg-yellow-800/70', border: 'border-yellow-400/60 dark:border-yellow-700/60', text: 'text-yellow-950 dark:text-yellow-100', label: 'Media-baja' },
  { max: 0.7, bg: 'bg-amber-400 dark:bg-amber-800/70', border: 'border-amber-500/60 dark:border-amber-700/60', text: 'text-amber-950 dark:text-amber-100', label: 'Media' },
  { max: 0.8, bg: 'bg-orange-400 dark:bg-orange-800/70', border: 'border-orange-500/60 dark:border-orange-700/60', text: 'text-orange-950 dark:text-orange-100', label: 'Media-alta' },
  { max: 0.9, bg: 'bg-orange-500 dark:bg-orange-900/70', border: 'border-orange-600/60 dark:border-orange-800/60', text: 'text-white dark:text-orange-50', label: 'Alta' },
  { max: Infinity, bg: 'bg-red-500 dark:bg-red-900/70', border: 'border-red-600/60 dark:border-red-800/60', text: 'text-white dark:text-red-50', label: 'Saturada' },
];

function nivelDe(valor: number) {
  return NIVELES.find((n) => valor <= n.max) ?? NIVELES[NIVELES.length - 1];
}

function fmtHora(h: number): string {
  return `${h.toString().padStart(2, '0')}:00`;
}

/** Pico de demanda: franja con mayor ocupación normalizada */
function picoDemanda(data: OcupacionReporte) {
  if (!data.franjas.length) return null;
  return data.franjas.reduce((max, f) => (f.ocupacion > max.ocupacion ? f : max), data.franjas[0]);
}

export function HeatmapFranjas({ data, loading }: HeatmapFranjasProps) {
  const grilla: number[][] = useMemo(() => {
    if (!data) return [];
    return construirGrillaOcupacion(data);
  }, [data]);

  const pico = useMemo(() => (data ? picoDemanda(data) : null), [data]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-[110px_repeat(13_42px)] gap-1">
          <div className="col-span-1" />
          {Array.from({ length: 13 }).map((_, i) => (
            <div key={i} className="h-6 w-[42px] bg-muted rounded animate-pulse" />
          ))}
          {Array.from({ length: 7 * 13 }).map((_, i) => (
            <div key={i} className="w-[42px] h-[42px] bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-sm">No hay datos suficientes para calcular la ocupación por franja.</p>
      </div>
    );
  }

  const horas = Array.from({ length: 13 }, (_, i) => HORA_MIN + i);

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto rounded-lg border">
        <div className="min-w-[640px]">
          {/* Header de horas */}
          <div className="grid grid-cols-[110px_repeat(13_42px)] gap-px bg-border">
            <div className="bg-muted/50 flex items-center px-2 text-xs font-medium text-muted-foreground">
              Día
            </div>
            {horas.map((h) => (
              <div key={h} className="bg-muted/50 flex items-center justify-center py-1.5 text-[11px] font-medium text-muted-foreground">
                {fmtHora(h)}
              </div>
            ))}
          </div>

          {/* Filas de días */}
          {DIAS_ORDER.map((dia) => {
            const nombreDia = DIAS_LABEL[dia === 0 ? 6 : dia - 1];
            const activo = data.totalPorDia?.find((t) => t.dia === dia)?.total ?? 0;
            return (
              <div key={dia} className="grid grid-cols-[110px_repeat(13_42px)] gap-px bg-border">
                <div className="bg-background flex flex-col justify-center px-2 py-1">
                  <span className="text-xs font-semibold">{DIAS_ABREV[dia === 0 ? 6 : dia - 1]}</span>
                  <span className="text-[10px] text-muted-foreground" title={`${nombreDia}: ${activo} turnos`}>
                    {activo} turnos
                  </span>
                </div>
                {horas.map((h) => {
                  const valor = grilla[dia]?.[h] ?? 0;
                  const total = data.franjas.find((f) => f.dia === dia && f.hora === h)?.total ?? 0;
                  const nivel = nivelDe(valor);
                  const esPico = pico?.dia === dia && pico?.hora === h && valor > 0;
                  const pct = Math.round(valor * 100);
                  return (
                    <div
                      key={h}
                      className={cn(
                        'h-[42px] flex items-center justify-center border text-[11px] font-semibold tabular-nums transition-colors',
                        nivel.bg,
                        nivel.border,
                        nivel.text,
                        esPico && 'ring-2 ring-primary ring-offset-1',
                      )}
                      title={`${nombreDia} ${fmtHora(h)} · ${total} turnos · ${leyendaCelda(valor)}${esPico ? ' · Pico de demanda' : ''}`}
                    >
                      {valor > 0 ? `${pct}%` : '·'}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-xs font-medium text-muted-foreground mr-1">Ocupación:</span>
        {NIVELES.map((n) => (
          <div key={n.label} className="flex items-center gap-1.5">
            <div className={cn('h-4 w-4 rounded-sm border', n.bg, n.border)} />
            <span className="text-[11px] text-muted-foreground">{n.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function leyendaCelda(valor: number): string {
  if (valor <= 0) return 'Sin turnos';
  return `${nivelDe(valor).label} (${Math.round(valor * 100)}%)`;
}

export default HeatmapFranjas;
