'use client';

import { CalendarRange, Flame } from 'lucide-react';
import { useMemo, useState, type JSX } from 'react';
import type { FranjaOcupacion, OcupacionReporte } from '@/lib/services/ocupacion-grilla';
import { DIAS_LABEL, DIAS_ABREV, HORA_MIN, HORA_MAX, labelSemanas } from '@/lib/services/ocupacion-grilla';
import { cn } from '@/lib/utils';
import { KPIsOcupacion } from './kpis-ocupacion';
import { PanelDetalleFranja } from './panel-detalle-franja';
import { RecomendacionesOcupacion } from './recomendaciones-ocupacion';
import { TendenciasOcupacion } from './tendencias-ocupacion';

interface HeatmapFranjasProps {
  data: OcupacionReporte | null;
  loading?: boolean;
}

/** Lunes→Domingo (reordenando el EXTRACT DOW 0=Dom) */
const DIAS_ORDER = [1, 2, 3, 4, 5, 6, 0];

/**
 * Niveles de ocupación (0-1). Gradiente semántico legible:
 * baja → media → alta → saturada. Celda coloreada según nivel.
 */
const NIVELES = [
  {
    min: 0,
    max: 0.3,
    label: 'Baja',
    cell: 'bg-emerald-400/30 dark:bg-emerald-500/30 text-emerald-900 dark:text-emerald-100 hover:bg-emerald-400/45',
    dot: 'bg-emerald-400 dark:bg-emerald-500',
    desc: 'Mucha disponibilidad',
  },
  {
    min: 0.3,
    max: 0.6,
    label: 'Media',
    cell: 'bg-amber-400/40 dark:bg-amber-500/40 text-amber-900 dark:text-amber-100 hover:bg-amber-400/55',
    dot: 'bg-amber-400 dark:bg-amber-500',
    desc: 'Demanda normal',
  },
  {
    min: 0.6,
    max: 0.85,
    label: 'Alta',
    cell: 'bg-orange-500/45 dark:bg-orange-500/45 text-orange-900 dark:text-orange-100 hover:bg-orange-500/60',
    dot: 'bg-orange-500',
    desc: 'Pocos horarios disponibles',
  },
  {
    min: 0.85,
    max: Infinity,
    label: 'Saturada',
    cell: 'bg-rose-600/55 dark:bg-rose-600/55 text-rose-100 hover:bg-rose-600/70',
    dot: 'bg-rose-600',
    desc: 'La franja se llena casi siempre',
  },
];

function nivelDe(valor: number): (typeof NIVELES)[number] {
  return NIVELES.find((n) => valor > n.min && valor <= n.max) ?? NIVELES[NIVELES.length - 1];
}

function fmtHora(h: number): string {
  return `${h.toString().padStart(2, '0')}:00`;
}

function franjaDe(data: OcupacionReporte, dia: number, hora: number): FranjaOcupacion {
  return (
    data.franjas.find((f) => f.dia === dia && f.hora === hora) ?? {
      dia,
      hora,
      total: 0,
      ocupacion: 0,
    }
  );
}

/**
 * Mapa de calor de ocupación por día y horario con KPIs y panel de detalle.
 * @param {HeatmapFranjasProps} root0 - Props del componente.
 * @param {OcupacionReporte | null} root0.data - Reporte de ocupación por franja horaria.
 * @param {boolean} root0.loading - Si está cargando los datos.
 * @returns {JSX.Element} El heatmap con KPIs, tendencias y recomendaciones.
 */
