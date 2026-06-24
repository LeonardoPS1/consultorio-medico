'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { TooltipProps } from 'recharts';

interface PrediccionDia {
  dia: string;
  real: number | null;
  estimado: number | null;
  min: number | null;
  max: number | null;
}

interface Props {
  data: PrediccionDia[];
}

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (!active || !payload?.length) return null;
  const real = payload.find((p) => p.dataKey === 'real');
  const estimado = payload.find((p) => p.dataKey === 'estimado');
  return (
    <div className="bg-foreground text-background text-xs rounded-lg px-3 py-2 shadow-card border border-border/50">
      <p className="font-semibold mb-1">{label}</p>
      {real?.value != null && <p className="opacity-80">Real: {real.value} turnos</p>}
      {estimado?.value != null && <p className="opacity-80">Estimado: {estimado.value} turnos</p>}
    </div>
  );
};

export default function PrediccionDemanda({ data }: Props) {
  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.real ?? 0, d.estimado ?? 0, d.max ?? 0)),
    1,
  );

  return (
    <div className="relative">
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="predRealGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="predEstGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.02} />
          </linearGradient>
        </defs>
      </svg>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            strokeOpacity={0.4}
            vertical={false}
          />
          <XAxis
            dataKey="dia"
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={{ stroke: 'hsl(var(--border))', strokeOpacity: 0.4 }}
            tickLine={false}
            interval={4}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            domain={[0, Math.ceil(maxVal * 1.15)]}
            allowDecimals={false}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2 }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            formatter={(value: string) =>
              value === 'real' ? 'Histórico' : value === 'estimado' ? 'Predicción' : value
            }
          />
          <Area
            type="monotone"
            dataKey="real"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#predRealGrad)"
            dot={false}
            connectNulls={false}
            name="real"
          />
          <Area
            type="monotone"
            dataKey="estimado"
            stroke="#8b5cf6"
            strokeWidth={2}
            strokeDasharray="6 3"
            fill="url(#predEstGrad)"
            dot={false}
            name="estimado"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
