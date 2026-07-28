'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';

interface PercentileBarChartProps {
  data: Array<{ name: string; p50: number; p75: number; p95: number; p99: number; count: number }>;
}

export function WebVitalsPercentileBarChart({ data }: PercentileBarChartProps) {
  if (data.length === 0) return null;

  const chartData = data.map((p) => ({
    name: p.name,
    good: Number(p.p50) || 0,
    fair: (Number(p.p75) || 0) - (Number(p.p50) || 0),
    poor: (Number(p.p95) || 0) - (Number(p.p75) || 0),
    bad: (Number(p.p99) || 0) - (Number(p.p95) || 0),
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={chartData}
        layout="vertical"
        barSize={18}
        margin={{ top: 6, right: 8, left: 40, bottom: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
        <XAxis type="number" tick={{ fontSize: 10 }} />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 11 }}
          width={32}
        />
        <Tooltip
          formatter={(value: number, name: string) => {
            const labels: Record<string, string> = {
              good: 'P50',
              fair: 'P50\u2192P75',
              poor: 'P75\u2192P95',
              bad: 'P95\u2192P99',
            };
            return [value.toFixed(1), labels[name] || name];
          }}
          contentStyle={{ fontSize: 11 }}
        />
        <Bar dataKey="good" stackId="a" fill="#22c55e" name="good" />
        <Bar dataKey="fair" stackId="a" fill="#eab308" name="fair" />
        <Bar dataKey="poor" stackId="a" fill="#f97316" name="poor" />
        <Bar dataKey="bad" stackId="a" fill="#ef4444" name="bad" />
        <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
      </BarChart>
    </ResponsiveContainer>
  );
}
