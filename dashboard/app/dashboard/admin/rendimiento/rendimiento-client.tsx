'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, LineChart, Line, ReferenceLine,
  PieChart, Pie, Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Activity, Loader2, AlertCircle, BarChart3, PieChart as PieChartIcon,
  Clock, Gauge, Smartphone, TrendingUp, TrendingDown, Minus,
  Download, RefreshCw, Thermometer, Table as TableIcon,
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';

// ─── Types ─────────────────────────────────────────────────

type Period = '24h' | '7d' | '30d' | 'all';
type Section = 'all' | 'dashboard' | 'portal' | 'landing';

const PERIODS: { value: Period; label: string }[] = [
  { value: '24h', label: '24 horas' },
  { value: '7d', label: '7 días' },
  { value: '30d', label: '30 días' },
  { value: 'all', label: 'Todo' },
];

const SECTIONS: { value: Section; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'portal', label: 'Portal' },
  { value: 'landing', label: 'Landing' },
];

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

const METRIC_THRESHOLDS: Record<string, { good: number; poor: number }> = {
  LCP: { good: 2500, poor: 4000 },
  INP: { good: 200, poor: 500 },
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 },
};

const RATING_COLORS: Record<string, string> = {
  good: '#22c55e',
  'needs-improvement': '#eab308',
  poor: '#ef4444',
};

const METRIC_COLORS: Record<string, string> = {
  LCP: '#6366f1', INP: '#8b5cf6', CLS: '#a855f7',
  FCP: '#3b82f6', TTFB: '#06b6d4',
};

const DEVICE_COLORS: Record<string, string> = {
  desktop: '#6366f1', mobile: '#22c55e', tablet: '#eab308', unknown: '#6b7280',
};

// ─── Helpers ───────────────────────────────────────────────

function formatValue(name: string, value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '—';
  if (name === 'CLS') return num.toFixed(3);
  return Math.round(num).toLocaleString('es-CL');
}

function getBarColor(name: string) {
  return METRIC_COLORS[name] || '#6b7280';
}

function getThresholdLabel(name: string, value: number): string {
  const t = METRIC_THRESHOLDS[name];
  if (!t) return '';
  if (value <= t.good) return 'Bueno';
  if (value <= t.poor) return 'Regular';
  return 'Malo';
}

function getThresholdColor(name: string, value: number): string {
  const t = METRIC_THRESHOLDS[name];
  if (!t) return '#6b7280';
  if (value <= t.good) return '#22c55e';
  if (value <= t.poor) return '#eab308';
  return '#ef4444';
}

function getHeatColor(value: number, name: string): string {
  const t = METRIC_THRESHOLDS[name];
  if (!t) return '#f0f0f0';
  // Normalize: 0 = good threshold, 1 = poor threshold, >1 = beyond poor
  const ratio = t.good > 0 ? value / t.good : 0;
  if (ratio <= 1) return `rgba(34, 197, 94, ${0.15 + ratio * 0.4})`;    // green
  if (ratio <= t.poor / t.good) return `rgba(234, 179, 8, ${0.2 + (ratio - 1) * 0.3})`; // yellow
  return `rgba(239, 68, 68, ${Math.min(0.3 + (ratio - t.poor / t.good) * 0.3, 0.8)})`;  // red
}

function formatDate(iso: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-CL');
}

function formatBucket(bucket: string, bucketType: string) {
  if (!bucket) return '—';
  const d = new Date(bucket.includes('T') ? bucket : bucket.replace(' ', 'T') + 'Z');
  if (isNaN(d.getTime())) return bucket;
  if (bucketType === 'hour') return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
}

// ─── Interfaces ────────────────────────────────────────────

interface MetricStat {
  name: string; avgValue: number; minValue: number; maxValue: number; count: number;
}
interface RatingDist { name: string; rating: string; count: number; }
interface RecentEntry { id: string; name: string; value: string; rating: string; url: string | null; createdAt: string; userAgent: string | null; }
interface ByUrlRow { url: string | null; metricName: string; avgValue: number; minValue: number; maxValue: number; count: number; }
interface TimelinePoint { bucket: string; name: string; avgValue: number; count: number; }
interface PercentileRow { name: string; p50: number; p75: number; p95: number; p99: number; count: number; }
interface ComparisonRow { name: string; currentAvg: number; currentCount: number; prevAvg: number | null; prevCount: number; deltaPercent: number | null; improved: boolean | null; }
interface DeviceRow { name: string; device: string; avgValue: number; count: number; }
interface HeatmapRow { hour: number; name: string; avgValue: number; count: number; }

