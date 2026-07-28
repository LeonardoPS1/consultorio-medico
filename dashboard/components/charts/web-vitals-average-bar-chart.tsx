'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';

const METRIC_LABELS: Record<string, string> = {
  LCP: 'Largest Contentful Paint',
  INP: 'Interaction to Next Paint',
  CLS: 'Cumulative Layout Shift',
  FCP: 'First Contentful Paint',
  TTFB: 'Time to First Byte',
};

const METRIC_COLORS: Record<string, string> = {
  LCP: '#6366f1', INP: '#8b5cf6', CLS: '#a855f7',
  FCP: '#3b82f6', TTFB: '#06b6d4',
};

const METRIC_THRESHOLDS: Record<string, { good: number; poor: number }> = {
  LCP: { good: 2500, poor: 4000 },
  INP: { good: 200, poor: 500 },
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 },
};

function formatValue(name: string, value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '\u2014';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '\u2014';
  if (name === 'CLS') return num.toFixed(3);
  return Math.round(num).toLocaleString('es-CL');
}

interface AverageBarChartProps {
  data: Array<{ name: string; value: number; fill: string }>;
}

export function WebVitalsAverageBarChart({ data }: AverageBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="name" className="text-xs" tickFormatter={(v) => v} />
        <YAxis className="text-xs" />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
          }}
          formatter={(value: number, name: string) => [formatValue('', value), 'Promedio']}
          labelFormatter={(label: string) => METRIC_LABELS[label] || label}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((entry, idx) => (
            <Cell key={idx} fill={entry.fill} />
          ))}
        </Bar>
        {data.map((entry) => {
          const t = METRIC_THRESHOLDS[entry.name];
          if (!t) return null;
          return (
            <ReferenceLine
              key={`good-${entry.name}`}
              y={t.good}
              stroke="#22c55e"
              strokeDasharray="4 4"
              strokeWidth={1}
            />
          );
        })}
      </BarChart>
    </ResponsiveContainer>
  );
}
