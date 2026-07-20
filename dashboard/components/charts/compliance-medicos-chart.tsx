'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { TooltipProps } from 'recharts';
import type { CumplimientoMedico } from '@/app/dashboard/compliance/types';

interface Props {
  data: CumplimientoMedico[];
}

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (!active || !payload?.length) return null;
  const entry = payload[0]?.payload;
  return (
    <div className="bg-foreground text-background text-xs rounded-lg px-3 py-2 shadow-card border border-border/50">
      <p className="font-semibold mb-1">{label}</p>
      <p className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-sm bg-blue-500" />
        Espera promedio: {entry.promedioEspera} días
      </p>
      <p className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-sm bg-purple-500" />
        Cumplimiento: {entry.cumplimiento}%
      </p>
      <p className="text-[11px] opacity-70 mt-0.5 border-t border-border/30 pt-1">
        Turnos atendidos: {entry.turnosAtendidos}
      </p>
    </div>
  );
};

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#84cc16'];

export default function ComplianceMedicosChart({ data }: Props) {
  const sorted = [...data].sort((a, b) => b.turnosAtendidos - a.turnosAtendidos);

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={sorted} layout="vertical" barCategoryGap="25%">
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            strokeOpacity={0.5}
            horizontal={false}
          />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={{ stroke: 'hsl(var(--border))', strokeOpacity: 0.5 }}
            tickLine={false}
            domain={[0, 'auto']}
          />
          <YAxis
            dataKey="medicoNombre"
            type="category"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            width={140}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
          />
          <Bar
            dataKey="promedioEspera"
            name="Espera promedio (días)"
            radius={[0, 3, 3, 0]}
            maxBarSize={24}
            animationBegin={0}
            animationDuration={300}
            animationEasing="ease-out"
          >
            {sorted.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground border-t pt-2.5 mt-1">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-blue-500" /> Días de espera promedio
        </span>
      </div>
    </div>
  );
}