export function HeatmapFranjas({ data, loading }: HeatmapFranjasProps): JSX.Element {
  const [seleccion, setSeleccion] = useState<{ dia: number; hora: number } | null>(null);

  const horas = useMemo(
    () => Array.from({ length: HORA_MAX - HORA_MIN + 1 }, (_, i) => HORA_MIN + i),
    [],
  );

  /** Celda con más turnos como selección inicial */
  const seleccionInicial = useMemo(() => {
    if (!data || !data.franjas.length) return null;
    const top = data.franjas.reduce((max, f) => (f.total > max.total ? f : max), data.franjas[0]);
    return { dia: top.dia, hora: top.hora };
  }, [data]);

  const seleccionActiva = seleccion ?? seleccionInicial;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            // eslint-disable-next-line react/no-array-index-key -- esqueletos estáticos de carga sin identidad propia
            <div key={i} className="rounded-xl border p-4 space-y-2 animate-pulse">
              <div className="h-3 w-24 bg-muted rounded" />
              <div className="h-7 w-32 bg-muted rounded" />
            </div>
          ))}
        </div>
        <div className="rounded-xl border p-4 animate-pulse">
          <div className="h-4 w-48 bg-muted rounded mb-4" />
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: 91 }).map((_, i) => (
              // eslint-disable-next-line react/no-array-index-key -- esqueletos estáticos de carga sin identidad propia
              <div key={i} className="h-10 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data || !data.franjas.length) {
    return (
      <div className="rounded-xl border py-12 text-center">
        <Flame className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">
          No hay datos suficientes para calcular la ocupación por franja.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs ejecutivos */}
      <KPIsOcupacion data={data} />

      <p className="text-xs text-muted-foreground -mb-3">
        {data.totalTurnos.toLocaleString('es-ES')} turnos analizados en {labelSemanas(data.semanas)}.
      </p>

      {/* Heatmap + panel de detalle */}
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="rounded-xl border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <CalendarRange className="h-4 w-4 text-primary" />
              Ocupación por día y horario
            </h3>
          </div>

          <div
            role="grid"
            aria-label="Mapa de calor de ocupación por día y horario"
            className="overflow-x-auto"
          >
            <div className="grid grid-cols-[3.5rem_repeat(7,1fr)] gap-1.5 min-w-[520px]">
              {/* Cabecera de días */}
              <div className="text-xs font-medium text-muted-foreground" />
              {DIAS_ORDER.map((d) => (
                <div
                  key={d}
                  className="text-center text-xs font-semibold text-foreground"
                  aria-hidden
                >
                  {DIAS_ABREV[d]}
                </div>
              ))}

              {horas.map((h) => (
                <div key={h} role="row" className="contents">
                  <div
                    role="gridcell"
                    aria-label={fmtHora(h)}
                    className="text-right text-xs font-medium tabular-nums text-muted-foreground pr-1 flex items-center justify-end"
                  >
                    {fmtHora(h)}
                  </div>
                  {DIAS_ORDER.map((d) => {
                    const f = franjaDe(data, d, h);
                    const nivel = nivelDe(f.ocupacion);
                    const activo = seleccionActiva?.dia === d && seleccionActiva?.hora === h;
                    return (
                      <button
                        key={`${d}-${h}`}
                        type="button"
                        role="gridcell"
                        onClick={() => setSeleccion({ dia: d, hora: h })}
                        aria-pressed={activo}
                        aria-label={`${DIAS_LABEL[d]} ${fmtHora(h)}, ${f.total} turnos, nivel ${nivel.label}`}
                        title={`${DIAS_LABEL[d]} ${fmtHora(h)} · ${f.total} turnos · ${nivel.label}`}
                        className={cn(
                          'rounded-md h-10 flex items-center justify-center text-xs font-semibold tabular-nums transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          f.total > 0 ? nivel.cell : 'bg-muted/50 text-muted-foreground hover:bg-muted',
                          activo && 'ring-2 ring-primary ring-offset-1 ring-offset-background',
                        )}
                      >
                        {f.total > 0 ? f.total : ''}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Leyenda */}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5">
            {NIVELES.map((n) => (
              <div key={n.label} className="flex items-center gap-1.5">
                <span className={cn('h-2.5 w-2.5 rounded-full', n.dot)} />
                <span className="text-xs text-muted-foreground">{n.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Panel de detalle de la franja seleccionada */}
        <PanelDetalleFranja
          data={data}
          dia={seleccionActiva?.dia ?? null}
          hora={seleccionActiva?.hora ?? null}
        />
      </div>

      {/* Tendencias + recomendaciones */}
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <TendenciasOcupacion data={data} />
        <RecomendacionesOcupacion data={data} />
      </div>
    </div>
  );
}

export default HeatmapFranjas;
