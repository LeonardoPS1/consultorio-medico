'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { TooltipProps } from 'recharts';
export interface DistribucionEstado {
  estado: string;
  valor: number;
  color: string;
}

interface Props {
  data: DistribucionEstado[];
}

const colorMap: Record<string, string> = {
  'bg-emerald-500': '#10b981',
  'bg-amber-500': '#f59e0b',
  'bg-red-500': '#ef4444',
  'bg-purple-500': '#a855f7',
  'bg-blue-500': '#3b82f6',
};

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div className="bg-foreground text-background text-xs rounded-lg px-3 py-2 shadow-card border border-border/50">
      <p className="font-semibold">{label}</p>
      <p className="opacity-80">{entry.value} turnos</p>
    </div>
  );
};

export default function DistribucionEstadosChart({ data }: Props) {
  const chartData = data.map((d) => ({
    ...d,
    fill: colorMap[d.color] || '#6b7280',
  }));

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} barCategoryGap="25%" barGap={0}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            strokeOpacity={0.4}
            vertical={false}
          />
          <XAxis
            dataKey="estado"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={{ stroke: 'hsl(var(--border))', strokeOpacity: 0.4 }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
          />
          <Bar
            dataKey="valor"
            radius={[4, 4, 0, 0]}
            maxBarSize={56}
            animationBegin={0}
            animationDuration={300}
            animationEasing="ease-out"
          >
            {chartData.map((entry, idx) => (
              <Cell key={idx} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
