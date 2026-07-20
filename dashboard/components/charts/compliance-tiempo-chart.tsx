'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart, Legend } from 'recharts';
import type { TooltipProps } from 'recharts';
import type { TiempoEsperaMes } from '@/app/dashboard/compliance/types';

interface Props {
  data: TiempoEsperaMes[];
}

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (!active || !payload?.length) return null;
  const entry = payload[0]?.payload;
  return (
    <div className="bg-foreground text-background text-xs rounded-lg px-3 py-2 shadow-card border border-border/50">
      <p className="font-semibold mb-1">{label}</p>
      <p className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-sm bg-blue-500" />
        Promedio: {entry.promedio} días
      </p>
      <p className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-sm bg-orange-500" />
        Máximo: {entry.maximo} días
      </p>
      <p className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-sm bg-emerald-500" />
        Mínimo: {entry.minimo} días
      </p>
      <p className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-sm bg-purple-500" />
        Cumplimiento: {entry.cumplimiento}%
      </p>
    </div>
  );
};

export default function ComplianceTiempoChart({ data }: Props) {
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            strokeOpacity={0.5}
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={{ stroke: 'hsl(var(--border))', strokeOpacity: 0.5 }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            label={{ value: 'Días', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' } }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            domain={[0, 100]}
            label={{ value: '%', angle: 90, position: 'insideRight', style: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' } }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }} />
          <Legend
            wrapperStyle={{ fontSize: 10 }}
            iconSize={8}
          />
          <Bar
            yAxisId="left"
            dataKey="promedio"
            name="Promedio (días)"
            fill="#3b82f6"
            radius={[2, 2, 0, 0]}
            maxBarSize={30}
            animationBegin={0}
            animationDuration={300}
            animationEasing="ease-out"
          />
          <Line
            yAxisId="right"
            dataKey="cumplimiento"
            name="Cumplimiento (%)"
            type="monotone"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={{ r: 3, fill: '#8b5cf6' }}
            animationBegin={200}
            animationDuration={400}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground border-t pt-2.5 mt-1">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-blue-500" /> Promedio
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-orange-500" /> Máximo
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-emerald-500" /> Mínimo
        </span>
      </div>
    </div>
  );
}
