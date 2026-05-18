'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { TurnoDia } from '@/app/dashboard/reportes/reportes-data';

interface Props {
  data: TurnoDia[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const entry = payload[0]?.payload;
  return (
    <div className="bg-foreground text-background text-xs rounded-lg px-3 py-2 shadow-card border border-border/50">
      <p className="font-semibold mb-1">{label}</p>
      <p className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-sm bg-emerald-500" />
        Completados: {entry.completados}
      </p>
      <p className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-sm bg-amber-500" />
        Cancelados: {entry.cancelados}
      </p>
      <p className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-sm bg-red-500" />
        Ausentes: {entry.ausentes}
      </p>
      <p className="text-[11px] opacity-70 mt-0.5 border-t border-border/30 pt-1">
        Total: {entry.cantidad} turnos
      </p>
    </div>
  );
};

export default function TurnosChart({ data }: Props) {
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} barCategoryGap="20%" barGap={0}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            strokeOpacity={0.5}
            vertical={false}
          />
          <XAxis
            dataKey="dia"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={{ stroke: 'hsl(var(--border))', strokeOpacity: 0.5 }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }} />
          <Bar
            dataKey="completados"
            stackId="a"
            fill="#10b981"
            radius={[2, 2, 0, 0]}
            maxBarSize={40}
            animationBegin={0}
            animationDuration={300}
            animationEasing="ease-out"
          />
          <Bar
            dataKey="cancelados"
            stackId="a"
            fill="#f59e0b"
            radius={[2, 2, 0, 0]}
            maxBarSize={40}
            animationBegin={50}
            animationDuration={300}
            animationEasing="ease-out"
          />
          <Bar
            dataKey="ausentes"
            stackId="a"
            fill="#ef4444"
            radius={[2, 2, 0, 0]}
            maxBarSize={40}
            animationBegin={100}
            animationDuration={300}
            animationEasing="ease-out"
          />
        </BarChart>
      </ResponsiveContainer>
      <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground border-t pt-2.5 mt-1">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-emerald-500" /> Completados</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-amber-500" /> Cancelados</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-red-500" /> Ausentes</span>
      </div>
    </div>
  );
}