// ─── Main Component ────────────────────────────────────────

export function WebVitalsClient() {
  const [period, setPeriod] = useState<Period>('24h');
  const [section, setSection] = useState<Section>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Stats
  const [stats, setStats] = useState<MetricStat[]>([]);
  const [ratingDist, setRatingDist] = useState<RatingDist[]>([]);
  const [total, setTotal] = useState(0);

  // Timeline
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [bucketType, setBucketType] = useState('hour');

  // Percentiles
  const [percentiles, setPercentiles] = useState<PercentileRow[]>([]);

  // Comparison
  const [comparison, setComparison] = useState<ComparisonRow[]>([]);

  // Device
  const [deviceData, setDeviceData] = useState<DeviceRow[]>([]);

  // Heatmap
  const [heatmap, setHeatmap] = useState<HeatmapRow[]>([]);

  // Recent + by-URL
  const [recent, setRecent] = useState<RecentEntry[]>([]);
  const [byUrl, setByUrl] = useState<ByUrlRow[]>([]);

  // ─── Auto-refresh ──────────────────────────────────────
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        fetchData();
      }, 30000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, period, section]);

  // ─── Fetch all data ────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const base = `/api/web-vitals?period=${period}&section=${section}`;
      const [
        statsRes, recentRes, urlRes,
        timelineRes, percRes, compRes, deviceRes, heatRes,
      ] = await Promise.all([
        fetch(`${base}&view=stats`),
        fetch(`${base}&view=recent`),
        fetch(`${base}&view=by-url`),
        fetch(`${base}&view=timeline`),
        fetch(`${base}&view=percentiles`),
        fetch(`${base}&view=comparison`),
        fetch(`${base}&view=device`),
        fetch(`${base}&view=heatmap`),
      ]);

      if (!statsRes.ok || !recentRes.ok || !urlRes.ok) {
        throw new Error('Error al cargar datos');
      }

      const [statsJson, recentJson, urlJson, timelineJson, percJson, compJson, deviceJson, heatJson] =
        await Promise.all([
          statsRes.json(), recentRes.json(), urlRes.json(),
          timelineRes.json(), percRes.json(), compRes.json(), deviceRes.json(), heatRes.json(),
        ]);

      setStats(statsJson.data?.stats || []);
      setRatingDist(statsJson.data?.ratingDistribution || []);
      setTotal(statsJson.data?.total || 0);
      setRecent(recentJson.data?.data || []);
      setByUrl(urlJson.data?.data || []);
      setTimeline(timelineJson.data?.data || []);
      setBucketType(timelineJson.data?.bucket || 'hour');
      setPercentiles(percJson.data?.data || []);
      setComparison(compJson.data?.data || []);
      setDeviceData(deviceJson.data?.data || []);
      setHeatmap(heatJson.data?.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [period, section]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Export CSV ────────────────────────────────────────
  const exportCSV = () => {
    const rows: string[] = ['Métrica,Promedio,Min,Max,Muestras'];
    for (const s of stats) {
      rows.push(`${s.name},${s.avgValue},${s.minValue},${s.maxValue},${s.count}`);
    }
    rows.push('');
    rows.push('URL,Métrica,Promedio,Min,Max,Muestras');
    for (const r of byUrl) {
      rows.push(`${r.url || ''},${r.metricName},${r.avgValue},${r.minValue},${r.maxValue},${r.count}`);
    }
    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `web-vitals-${period}.csv`;
    link.click();
  };

  // ─── Derived data ──────────────────────────────────────
  const pieData = stats
    .map((s) => ({ name: s.name, value: s.avgValue, fill: getBarColor(s.name) }))
    .filter((d) => d.value > 0);

  // Timeline: transform to { bucket, LCP, INP, CLS, FCP, TTFB } per bucket
  const timelineBuckets = Array.from(new Set(timeline.map((t) => t.bucket))).sort();
  const timelineChartData = timelineBuckets.map((bucket) => {
    const point: Record<string, any> = { bucket };
    for (const metric of ['LCP', 'INP', 'CLS', 'FCP', 'TTFB'] as const) {
      const entry = timeline.find((t) => t.bucket === bucket && t.name === metric);
      point[metric] = entry ? entry.avgValue : null;
    }
    return point;
  });

  // Heatmap unique hours and metrics
  const heatHours = Array.from(new Set(heatmap.map((h) => h.hour))).sort((a, b) => a - b);
  const heatMetrics = ['LCP', 'INP', 'CLS', 'FCP', 'TTFB'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <PageHeader
          title="Rendimiento Web"
          description="Core Web Vitals y métricas de rendimiento"
          icon={<Activity className="h-6 w-6" />}
        />
        <div className="flex items-center gap-2 flex-wrap">
          {/* Auto-refresh toggle */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mr-2">
            <Switch
              id="auto-refresh"
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
              className="scale-75"
            />
            <Label htmlFor="auto-refresh" className="text-xs cursor-pointer">
              Auto {autoRefresh ? '30s' : 'off'}
            </Label>
          </div>

          {/* Export CSV */}
          {!loading && stats.length > 0 && (
            <Button variant="outline" size="sm" className="text-xs h-7" onClick={exportCSV}>
              <Download className="h-3 w-3 mr-1" />
              CSV
            </Button>
          )}

          {/* Period */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            {PERIODS.map((p) => (
              <Button
                key={p.value}
                variant={period === p.value ? 'default' : 'ghost'}
                size="sm"
                className="text-xs h-7"
                onClick={() => setPeriod(p.value)}
              >
                {p.label}
              </Button>
            ))}
          </div>

          {/* Refresh button */}
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Section filter row */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground font-medium shrink-0">Sección:</span>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {SECTIONS.map((s) => (
            <Button
              key={s.value}
              variant={section === s.value ? 'secondary' : 'ghost'}
              size="sm"
              className="text-xs h-7"
              onClick={() => setSection(s.value)}
            >
              {s.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* ═══════════════════════════════════════════════════
              STATS CARDS
             ═══════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            {/* Total metrics */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Activity className="h-3 w-3" />
                  Total métricas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{total.toLocaleString('es-CL')}</p>
              </CardContent>
            </Card>

            {/* Per-metric stats */}
            {stats.map((s) => {
              const compliancePct = ratingDist
                .filter((r) => r.name === s.name && r.rating === 'good')
                .reduce((acc, r) => acc + r.count, 0);
              const totalForMetric = ratingDist
                .filter((r) => r.name === s.name)
                .reduce((acc, r) => acc + r.count, 0);
              const goodPct = totalForMetric > 0 ? Math.round((compliancePct / totalForMetric) * 100) : 0;

              return (
                <Card key={s.name} className="relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 opacity-5">
                    <Gauge className="w-full h-full" style={{ color: getBarColor(s.name) }} />
                  </div>
                  <CardHeader className="pb-1">
                    <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: getBarColor(s.name) }} />
                      <span title={METRIC_LABELS[s.name] || s.name}>{s.name}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xl font-bold" style={{ color: getBarColor(s.name) }}>
                      {formatValue(s.name, s.avgValue)}
                      <span className="text-xs font-normal text-muted-foreground ml-1">
                        {METRIC_UNITS[s.name]}
                      </span>
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                      <span className={`font-medium ${getThresholdColor(s.name, s.avgValue)}`}>
                        {getThresholdLabel(s.name, s.avgValue)}
                      </span>
                      <span>·</span>
                      <span>{goodPct}% bueno</span>
                    </div>
                    <div className="flex gap-2 mt-1 text-[10px] text-muted-foreground">
                      <span>min {formatValue(s.name, s.minValue)}</span>
                      <span>máx {formatValue(s.name, s.maxValue)}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{s.count} muestras</p>

                    {/* Minibar de compliance */}
                    <div className="flex h-1.5 rounded-full overflow-hidden bg-muted mt-2">
                      {['good', 'needs-improvement', 'poor'].map((rating) => {
                        const cnt = ratingDist
                          .filter((r) => r.name === s.name && r.rating === rating)
                          .reduce((acc, r) => acc + r.count, 0);
                        const pct = totalForMetric > 0 ? (cnt / totalForMetric) * 100 : 0;
                        return pct > 0 ? (
                          <div
                            key={rating}
                            style={{
                              width: `${pct}%`,
                              backgroundColor: RATING_COLORS[rating],
                            }}
                          />
                        ) : null;
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* ═══════════════════════════════════════════════════
              TABS
             ═══════════════════════════════════════════════════ */}
          <Tabs defaultValue="resumen">
            <TabsList className="flex-wrap">
              <TabsTrigger value="resumen" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Resumen
              </TabsTrigger>
              <TabsTrigger value="comparativa" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                Comparativa
              </TabsTrigger>
              <TabsTrigger value="recientes" className="gap-2">
                <Clock className="h-4 w-4" />
                Recientes
              </TabsTrigger>
              <TabsTrigger value="urls" className="gap-2">
                <Smartphone className="h-4 w-4" />
                Por URL
              </TabsTrigger>
            </TabsList>

            {/* ── TAB: RESUMEN ───────────────────────────── */}
            <TabsContent value="resumen" className="mt-4 space-y-4">
              {/* Timeline + Bar chart */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Timeline chart */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      Tendencia {bucketType === 'hour' ? 'por hora' : 'por día'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {timelineChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={timelineChartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis
                            dataKey="bucket"
                            tickFormatter={(v) => formatBucket(v, bucketType)}
                            className="text-[10px]"
                            interval={timelineChartData.length > 10 ? Math.floor(timelineChartData.length / 7) : 0}
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
                          {(['LCP', 'INP', 'CLS', 'FCP', 'TTFB'] as const).map((metric) => (
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
                    ) : (
                      <p className="text-sm text-muted-foreground py-12 text-center">
                        Sin datos suficientes para tendencia
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Bar chart: promedios */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-primary" />
                      Promedio general por métrica
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={pieData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
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
                          {pieData.map((entry, idx) => (
                            <Cell key={idx} fill={entry.fill} />
                          ))}
                        </Bar>
                        {/* Threshold reference lines */}
                        {pieData.map((entry) => {
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
                    <p className="text-[10px] text-muted-foreground mt-1 text-center">
                      Líneas punteadas verdes = umbral &quot;bueno&quot; de cada métrica
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Percentiles + Rating distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Percentiles */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TableIcon className="h-4 w-4 text-primary" />
                      Percentiles
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left font-medium text-muted-foreground px-3 py-2">Métrica</th>
                            <th className="text-right font-medium text-muted-foreground px-3 py-2">P50</th>
                            <th className="text-right font-medium text-muted-foreground px-3 py-2">P75</th>
                            <th className="text-right font-medium text-muted-foreground px-3 py-2">P95</th>
                            <th className="text-right font-medium text-muted-foreground px-3 py-2">P99</th>
                            <th className="text-right font-medium text-muted-foreground px-3 py-2">Muestras</th>
                          </tr>
                        </thead>
                        <tbody>
                          {percentiles.map((p) => (
                            <tr key={p.name} className="border-b border-border/50 hover:bg-muted/30">
                              <td className="px-3 py-2 font-medium" title={METRIC_LABELS[p.name] || p.name}>{p.name}</td>
                              <td className="px-3 py-2 text-right font-mono tabular-nums"
                                style={{ color: getThresholdColor(p.name, p.p50) }}>
                                {formatValue(p.name, p.p50)}
                              </td>
                              <td className="px-3 py-2 text-right font-mono tabular-nums"
                                style={{ color: getThresholdColor(p.name, p.p75) }}>
                                {formatValue(p.name, p.p75)}
                              </td>
                              <td className="px-3 py-2 text-right font-mono tabular-nums text-destructive font-medium">
                                {formatValue(p.name, p.p95)}
                              </td>
                              <td className="px-3 py-2 text-right font-mono tabular-nums text-destructive font-bold">
                                {formatValue(p.name, p.p99)}
                              </td>
                              <td className="px-3 py-2 text-right text-muted-foreground">{p.count}</td>
                            </tr>
                          ))}
                          {percentiles.length === 0 && (
                            <tr>
                              <td colSpan={6} className="text-center py-8 text-muted-foreground">
                                Sin datos
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Rating distribution */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <PieChartIcon className="h-4 w-4 text-primary" />
                      Distribución de ratings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {stats.map((s) => {
                        const ratings = ratingDist.filter((r) => r.name === s.name);
                        const totalForMetric = ratings.reduce((acc, r) => acc + r.count, 0);
                        const goodPct = totalForMetric > 0
                          ? Math.round((ratings.find((r) => r.rating === 'good')?.count || 0) / totalForMetric * 100)
                          : 0;
                        return (
                          <div key={s.name}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium flex items-center gap-2">
                                <span title={METRIC_LABELS[s.name] || s.name}>{s.name}</span>
                                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                                  goodPct >= 80 ? 'text-green-700 bg-green-100' :
                                  goodPct >= 50 ? 'text-yellow-700 bg-yellow-100' :
                                  'text-red-700 bg-red-100'
                                }`}>
                                  {goodPct}%
                                </span>
                              </span>
                              <span className="text-xs text-muted-foreground">{totalForMetric} muestras</span>
                            </div>
                            <div className="flex h-2.5 rounded-full overflow-hidden bg-muted">
                              {['good', 'needs-improvement', 'poor'].map((rating) => {
                                const cnt = ratings.find((r) => r.rating === rating)?.count || 0;
                                const pct = totalForMetric > 0 ? (cnt / totalForMetric) * 100 : 0;
                                return pct > 0 ? (
                                  <div
                                    key={rating}
                                    style={{
                                      width: `${pct}%`,
                                      backgroundColor: RATING_COLORS[rating],
                                      transition: 'width 0.3s ease',
                                    }}
                                    title={`${rating}: ${cnt} (${Math.round(pct)}%)`}
                                  />
                                ) : null;
                              })}
                            </div>
                            <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground">
                              {(['good', 'needs-improvement', 'poor'] as const).map((rating) => {
                                const cnt = ratings.find((r) => r.rating === rating)?.count || 0;
                                return cnt > 0 ? (
                                  <span key={rating} className="flex items-center gap-1">
                                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: RATING_COLORS[rating] }} />
                                    {rating === 'good' ? 'Bueno' : rating === 'needs-improvement' ? 'Regular' : 'Malo'}: {cnt}
                                  </span>
                                ) : null;
                              })}
                            </div>
                          </div>
                        );
                      })}
                      {stats.length === 0 && (
                        <p className="text-sm text-muted-foreground">Sin datos en este período</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ── TAB: COMPARATIVA ────────────────────────── */}
            <TabsContent value="comparativa" className="mt-4 space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Comparison vs previous period */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      {period === '24h' ? (
                        <TrendingUp className="h-4 w-4 text-primary" />
                      ) : (
                        <TrendingUp className="h-4 w-4 text-primary" />
                      )}
                      Comparación vs período anterior
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left font-medium text-muted-foreground px-3 py-2">Métrica</th>
                            <th className="text-right font-medium text-muted-foreground px-3 py-2">Actual</th>
                            <th className="text-right font-medium text-muted-foreground px-3 py-2">Anterior</th>
                            <th className="text-right font-medium text-muted-foreground px-3 py-2">Variación</th>
                            <th className="text-right font-medium text-muted-foreground px-3 py-2">Muestras</th>
                          </tr>
                        </thead>
                        <tbody>
                          {comparison.map((c) => (
                            <tr key={c.name} className="border-b border-border/50 hover:bg-muted/30">
                              <td className="px-3 py-2 font-medium" title={METRIC_LABELS[c.name] || c.name}>{c.name}</td>
                              <td className="px-3 py-2 text-right font-mono tabular-nums">
                                {formatValue(c.name, c.currentAvg)}
                                <span className="text-muted-foreground ml-1">{METRIC_UNITS[c.name]}</span>
                              </td>
                              <td className="px-3 py-2 text-right font-mono tabular-nums text-muted-foreground">
                                {c.prevAvg !== null ? formatValue(c.name, c.prevAvg) : '—'}
                              </td>
                              <td className="px-3 py-2 text-right">
                                {c.deltaPercent !== null ? (
                                  <span className={`inline-flex items-center gap-1 font-medium ${
                                    c.improved ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {c.improved
                                      ? <TrendingDown className="h-3 w-3" />
                                      : <TrendingUp className="h-3 w-3" />
                                    }
                                    {Math.abs(c.deltaPercent)}%
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">
                                    <Minus className="h-3 w-3 inline" />
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-right text-muted-foreground">
                                {c.currentCount}
                              </td>
                            </tr>
                          ))}
                          {comparison.length === 0 && (
                            <tr>
                              <td colSpan={5} className="text-center py-8 text-muted-foreground">
                                Sin datos suficientes para comparar
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-[10px] text-muted-foreground px-3 py-2 border-t border-border">
                      {period === '24h' ? 'Comparando con las 24 horas anteriores'
                        : period === '7d' ? 'Comparando con la semana anterior'
                        : 'Comparando con el mes anterior'}
                    </p>
                  </CardContent>
                </Card>

                {/* Device breakdown */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-primary" />
                      Rendimiento por dispositivo
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {deviceData.length > 0 ? (
                      <div className="space-y-3">
                        {deviceData.map((d, idx) => {
                          const totalForDevice = deviceData
                            .filter((x) => x.name === d.name)
                            .reduce((acc, x) => acc + x.count, 0);
                          return (
                            <div key={`${d.name}-${d.device}-${idx}`}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium flex items-center gap-1.5">
                                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: DEVICE_COLORS[d.device] }} />
                                  <span title={METRIC_LABELS[d.name] || d.name}>{d.name}</span> — {d.device}
                                </span>
                                <span className="text-xs font-mono font-bold" style={{ color: getThresholdColor(d.name, d.avgValue) }}>
                                  {formatValue(d.name, d.avgValue)}
                                  <span className="text-muted-foreground font-normal ml-0.5">{METRIC_UNITS[d.name]}</span>
                                </span>
                              </div>
                              <div className="flex h-1.5 rounded-full overflow-hidden bg-muted">
                                {['desktop', 'mobile', 'tablet', 'unknown'].map((dev) => {
                                  const deviceEntry = deviceData.find((x) => x.name === d.name && x.device === dev);
                                  if (!deviceEntry) return null;
                                  const pct = totalForDevice > 0 ? (deviceEntry.count / totalForDevice) * 100 : 0;
                                  return (
                                    <div
                                      key={dev}
                                      style={{
                                        width: `${pct}%`,
                                        backgroundColor: DEVICE_COLORS[dev],
                                        minWidth: pct > 0 ? '4px' : 0,
                                      }}
                                      title={`${dev}: ${deviceEntry.count} muestras`}
                                    />
                                  );
                                })}
                              </div>
                              <p className="text-[10px] text-muted-foreground mt-0.5">{d.count} muestras</p>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground py-8 text-center">
                        Sin datos de dispositivo
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Heatmap por hora */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Thermometer className="h-4 w-4 text-primary" />
                    Mapa de calor por hora del día
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {heatmap.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr>
                            <th className="text-left font-medium text-muted-foreground px-2 py-1">Métrica</th>
                            {Array.from({ length: 24 }, (_, h) => (
                              <th key={h} className="text-center font-medium text-muted-foreground px-1 py-1 w-8">
                                {h}h
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {heatMetrics.map((metric) => {
                            const maxForMetric = Math.max(
                              ...heatmap.filter((h) => h.name === metric).map((h) => h.avgValue),
                              0.001,
                            );
                            return (
                              <tr key={metric}>
                                <td className="font-medium px-2 py-1.5 text-xs whitespace-nowrap" title={METRIC_LABELS[metric] || metric}>
                                  {metric}
                                </td>
                                {Array.from({ length: 24 }, (_, hour) => {
                                  const cell = heatmap.find((h) => h.hour === hour && h.name === metric);
                                  return (
                                    <td
                                      key={hour}
                                      className="text-center px-1 py-1.5 relative group"
                                    >
                                      {cell ? (
                                        <div
                                          className="rounded-md px-1 py-1 text-[10px] font-mono tabular-nums cursor-default transition-colors"
                                          style={{
                                            backgroundColor: getHeatColor(cell.avgValue, metric),
                                            color: cell.avgValue > METRIC_THRESHOLDS[metric]?.poor ? 'white' : undefined,
                                          }}
                                          title={`${METRIC_LABELS[metric] || metric} ${hour}:00 — ${formatValue(metric, cell.avgValue)} ${METRIC_UNITS[metric]} (${cell.count} muestras)`}
                                        >
                                          {formatValue(metric, cell.avgValue)}
                                        </div>
                                      ) : (
                                        <span className="text-muted-foreground/20">·</span>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded" style={{ backgroundColor: 'rgba(34, 197, 94, 0.4)' }} /> Bueno
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded" style={{ backgroundColor: 'rgba(234, 179, 8, 0.5)' }} /> Regular
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded" style={{ backgroundColor: 'rgba(239, 68, 68, 0.6)' }} /> Malo
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-8 text-center">
                      Sin datos para mapa de calor
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── TAB: RECIENTES ─────────────────────────── */}
            <TabsContent value="recientes" className="mt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Últimas 100 métricas registradas
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left font-medium text-muted-foreground px-4 py-2">Fecha</th>
                          <th className="text-left font-medium text-muted-foreground px-4 py-2">Métrica</th>
                          <th className="text-right font-medium text-muted-foreground px-4 py-2">Valor</th>
                          <th className="text-center font-medium text-muted-foreground px-4 py-2">Rating</th>
                          <th className="text-left font-medium text-muted-foreground px-4 py-2">URL</th>
                          <th className="text-left font-medium text-muted-foreground px-4 py-2">Dispositivo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recent.map((r) => (
                          <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30">
                            <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">
                              {formatDate(r.createdAt)}
                            </td>
                            <td className="px-4 py-2 font-medium text-xs" title={METRIC_LABELS[r.name] || r.name}>{r.name}</td>
                            <td className="px-4 py-2 text-right text-xs font-mono tabular-nums">
                              {formatValue(r.name, r.value)}
                              <span className="text-muted-foreground ml-1">{METRIC_UNITS[r.name]}</span>
                            </td>
                            <td className="px-4 py-2 text-center">
                              <Badge
                                className="text-[10px]"
                                variant={r.rating === 'good' ? 'default' : r.rating === 'poor' ? 'destructive' : 'secondary'}
                              >
                                {r.rating === 'good' ? 'Bueno' : r.rating === 'needs-improvement' ? 'Regular' : 'Malo'}
                              </Badge>
                            </td>
                            <td className="px-4 py-2 text-xs text-muted-foreground max-w-[200px] truncate">
                              {r.url || '—'}
                            </td>
                            <td className="px-4 py-2 text-xs text-muted-foreground">
                              {r.userAgent ? (r.userAgent.toLowerCase().includes('mobile') ? 'Móvil' :
                                r.userAgent.toLowerCase().includes('tablet') ? 'Tablet' : 'Escritorio') : '—'}
                            </td>
                          </tr>
                        ))}
                        {recent.length === 0 && (
                          <tr>
                            <td colSpan={6} className="text-center py-8 text-muted-foreground">
                              Sin métricas registradas en este período
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── TAB: POR URL ───────────────────────────── */}
            <TabsContent value="urls" className="mt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-primary" />
                    Promedios por URL
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left font-medium text-muted-foreground px-4 py-2">URL</th>
                          <th className="text-left font-medium text-muted-foreground px-4 py-2">Métrica</th>
                          <th className="text-right font-medium text-muted-foreground px-4 py-2">Promedio</th>
                          <th className="text-right font-medium text-muted-foreground px-4 py-2">Min</th>
                          <th className="text-right font-medium text-muted-foreground px-4 py-2">Max</th>
                          <th className="text-right font-medium text-muted-foreground px-4 py-2">Muestras</th>
                        </tr>
                      </thead>
                      <tbody>
                        {byUrl.map((r, idx) => (
                          <tr key={idx} className="border-b border-border/50 hover:bg-muted/30">
                            <td className="px-4 py-2 text-xs max-w-[200px] truncate font-mono">
                              {r.url || '—'}
                            </td>
                            <td className="px-4 py-2 text-xs font-medium" title={METRIC_LABELS[r.metricName] || r.metricName}>{r.metricName}</td>
                            <td className="px-4 py-2 text-right text-xs font-mono tabular-nums"
                              style={{ color: getThresholdColor(r.metricName, r.avgValue) }}>
                              {formatValue(r.metricName, r.avgValue)}
                            </td>
                            <td className="px-4 py-2 text-right text-xs font-mono tabular-nums text-muted-foreground">
                              {formatValue(r.metricName, r.minValue)}
                            </td>
                            <td className="px-4 py-2 text-right text-xs font-mono tabular-nums text-muted-foreground">
                              {formatValue(r.metricName, r.maxValue)}
                            </td>
                            <td className="px-4 py-2 text-right text-xs tabular-nums">
                              {r.count}
                            </td>
                          </tr>
                        ))}
                        {byUrl.length === 0 && (
                          <tr>
                            <td colSpan={6} className="text-center py-8 text-muted-foreground">
                              Sin datos en este período
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
