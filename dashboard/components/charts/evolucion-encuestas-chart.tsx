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
} from 'recharts';
import type { TooltipProps } from 'recharts';

interface EvolucionData {
  mes: string;
  promedio: number;
  cantidad: number;
}

interface Props {
  data: EvolucionData[];
}

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-lg border bg-card p-3 shadow-md text-sm">
      <p className="font-medium mb-1">{label}</p>
      <p className="text-primary font-semibold">
        Promedio: {item.promedio}/5
      </p>
      <p className="text-muted-foreground">
        {item.cantidad} encuesta{item.cantidad !== 1 ? 's' : ''}
      </p>
    </div>
  );
}

export function EvolucionEncuestasChart({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        Sin datos suficientes para mostrar evolución
      </div>
    );
  }

  // Formatear etiquetas de mes: "2026-06" → "Jun"
  const chartData = data.map((d) => {
    const [year, month] = d.mes.split('-');
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return {
      ...d,
      mesLabel: `${meses[parseInt(month, 10) - 1]} ${year !== new Date().getFullYear().toString() ? year : ''}`,
    };
  });

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 16, left: -8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
          <XAxis
            dataKey="mesLabel"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[0, 5]}
            ticks={[0, 1, 2, 3, 4, 5]}
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            type="monotone"
            dataKey="promedio"
            name="Promedio /5"
            stroke="hsl(221.2, 83.2%, 53.3%)"
            strokeWidth={2.5}
            dot={{ r: 4, fill: 'hsl(221.2, 83.2%, 53.3%)' }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
