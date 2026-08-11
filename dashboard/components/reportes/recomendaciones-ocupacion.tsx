'use client';

import { Lightbulb, TrendingUp, CalendarPlus, Eye } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useMemo } from 'react';
import { generarRecomendaciones } from '@/lib/services/ocupacion-grilla';
import type { OcupacionReporte } from '@/lib/services/ocupacion-grilla';
import { cn } from '@/lib/utils';

interface RecomendacionesOcupacionProps {
  data: OcupacionReporte;
}

const iconMap = {
  promocionar: CalendarPlus,
  abrir_cupos: TrendingUp,
  monitorear: Eye,
};

const colorMap = {
  promocionar: 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30',
  abrir_cupos: 'border-rose-200 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/30',
  monitorear: 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30',
};

const iconColorMap = {
  promocionar: 'text-emerald-500',
  abrir_cupos: 'text-rose-500',
  monitorear: 'text-amber-500',
};

/**
 *
 * @param root0
 * @param root0.data
 */
export function RecomendacionesOcupacion({ data }: RecomendacionesOcupacionProps) {
  const reduceMotion = useReducedMotion();

  const recs = useMemo(() => generarRecomendaciones(data), [data]);

  if (!recs.length) return null;

  return (
    <div className="rounded-xl border bg-card p-5">
      <h3 className="text-base font-semibold flex items-center gap-2 mb-4">
        <Lightbulb className="h-4 w-4 text-amber-500" />
        Recomendaciones
      </h3>

      <div className="space-y-3">
        {recs.map((rec, idx) => {
          const Icon = iconMap[rec.tipo];
          return (
            <motion.div
              key={idx}
              initial={reduceMotion ? false : { opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.18, delay: reduceMotion ? 0 : idx * 0.05 }}
              className={cn('flex items-start gap-3 rounded-lg border p-3', colorMap[rec.tipo])}
            >
              <Icon className={cn('h-4 w-4 shrink-0 mt-0.5', iconColorMap[rec.tipo])} />
              <p className="text-sm">{rec.mensaje}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default RecomendacionesOcupacion;
