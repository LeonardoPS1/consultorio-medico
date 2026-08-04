'use client';

import { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { CalendarDays, Clock, Flame } from 'lucide-react';
import type { OcupacionReporte } from '@/lib/services/ocupacion-grilla';
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
 * Niveles de ocupación (0-1). Escala semántica simplificada y legible:
 * baja → media → alta → saturada. Usa gradiente de intensidad en lugar de
 * arcoíris de colores para que el dato se lea de un vistazo.
 */
const NIVELES = [
  {
    min: 0,
    max: 0.3,
    label: 'Baja',
    bar: 'bg-emerald-400 dark:bg-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
    dot: 'bg-emerald-400 dark:bg-emerald-500',
    desc: 'Hay mucha disponibilidad de horarios',
  },
  {
    min: 0.3,
    max: 0.6,
    label: 'Media',
    bar: 'bg-amber-400 dark:bg-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
    dot: 'bg-amber-400 dark:bg-amber-500',
    desc: 'Demanda normal de horarios',
  },
  {
    min: 0.6,
    max: 0.85,
    label: 'Alta',
    bar: 'bg-orange-500 dark:bg-orange-500',
    text: 'text-orange-600 dark:text-orange-400',
    dot: 'bg-orange-500',
    desc: 'Quedan pocos horarios disponibles',
  },
  {
    min: 0.85,
    max: Infinity,
    label: 'Saturada',
    bar: 'bg-rose-600 dark:bg-rose-600',
    text: 'text-rose-600 dark:text-rose-400',
    dot: 'bg-rose-600',
    desc: 'La franja se llena casi siempre',
  },
];

function nivelDe(valor: number) {
  return NIVELES.find((n) => valor > n.min && valor <= n.max) ?? NIVELES[NIVELES.length - 1];
}

function fmtHora(h: number): string {
  return `${h.toString().padStart(2, '0')}:00`;
}

function indiceDia(dia: number): number {
  return dia === 0 ? 6 : dia - 1;
}

export function HeatmapFranjas({ data, loading }: HeatmapFranjasProps) {
  const reduceMotion = useReducedMotion();

  const horas = useMemo(
    () => Array.from({ length: HORA_MAX - HORA_MIN + 1 }, (_, i) => HORA_MIN + i),
    [],
  );

  /** Datos del día seleccionado, indexados por hora */
  const diaSeleccionado = useState<number | null>(null);
  const [dia, setDia] = diaSeleccionado;

  /** Día con más turnos: default de la vista */
  const diaInicial = useMemo(() => {
    if (!data) return 1;
    const top = [...data.totalPorDia].sort((a, b) => b.total - a.total)[0];
    return top && top.total > 0 ? top.dia : 1;
  }, [data]);

  const diaActivo = dia ?? diaInicial;

  const franjasPorDia = useMemo(() => {
    if (!data) return [];
    return horas.map((h) => {
      const f = data.franjas.find((x) => x.dia === diaActivo && x.hora === h);
      return f ?? { dia: diaActivo, hora: h, total: 0, ocupacion: 0 };
    });
  }, [data, diaActivo, horas]);

  const picoGlobal = useMemo(() => {
    if (!data || !data.franjas.length) return null;
    return data.franjas.reduce((max, f) => (f.ocupacion > max.ocupacion ? f : max), data.franjas[0]);
  }, [data]);

  const picoDiaActivo = useMemo(() => {
    const conTurnos = franjasPorDia.filter((f) => f.total > 0);
    if (!conTurnos.length) return null;
    return conTurnos.reduce((max, f) => (f.ocupacion > max.ocupacion ? f : max), conTurnos[0]);
  }, [franjasPorDia]);

  const maxTotalDia = useMemo(
    () => Math.max(...(data?.totalPorDia.map((t) => t.total) ?? []), 1),
    [data],
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-xl border p-4 space-y-2 animate-pulse">
              <div className="h-3 w-24 bg-muted rounded" />
              <div className="h-7 w-32 bg-muted rounded" />
            </div>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {DIAS_ABREV.map((d) => (
            <div key={d} className="h-9 w-12 shrink-0 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="rounded-xl border p-4 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-5 bg-muted rounded-full animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
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
      {/* Insights principales */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2">
            <Flame className="h-3.5 w-3.5 text-rose-500" />
            Hora pico de la semana
          </div>
          {picoGlobal ? (
            <>
              <p className="text-xl font-bold">
                {DIAS_LABEL[indiceDia(picoGlobal.dia)]} {fmtHora(picoGlobal.hora)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {picoGlobal.total} turnos · {Math.round(picoGlobal.ocupacion * 100)}% de ocupación
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Sin datos</p>
          )}
        </div>

        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2">
            <CalendarDays className="h-3.5 w-3.5 text-primary" />
            Día con más demanda
          </div>
          <p className="text-xl font-bold">
            {DIAS_LABEL[indiceDia(diaInicial)]}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {data.totalPorDia.find((t) => t.dia === diaInicial)?.total ?? 0} turnos en la ventana
          </p>
        </div>
      </div>

      {/* Selector de día */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Elegí un día</p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {DIAS_ORDER.map((d) => {
            const total = data.totalPorDia.find((t) => t.dia === d)?.total ?? 0;
            const activo = d === diaActivo;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setDia(d)}
                className={cn(
                  'shrink-0 rounded-lg border px-3 py-2 text-left transition-colors cursor-pointer',
                  activo
                    ? 'border-primary/40 bg-primary/10 text-primary'
                    : 'bg-card hover:bg-muted/60 text-foreground',
                )}
                aria-pressed={activo}
              >
                <span className="block text-sm font-semibold leading-tight">{DIAS_ABREV[indiceDia(d)]}</span>
                <span className={cn('block text-[11px] leading-tight', activo ? 'text-primary/80' : 'text-muted-foreground')}>
                  {total} turnos
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Demanda del día seleccionado */}
      <div className="rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Demanda de {DIAS_LABEL[indiceDia(diaActivo)]}
            </h3>
            <p className="text-xs text-muted-foreground">
              {data.totalPorDia.find((t) => t.dia === diaActivo)?.total ?? 0} turnos en la ventana · franja más alta:
              {picoDiaActivo ? ` ${fmtHora(picoDiaActivo.hora)} (${Math.round(picoDiaActivo.ocupacion * 100)}%)` : ' —'}
            </p>
          </div>
        </div>

        <div className="space-y-2.5">
          {franjasPorDia.map((f, idx) => {
            const nivel = nivelDe(f.ocupacion);
            const esPico = picoDiaActivo?.hora === f.hora && f.total > 0;
            const pct = Math.round(f.ocupacion * 100);
            return (
              <motion.div
                key={f.hora}
                initial={reduceMotion ? false : { opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.18, delay: reduceMotion ? 0 : idx * 0.03, ease: 'easeOut' }}
                className="flex items-center gap-3 min-h-[40px]"
                title={`${DIAS_LABEL[indiceDia(diaActivo)]} ${fmtHora(f.hora)} · ${f.total} turnos · ${nivel.label}`}
              >
                <span className="w-11 shrink-0 text-right text-xs font-medium tabular-nums text-muted-foreground">
                  {fmtHora(f.hora)}
                </span>

                <div className="flex-1 relative h-5 rounded-full bg-muted/70 overflow-hidden">
                  <motion.div
                    className={cn('absolute inset-y-0 left-0 rounded-full', nivel.bar)}
                    initial={reduceMotion ? false : { scaleX: 0 }}
                    animate={{ scaleX: f.total > 0 ? pct / 100 : 0 }}
                    transition={{ duration: 0.35, delay: reduceMotion ? 0 : idx * 0.03, ease: 'easeOut' }}
                    style={{ transformOrigin: 'left' }}
                  />
                </div>

                <div className="flex items-center gap-2 w-[104px] shrink-0 justify-end">
                  {esPico && <Flame className="h-3.5 w-3.5 text-rose-500 shrink-0" aria-label="Pico" />}
                  <span className={cn('text-xs font-bold tabular-nums', f.total > 0 ? nivel.text : 'text-muted-foreground')}>
                    {f.total > 0 ? `${pct}%` : '—'}
                  </span>
                  <span className="text-[11px] tabular-nums text-muted-foreground w-8 text-right">
                    {f.total}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Vista semanal */}
      <div className="rounded-xl border bg-card p-4">
        <h3 className="text-base font-semibold mb-4">Demanda semanal</h3>
        <div className="space-y-3">
          {DIAS_ORDER.map((d) => {
            const total = data.totalPorDia.find((t) => t.dia === d)?.total ?? 0;
            const pct = (total / maxTotalDia) * 100;
            const activo = d === diaActivo;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setDia(d)}
                className={cn(
                  'block w-full text-left rounded-lg px-1 py-0.5 transition-colors cursor-pointer',
                  activo && 'bg-muted/60',
                )}
              >
                <div className="flex items-center gap-3">
                  <span className={cn('w-9 shrink-0 text-sm font-medium', activo ? 'text-primary' : 'text-foreground')}>
                    {DIAS_ABREV[indiceDia(d)]}
                  </span>
                  <div className="flex-1 relative h-4 rounded-full bg-muted/70 overflow-hidden">
                    <motion.div
                      className={cn('absolute inset-y-0 left-0 rounded-full', activo ? 'bg-primary' : 'bg-primary/30')}
                      initial={reduceMotion ? false : { scaleX: 0 }}
                      animate={{ scaleX: pct / 100 }}
                      transition={{ duration: 0.35, delay: reduceMotion ? 0 : DIAS_ORDER.indexOf(d) * 0.03, ease: 'easeOut' }}
                      style={{ transformOrigin: 'left' }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right text-xs font-semibold tabular-nums text-muted-foreground">
                    {total}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Leyenda */}
      <div className="rounded-xl border bg-card p-4">
        <p className="text-xs font-medium text-muted-foreground mb-3">
          ¿Cómo leer el nivel de ocupación?
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {NIVELES.map((n) => (
            <div key={n.label} className="flex items-start gap-2.5">
              <span className={cn('mt-1 h-3 w-3 shrink-0 rounded-full', n.dot)} />
              <div>
                <p className={cn('text-sm font-semibold leading-tight', n.text)}>{n.label}</p>
                <p className="text-xs text-muted-foreground">{n.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default HeatmapFranjas;
