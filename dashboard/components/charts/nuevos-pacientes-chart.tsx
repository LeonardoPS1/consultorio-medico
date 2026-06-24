'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { TooltipProps } from 'recharts';

interface Props {
  data: { label: string; valor: number }[];
}

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-foreground text-background text-xs rounded-lg px-3 py-2 shadow-card border border-border/50">
      <p className="font-semibold">{label}</p>
      <p className="opacity-80">{payload[0].value} pacientes nuevos</p>
    </div>
  );
};

export default function NuevosPacientesChart({ data }: Props) {
  const maxVal = Math.max(...data.map((d) => d.valor), 1);

  return (
    <div className="relative">
      {/* SVG gradient definition */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0.4} />
          </linearGradient>
        </defs>
      </svg>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} barCategoryGap="30%" barGap={0}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            strokeOpacity={0.4}
            vertical={false}
          />
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
            domain={[0, Math.ceil(maxVal * 1.15)]}
            allowDecimals={false}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
          />
          <Bar
            dataKey="valor"
            fill="url(#emeraldGradient)"
            radius={[3, 3, 0, 0]}
            maxBarSize={48}
            animationBegin={0}
            animationDuration={300}
            animationEasing="ease-out"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
