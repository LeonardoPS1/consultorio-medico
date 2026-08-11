'use client';

import { TrendingUp } from 'lucide-react';
import { useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { OcupacionReporte } from '@/lib/services/ocupacion-grilla';

interface TendenciasOcupacionProps {
  data: OcupacionReporte;
}

/**
 *
 * @param root0
 * @param root0.data
 */
export function TendenciasOcupacion({ data }: TendenciasOcupacionProps) {
  const tendencias = data.tendencias ?? [];

  const chartData = useMemo(() => {
    if (!tendencias.length) return [];
    return tendencias.map((t) => ({
      semana: `S${t.semana}`,
      ocupacion: Math.round(t.ocupacion * 100),
      turnos: t.totalTurnos,
    }));
  }, [tendencias]);

  const promedio = useMemo(() => {
    if (!chartData.length) return 0;
    return Math.round(chartData.reduce((s, d) => s + d.ocupacion, 0) / chartData.length);
  }, [chartData]);

  if (!chartData.length) {
    return (
      <div className="rounded-xl border bg-card p-5">
        <h3 className="text-base font-semibold flex items-center gap-2 mb-4">
          <TrendingUp className="h-4 w-4 text-primary" />
          Tendencia semanal
        </h3>
        <p className="text-sm text-muted-foreground py-4 text-center">
          No hay suficientes datos para mostrar tendencias.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-5">
      <h3 className="text-base font-semibold flex items-center gap-2 mb-1">
        <TrendingUp className="h-4 w-4 text-primary" />
        Tendencia semanal
      </h3>
      <p className="text-xs text-muted-foreground mb-4">
        Ocupación y turnos por semana · promedio {promedio}%
      </p>

      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="semana"
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
              axisLine={false}
              tickLine={false}
              unit="%"
              domain={[0, 100]}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid hsl(var(--border))',
                backgroundColor: 'hsl(var(--card))',
                fontSize: '12px',
              }}
              formatter={(value: number, name: string) => {
                if (name === 'ocupacion') return [`${value}%`, 'Ocupación'];
                return [value, 'Turnos'];
              }}
            />
            <ReferenceLine
              yAxisId="left"
              y={promedio}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="4 4"
              strokeWidth={1}
            />
            <Bar
              yAxisId="right"
              dataKey="turnos"
              fill="hsl(var(--primary) / 0.15)"
              radius={[4, 4, 0, 0]}
              barSize={20}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="ocupacion"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ r: 3, fill: 'hsl(var(--primary))' }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default TendenciasOcupacion;
