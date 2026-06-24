'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { TooltipProps, DefaultLegendContentProps } from 'recharts';
export interface WhatsAppVolumen {
  dia: string;
  recibidos: number;
  enviados: number;
}

interface Props {
  data: WhatsAppVolumen[];
}

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-foreground text-background text-xs rounded-lg px-3 py-2 shadow-card border border-border/50">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((entry, idx: number) => (
        <p key={idx} className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: entry.color }} />
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
};

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

export default function VolumenWhatsAppChart({ data }: Props) {
  const maxVal = Math.max(...data.flatMap((d) => [d.recibidos, d.enviados]), 1);

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} barGap={4} barCategoryGap="20%">
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            strokeOpacity={0.4}
            vertical={false}
          />
          <XAxis
            dataKey="dia"
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
          <Legend content={<CustomLegend />} />
          <Bar
            dataKey="recibidos"
            name="Recibidos"
            fill="hsl(var(--primary))"
            radius={[3, 3, 0, 0]}
            maxBarSize={28}
            animationBegin={0}
            animationDuration={300}
            animationEasing="ease-out"
          />
          <Bar
            dataKey="enviados"
            name="Enviados"
            fill="hsl(142, 76%, 36%)"
            fillOpacity={0.7}
            radius={[3, 3, 0, 0]}
            maxBarSize={28}
            animationBegin={75}
            animationDuration={300}
            animationEasing="ease-out"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
