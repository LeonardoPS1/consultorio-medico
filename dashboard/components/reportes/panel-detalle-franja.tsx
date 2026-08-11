'use client';

import { Flame, Clock, AlertTriangle } from 'lucide-react';
import type { OcupacionReporte } from '@/lib/services/ocupacion-grilla';
import { DIAS_LABEL, generarRecomendaciones } from '@/lib/services/ocupacion-grilla';
import { cn } from '@/lib/utils';

interface PanelDetalleFranjaProps {
  data: OcupacionReporte;
  dia: number | null;
  hora: number | null;
}

const NIVELES = [
  { min: 0, max: 0.3, label: 'Baja', color: 'text-emerald-600 dark:text-emerald-400' },
  { min: 0.3, max: 0.6, label: 'Media', color: 'text-amber-600 dark:text-amber-400' },
  { min: 0.6, max: 0.85, label: 'Alta', color: 'text-orange-600 dark:text-orange-400' },
  { min: 0.85, max: Infinity, label: 'Saturada', color: 'text-rose-600 dark:text-rose-400' },
];

function nivelLabel(valor: number): { label: string; color: string } {
  return NIVELES.find((n) => valor > n.min && valor <= n.max) ?? NIVELES[NIVELES.length - 1];
}

function fmtHora(h: number): string {
  return `${h.toString().padStart(2, '0')}:00`;
}

export function PanelDetalleFranja({ data, dia, hora }: PanelDetalleFranjaProps) {
  if (dia === null || hora === null) {
    return (
      <div className="rounded-xl border bg-card p-6 flex flex-col items-center justify-center text-center min-h-[200px]">
        <Clock className="h-8 w-8 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">
          Seleccioná una franja del heatmap para ver su detalle
        </p>
      </div>
    );
  }

  const franja = data.franjas.find((f) => f.dia === dia && f.hora === hora);
  const noShow = (data.noShowPorFranja ?? []).find((n) => n.dia === dia && n.hora === hora);
  const nivel = franja ? nivelLabel(franja.ocupacion) : { label: '—', color: 'text-muted-foreground' };
  const recs = generarRecomendaciones(data).filter(
    (r) => r.franja?.dia === dia && r.franja?.hora === hora,
  );

  return (
    <div className="rounded-xl border bg-card p-5">
      <h3 className="text-base font-semibold mb-4">
        {DIAS_LABEL[dia]} {fmtHora(hora)}
      </h3>

      <div className="space-y-4">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Turnos agendados</p>
          <p className="text-2xl font-bold">{franja?.total ?? 0}</p>
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-1">Nivel de ocupación</p>
          <div className="flex items-center gap-2">
            <p className={cn('text-xl font-bold', nivel.color)}>
              {franja ? `${Math.round(franja.ocupacion * 100)}%` : '—'}
            </p>
            <span className={cn('text-xs font-medium px-1.5 py-0.5 rounded-full bg-muted', nivel.color)}>
              {nivel.label}
            </span>
          </div>
        </div>

        {noShow && noShow.tasaNoShow > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-amber-500" />
              Tasa de inasistencia
            </p>
            <p className="text-lg font-bold text-amber-600">
              {Math.round(noShow.tasaNoShow * 100)}%
            </p>
          </div>
        )}

        {recs.length > 0 && (
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <Flame className="h-3 w-3 text-rose-500" />
              Recomendación
            </p>
            {recs.map((r, i) => (
              <p key={i} className="text-sm">{r.mensaje}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default PanelDetalleFranja;
