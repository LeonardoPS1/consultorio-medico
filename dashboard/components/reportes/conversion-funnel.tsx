'use client';

import type { JSX } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  Cell,
} from 'recharts';
import type { TooltipProps } from 'recharts';

interface ConversionLead {
  etapa: string;
  cantidad: number;
  porcentaje: number;
}

interface Props {
  data: ConversionLead[];
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: TooltipProps<number, string>): JSX.Element | null => {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const lead = item?.payload as ConversionLead | undefined;
  return (
    <div className="bg-foreground text-background text-xs rounded-lg px-3 py-2 shadow-card border border-border/50">
      <p className="font-semibold">{label}</p>
      <p className="opacity-80">
        {item.value} pacientes ({lead?.porcentaje ?? 0}%)
      </p>
    </div>
  );
};

const COLORS = ['#6366f1', '#818cf8', '#a5b4fc', '#3b82f6', '#60a5fa'];

/**
 * Embudo de conversión por etapas con barras horizontales.
 * @param {Props} root0 - Props del componente.
 * @param {ConversionLead[]} root0.data - Etapas del embudo con cantidad y porcentaje.
 * @returns {JSX.Element} El gráfico de barras del embudo de conversión.
 */
export default function ConversionFunnel({ data }: Props): JSX.Element {
  const maxVal = Math.max(...data.map((d) => d.cantidad), 1);

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={240}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 40, left: 0, bottom: 4 }}
          barCategoryGap="20%"
          barGap={0}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            strokeOpacity={0.4}
            horizontal={false}
          />
          <XAxis
            type="number"
            domain={[0, maxVal]}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="etapa"
            tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
            axisLine={false}
            tickLine={false}
            width={120}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
          />
          <Bar
            dataKey="cantidad"
            radius={[0, 4, 4, 0]}
            maxBarSize={32}
            animationBegin={0}
            animationDuration={400}
            animationEasing="ease-out"
          >
            {data.map((entry, index) => (
              <Cell key={entry.etapa} fill={COLORS[index % COLORS.length]} />
            ))}
            <LabelList
              dataKey="porcentaje"
              position="right"
              formatter={(v: number) => `${v}%`}
              style={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
