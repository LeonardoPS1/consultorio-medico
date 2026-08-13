'use client';

import type { JSX } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';

const METRIC_LABELS: Record<string, string> = {
  LCP: 'Largest Contentful Paint',
  INP: 'Interaction to Next Paint',
  CLS: 'Cumulative Layout Shift',
  FCP: 'First Contentful Paint',
  TTFB: 'Time to First Byte',
};

const METRIC_UNITS: Record<string, string> = {
  LCP: 'ms', INP: 'ms', CLS: '', FCP: 'ms', TTFB: 'ms',
};

const METRIC_COLORS: Record<string, string> = {
  LCP: '#6366f1', INP: '#8b5cf6', CLS: '#a855f7',
  FCP: '#3b82f6', TTFB: '#06b6d4',
};

const METRICS = ['LCP', 'INP', 'CLS', 'FCP', 'TTFB'] as const;

function formatBucket(bucket: string, bucketType: string): string {
  if (!bucket) return '\u2014';
  const d = new Date(bucket.includes('T') ? bucket : bucket.replace(' ', 'T') + 'Z');
  if (isNaN(d.getTime())) return bucket;
  if (bucketType === 'hour') return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
}

function formatValue(name: string, value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '\u2014';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '\u2014';
  if (name === 'CLS') return num.toFixed(3);
  return Math.round(num).toLocaleString('es-CL');
}

interface WebVitalsLineChartProps {
  data: Array<Record<string, string | number | null | undefined>>;
  bucketType: string;
}

/**
 * Gráfico de línea con la tendencia de métricas Web Vitals.
 * @param {WebVitalsLineChartProps} root0 - Props del componente.
 * @param {Array<Record<string, string | number | null | undefined>>} root0.data - Series temporales por métrica.
 * @param {string} root0.bucketType - Tipo de agrupación temporal.
 * @returns {JSX.Element} Gráfico de líneas de tendencia.
 */
export function WebVitalsLineChart({
  data,
  bucketType,
}: WebVitalsLineChartProps): JSX.Element {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-12 text-center">
        Sin datos suficientes para tendencia
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="bucket"
          tickFormatter={(v) => formatBucket(v, bucketType)}
          className="text-[10px]"
          interval={data.length > 10 ? Math.floor(data.length / 7) : 0}
        />
        <YAxis className="text-[10px]" />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            fontSize: '12px',
          }}
          labelFormatter={(v) => formatBucket(v, bucketType)}
          formatter={(value: number, name: string) => [
            `${formatValue(name, value)} ${METRIC_UNITS[name] || ''}`,
            METRIC_LABELS[name] || name,
          ]}
        />
        <Legend
          formatter={(value: string) => (
            <span className="text-xs" title={METRIC_LABELS[value] || value}>{value}</span>
          )}
        />
        {METRICS.map((metric) => (
          <Line
            key={metric}
            type="monotone"
            dataKey={metric}
            name={metric}
            stroke={METRIC_COLORS[metric]}
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
