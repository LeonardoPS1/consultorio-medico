'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  type DefaultLegendContentProps,
} from 'recharts';
import type { TooltipProps } from 'recharts';

export interface EjecutivoTrend {
  label: string;
  ingresos: number;
  ocupacion: number;
}

interface Props {
  data: EjecutivoTrend[];
  metric: 'ingresos' | 'ocupacion';
  title: string;
  yLabel: string;
  color: string;
}

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  const value = item.ingresos !== undefined ? item.ingresos : item.ocupacion;
  const formattedValue = item.ingresos !== undefined
    ? `$${value}M`
    : `${Math.round(value)}%`;

  return (
    <div className="bg-foreground text-background text-xs rounded-lg px-3 py-2 shadow-card border border-border/50">
      <p className="font-semibold mb-1">{label}</p>
      <p className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: payload[0].color }} />
        {formattedValue}
      </p>
    </div>
  );
}

const CustomLegend = ({ payload }: DefaultLegendContentProps) => {
  if (!payload?.length) return null;
  return (
    <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground pt-1">
      {payload.map((entry, idx: number) => (
        <span key={idx} className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: entry.color }} />
          {entry.value}
        </span>
      ))}
    </div>
  );
};

export default function EjecutivoTrendChart({ data, metric, title, yLabel, color }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        Sin datos suficientes para mostrar tendencia
      </div>
    );
  }

  const maxVal = Math.max(
    ...data.map((d) => (metric === 'ingresos' ? d.ingresos : d.ocupacion)),
    1
  );

  return (
    <div className="relative">
      <div className="mb-2 text-sm font-medium text-muted-foreground">{title}</div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart
          data={data}
          margin={{ top: 8, right: 16, left: -8, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={{ stroke: 'hsl(var(--border))', strokeOpacity: 0.4 }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            domain={metric === 'ingresos' ? [0, Math.ceil(maxVal * 1.15)] : [50, 100]}
            allowDecimals={metric === 'ingresos'}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }} />
          <Legend content={<CustomLegend />} />
          <Line
            type="monotone"
            dataKey={metric}
            name={yLabel}
            stroke={color}
            strokeWidth={2.5}
            dot={{ r: 4, fill: color }}
            activeDot={{ r: 6 }}
            animationBegin={0}
            animationDuration={300}
            animationEasing="ease-out"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}