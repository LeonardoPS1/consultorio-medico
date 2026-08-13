'use client';

import { Flame, CalendarDays, TrendingUp, TrendingDown } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import type { JSX } from 'react';
import type { OcupacionReporte } from '@/lib/services/ocupacion-grilla';
import { DIAS_ABREV } from '@/lib/services/ocupacion-grilla';
import { cn } from '@/lib/utils';

interface KPIsOcupacionProps {
  data: OcupacionReporte;
}

const kpiCards = [
  {
    key: 'ocupacionGeneral',
    label: 'Ocupación general',
    icon: TrendingUp,
    iconColor: 'text-emerald-500',
    format: (d: OcupacionReporte): string =>
      d.resumen ? `${Math.round(d.resumen.ocupacionGeneral * 100)}%` : '\u2014',
    subtitle: 'promedio de todas las franjas',
  },
  {
    key: 'pico',
    label: 'Hora pico',
    icon: Flame,
    iconColor: 'text-rose-500',
    format: (d: OcupacionReporte): string =>
      d.resumen?.franjaPico?.ocupacion
        ? `${DIAS_ABREV[d.resumen.franjaPico.dia]} ${d.resumen.franjaPico.hora.toString().padStart(2, '0')}:00`
        : '\u2014',
    subtitle: (d: OcupacionReporte): string =>
      d.resumen?.franjaPico?.ocupacion
        ? `${Math.round(d.resumen.franjaPico.ocupacion * 100)}% ocupación`
        : '',
  },
  {
    key: 'floja',
    label: 'Franja más disponible',
    icon: CalendarDays,
    iconColor: 'text-blue-500',
    format: (d: OcupacionReporte): string =>
      d.resumen?.franjaMasFloja?.ocupacion !== undefined
        ? `${DIAS_ABREV[d.resumen.franjaMasFloja.dia]} ${d.resumen.franjaMasFloja.hora.toString().padStart(2, '0')}:00`
        : '\u2014',
    subtitle: (d: OcupacionReporte): string =>
      d.resumen?.franjaMasFloja?.ocupacion !== undefined
        ? `${Math.round(d.resumen.franjaMasFloja.ocupacion * 100)}% ocupación`
        : '',
  },
  {
    key: 'tendencia',
    label: 'Tendencia',
    icon: TrendingUp,
    iconColor: '',
    format: (d: OcupacionReporte): string => {
      const v = d.resumen?.tendenciaVsAnterior ?? 0;
      const positivo = v >= 0;
      return positivo ? `+${Math.round(v * 100)}%` : `${Math.round(v * 100)}%`;
    },
    subtitle: 'vs período anterior',
    valueColor: (d: OcupacionReporte): string => {
      const v = d.resumen?.tendenciaVsAnterior ?? 0;
      return v >= 0 ? 'text-emerald-600' : 'text-rose-600';
    },
  },
];

/**
 * KPIs resumen de ocupación por franja horaria.
 * @param {KPIsOcupacionProps} root0 - Props del componente.
 * @param {OcupacionReporte} root0.data - Reporte de ocupación con resumen de franjas.
 * @returns {JSX.Element} Las tarjetas de KPIs de ocupación.
 */
export function KPIsOcupacion({ data }: KPIsOcupacionProps): JSX.Element {
  const reduceMotion = useReducedMotion();

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {kpiCards.map((card, idx) => {
        const IconComponent = card.icon;
        const isTendencia = card.key === 'tendencia';
        const isPositive = (data.resumen?.tendenciaVsAnterior ?? 0) >= 0;
        return (
          <motion.div
            key={card.key}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: reduceMotion ? 0 : idx * 0.05 }}
            className="rounded-xl border bg-card p-4"
          >
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2">
              {isTendencia ? (
                isPositive ? (
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
                )
              ) : (
                <IconComponent className={cn('h-3.5 w-3.5', card.iconColor)} />
              )}
              {card.label}
            </div>
            <p className={cn('text-xl font-bold', card.valueColor?.(data))}>{card.format(data)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {typeof card.subtitle === 'function' ? card.subtitle(data) : card.subtitle}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
}

export default KPIsOcupacion;
