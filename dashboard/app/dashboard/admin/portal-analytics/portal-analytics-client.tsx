'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Activity, Loader2, AlertCircle, Smartphone, TrendingUp,
  RefreshCw, Users, Gauge, Clock,
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';

// ─── Types ─────────────────────────────────────────────────

type Period = '24h' | '7d' | '30d' | 'all';

const PERIODS: { value: Period; label: string }[] = [
  { value: '24h', label: '24 horas' },
  { value: '7d', label: '7 días' },
  { value: '30d', label: '30 días' },
  { value: 'all', label: 'Todo' },
];

const METRIC_LABELS: Record<string, string> = {
  LCP: 'LCP', INP: 'INP', CLS: 'CLS', FCP: 'FCP', TTFB: 'TTFB',
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

const METRIC_COLORS: Record<string, string> = {
  LCP: '#6366f1', INP: '#8b5cf6', CLS: '#a855f7',
  FCP: '#3b82f6', TTFB: '#06b6d4',
};

const DEVICE_COLORS: Record<string, string> = {
  desktop: '#6366f1', mobile: '#22c55e', tablet: '#eab308', unknown: '#6b7280',
};

const CATEGORY_COLORS: Record<string, string> = {
  'Portal Home': '#6366f1',
  'Booking Wizard': '#22c55e',
  'Mis Turnos': '#eab308',
  'Recetas': '#f97316',
  'Historial': '#06b6d4',
  'Encuestas': '#8b5cf6',
  'Reportes': '#ec4899',
  'Otras': '#6b7280',
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

function getThresholdColor(name: string, value: number): string {
  const t = METRIC_THRESHOLDS[name];
  if (!t) return '#6b7280';
  if (value <= t.good) return '#22c55e';
  if (value <= t.poor) return '#eab308';
  return '#ef4444';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-CL');
}

function formatBucket(bucket: string, bucketType: string) {
  const d = new Date(bucket);
  if (bucketType === 'hour') return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
}

function categorizeUrl(url: string | null): string {
  if (!url) return 'Otras';
  if (url === '/portal' || url === '/portal/') return 'Portal Home';
  if (url.startsWith('/portal/agendar')) return 'Booking Wizard';
  if (url.startsWith('/portal/mis-turnos')) return 'Mis Turnos';
  if (url.startsWith('/portal/mis-recetas')) return 'Recetas';
  if (url.startsWith('/portal/historial')) return 'Historial';
  if (url.startsWith('/portal/encuestas')) return 'Encuestas';
  if (url.startsWith('/portal/reportes')) return 'Reportes';
  return 'Otras';
}

// ─── Interfaces ────────────────────────────────────────────

interface MetricStat {
  name: string; avgValue: number; minValue: number; maxValue: number; count: number;
}
interface RatingDist { name: string; rating: string; count: number; }
interface TimelinePoint { bucket: string; name: string; avgValue: number; count: number; }
interface DeviceRow { name: string; device: string; avgValue: number; count: number; }
interface ComparisonRow { name: string; currentAvg: number; currentCount: number; prevAvg: number | null; prevCount: number; deltaPercent: number | null; improved: boolean | null; }
interface ByUrlRow { url: string | null; metricName: string; avgValue: number; minValue: number; maxValue: number; count: number; }

// ─── Main Component ────────────────────────────────────────

export function PortalAnalyticsClient() {
  const [period, setPeriod] = useState<Period>('24h');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data
  const [stats, setStats] = useState<MetricStat[]>([]);
  const [ratingDist, setRatingDist] = useState<RatingDist[]>([]);
  const [total, setTotal] = useState(0);
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [bucketType, setBucketType] = useState('hour');
  const [deviceData, setDeviceData] = useState<DeviceRow[]>([]);
  const [comparison, setComparison] = useState<ComparisonRow[]>([]);
  const [byUrl, setByUrl] = useState<ByUrlRow[]>([]);

  // ─── Fetch all data ────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const base = `/api/web-vitals?period=${period}&section=portal`;
      const [statsRes, timelineRes, deviceRes, compRes, urlRes] = await Promise.all([
        fetch(`${base}&view=stats`),
        fetch(`${base}&view=timeline`),
        fetch(`${base}&view=device`),
        fetch(`${base}&view=comparison`),
        fetch(`${base}&view=by-url`),
      ]);

      if (!statsRes.ok) throw new Error('Error al cargar datos');

      const [statsJson, timelineJson, deviceJson, compJson, urlJson] = await Promise.all([
        statsRes.json(), timelineRes.json(), deviceRes.json(),
        compRes.json(), urlRes.json(),
      ]);

      setStats(statsJson.data?.stats || []);
      setRatingDist(statsJson.data?.ratingDistribution || []);
      setTotal(statsJson.data?.total || 0);
      setTimeline(timelineJson.data?.data || []);
      setBucketType(timelineJson.data?.bucket || 'hour');
      setDeviceData(deviceJson.data?.data || []);
      setComparison(compJson.data?.data || []);
      setByUrl(urlJson.data?.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Derived: compliance % ─────────────────────────────
  function getCompliancePct(name: string): number {
    const totalForMetric = ratingDist.filter((r) => r.name === name).reduce((acc, r) => acc + r.count, 0);
    if (totalForMetric === 0) return 0;
    const good = ratingDist.filter((r) => r.name === name && r.rating === 'good').reduce((acc, r) => acc + r.count, 0);
    return Math.round((good / totalForMetric) * 100);
  }

  // ─── Derived: categorize by-url into portal sections ───
  const categories = byUrl.reduce<Record<string, { name: string; avgLcp: number; avgInp: number; avgCls: number; count: number; goodPct: number }>>((acc, row) => {
    const cat = categorizeUrl(row.url);
    if (!acc[cat]) acc[cat] = { name: cat, avgLcp: 0, avgInp: 0, avgCls: 0, count: 0, goodPct: 0 };
    if (row.metricName === 'LCP') acc[cat].avgLcp = row.avgValue;
    if (row.metricName === 'INP') acc[cat].avgInp = row.avgValue;
    if (row.metricName === 'CLS') acc[cat].avgCls = row.avgValue;
    if (row.metricName === 'LCP') acc[cat].count = row.count;
    return acc;
  }, {});

  const categoryList = Object.values(categories).sort((a, b) => b.count - a.count);

  // ─── Derived: mobile stats ─────────────────────────────
  const mobileData = deviceData.filter((d) => d.device === 'mobile');
  const mobilePct = total > 0
    ? Math.round((deviceData.filter((d) => d.device === 'mobile').reduce((a, d) => a + d.count, 0) / deviceData.reduce((a, d) => a + d.count, 0)) * 100)
    : 0;

  // ─── Derived: timeline chart data ──────────────────────
  const timelineBuckets = Array.from(new Set(timeline.map((t) => t.bucket))).sort();
  const timelineChartData = timelineBuckets.map((bucket) => {
    const point: Record<string, any> = { bucket };
    for (const metric of ['LCP', 'INP', 'CLS', 'FCP', 'TTFB'] as const) {
      const entry = timeline.find((t) => t.bucket === bucket && t.name === metric);
      point[metric] = entry ? entry.avgValue : null;
    }
    return point;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <PageHeader
          title="Portal Analytics"
          description="Métricas de rendimiento del portal del paciente"
          icon={<Smartphone className="h-6 w-6" />}
        />
        <div className="flex items-center gap-2 flex-wrap">
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
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
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
              KPIS
             ═══════════════════════════════════════════════════ */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Total */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Activity className="h-3 w-3" />
                  Métricas portal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{total.toLocaleString('es-CL')}</p>
              </CardContent>
            </Card>

            {/* LCP */}
            {stats.find((s) => s.name === 'LCP') && (() => {
              const s = stats.find((s) => s.name === 'LCP')!;
              return (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <Gauge className="h-3 w-3" style={{ color: METRIC_COLORS.LCP }} />
                      LCP promedio
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xl font-bold" style={{ color: getThresholdColor('LCP', s.avgValue) }}>
                      {formatValue('LCP', s.avgValue)}
                      <span className="text-xs font-normal text-muted-foreground ml-1">ms</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">{s.count} muestras</p>
                  </CardContent>
                </Card>
              );
            })()}

            {/* INP */}
            {stats.find((s) => s.name === 'INP') && (() => {
              const s = stats.find((s) => s.name === 'INP')!;
              return (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <Gauge className="h-3 w-3" style={{ color: METRIC_COLORS.INP }} />
                      INP promedio
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xl font-bold" style={{ color: getThresholdColor('INP', s.avgValue) }}>
                      {formatValue('INP', s.avgValue)}
                      <span className="text-xs font-normal text-muted-foreground ml-1">ms</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">{s.count} muestras</p>
                  </CardContent>
                </Card>
              );
            })()}

            {/* Good compliance */}
            {stats.length > 0 && (() => {
              const totalGood = stats.reduce((acc, s) => acc + getCompliancePct(s.name), 0);
              const avgGood = stats.length > 0 ? Math.round(totalGood / stats.length) : 0;
              return (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <Users className="h-3 w-3" />
                      Cumplimiento
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className={`text-xl font-bold ${avgGood >= 80 ? 'text-green-600' : avgGood >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {avgGood}%
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">promedio bueno</p>
                  </CardContent>
                </Card>
              );
            })()}

            {/* Mobile % */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Smartphone className="h-3 w-3" />
                  Mobile
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold text-emerald-500">{mobilePct}%</p>
                <p className="text-[10px] text-muted-foreground mt-1">accesos móviles</p>
              </CardContent>
            </Card>
          </div>

          {/* ═══════════════════════════════════════════════════
              PÁGINAS DEL PORTAL (agrupadas por categoría)
             ═══════════════════════════════════════════════════ */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-primary" />
                Rendimiento por sección del portal
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {categoryList.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left font-medium text-muted-foreground px-4 py-2">Sección</th>
                        <th className="text-right font-medium text-muted-foreground px-4 py-2">LCP</th>
                        <th className="text-right font-medium text-muted-foreground px-4 py-2">INP</th>
                        <th className="text-right font-medium text-muted-foreground px-4 py-2">CLS</th>
                        <th className="text-right font-medium text-muted-foreground px-4 py-2">Muestras</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryList.map((cat) => (
                        <tr key={cat.name} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="px-4 py-3 font-medium text-xs flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: CATEGORY_COLORS[cat.name] || '#6b7280' }} />
                            {cat.name}
                          </td>
                          <td className="px-4 py-3 text-right text-xs font-mono tabular-nums"
                            style={{ color: getThresholdColor('LCP', cat.avgLcp) }}>
                            {formatValue('LCP', cat.avgLcp)} ms
                          </td>
                          <td className="px-4 py-3 text-right text-xs font-mono tabular-nums"
                            style={{ color: getThresholdColor('INP', cat.avgInp) }}>
                            {formatValue('INP', cat.avgInp)} ms
                          </td>
                          <td className="px-4 py-3 text-right text-xs font-mono tabular-nums"
                            style={{ color: getThresholdColor('CLS', cat.avgCls) }}>
                            {formatValue('CLS', cat.avgCls)}
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                            {cat.count}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Sin datos del portal en este período
                </p>
              )}
            </CardContent>
          </Card>

          {/* ═══════════════════════════════════════════════════
              TABS: Timeline + Dispositivos + Comparativa
             ═══════════════════════════════════════════════════ */}
          <Tabs defaultValue="timeline">
            <TabsList className="flex-wrap">
              <TabsTrigger value="timeline" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                Tendencia
              </TabsTrigger>
              <TabsTrigger value="dispositivos" className="gap-2">
                <Smartphone className="h-4 w-4" />
                Dispositivos
              </TabsTrigger>
              <TabsTrigger value="comparativa" className="gap-2">
                <Clock className="h-4 w-4" />
                Comparativa
              </TabsTrigger>
            </TabsList>

            {/* ── Tab: Timeline ──────────────────────────── */}
            <TabsContent value="timeline" className="mt-4">
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
                      <LineChart data={timelineChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                          dataKey="bucket"
                          tickFormatter={(v) => formatBucket(v, bucketType)}
                          className="text-[10px]"
                          interval="preserveStartEnd"
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
                        <Legend formatter={(value: string) => <span className="text-xs">{value}</span>} />
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
            </TabsContent>

            {/* ── Tab: Dispositivos ──────────────────────── */}
            <TabsContent value="dispositivos" className="mt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-primary" />
                    Rendimiento por dispositivo (portal)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {deviceData.filter((d) => d.name === 'LCP').length > 0 ? (
                    <div className="space-y-4">
                      {['LCP', 'INP', 'CLS', 'FCP', 'TTFB'].map((metric) => {
                        const entries = deviceData.filter((d) => d.name === metric);
                        if (entries.length === 0) return null;
                        const totalForMetric = entries.reduce((a, d) => a + d.count, 0);
                        return (
                          <div key={metric}>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-sm font-medium">{metric}</span>
                              <span className="text-xs text-muted-foreground">{totalForMetric} muestras</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {['desktop', 'mobile', 'tablet'].map((dev) => {
                                const entry = entries.find((d) => d.device === dev);
                                if (!entry) return null;
                                return (
                                  <div key={dev} className="bg-muted/30 rounded-lg p-2.5">
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: DEVICE_COLORS[dev] }} />
                                      {dev === 'desktop' ? 'Escritorio' : dev === 'mobile' ? 'Móvil' : 'Tablet'}
                                    </div>
                                    <p className="text-base font-bold font-mono" style={{ color: getThresholdColor(metric, entry.avgValue) }}>
                                      {formatValue(metric, entry.avgValue)}
                                      <span className="text-xs font-normal text-muted-foreground ml-1">{METRIC_UNITS[metric]}</span>
                                    </p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">{entry.count} muestras</p>
                                  </div>
                                );
                              })}
                            </div>
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
            </TabsContent>

            {/* ── Tab: Comparativa ────────────────────────── */}
            <TabsContent value="comparativa" className="mt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Evolución del portal vs período anterior
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {comparison.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left font-medium text-muted-foreground px-4 py-2">Métrica</th>
                            <th className="text-right font-medium text-muted-foreground px-4 py-2">Actual</th>
                            <th className="text-right font-medium text-muted-foreground px-4 py-2">Anterior</th>
                            <th className="text-right font-medium text-muted-foreground px-4 py-2">Cambio</th>
                            <th className="text-right font-medium text-muted-foreground px-4 py-2">Muestras</th>
                          </tr>
                        </thead>
                        <tbody>
                          {comparison.map((c) => (
                            <tr key={c.name} className="border-b border-border/50 hover:bg-muted/30">
                              <td className="px-4 py-2 font-medium text-sm">{c.name}</td>
                              <td className="px-4 py-2 text-right font-mono tabular-nums">
                                {formatValue(c.name, c.currentAvg)}
                                <span className="text-muted-foreground ml-1">{METRIC_UNITS[c.name]}</span>
                              </td>
                              <td className="px-4 py-2 text-right font-mono tabular-nums text-muted-foreground">
                                {c.prevAvg !== null ? formatValue(c.name, c.prevAvg) : '—'}
                              </td>
                              <td className="px-4 py-2 text-right">
                                {c.deltaPercent !== null ? (
                                  <span className={`inline-flex items-center gap-1 font-medium ${
                                    c.improved ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {c.improved ? '↓' : '↑'} {Math.abs(c.deltaPercent)}%
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                              <td className="px-4 py-2 text-right text-muted-foreground">{c.currentCount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-8 text-center">
                      Sin datos suficientes para comparar
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* ═══════════════════════════════════════════════════
              Resumen de estado
             ═══════════════════════════════════════════════════ */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Resumen de rendimiento del portal
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.length > 0 ? (
                <div className="space-y-3">
                  {stats.map((s) => {
                    const goodPct = getCompliancePct(s.name);
                    return (
                      <div key={s.name}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{s.name}</span>
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                            goodPct >= 80 ? 'text-green-700 bg-green-100' :
                            goodPct >= 50 ? 'text-yellow-700 bg-yellow-100' :
                            'text-red-700 bg-red-100'
                          }`}>
                            {goodPct}% bueno
                          </span>
                        </div>
                        <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                          {['good', 'needs-improvement', 'poor'].map((rating) => {
                            const cnt = ratingDist.filter((r) => r.name === s.name && r.rating === rating).reduce((a, r) => a + r.count, 0);
                            const totalForMetric = ratingDist.filter((r) => r.name === s.name).reduce((a, r) => a + r.count, 0);
                            const pct = totalForMetric > 0 ? (cnt / totalForMetric) * 100 : 0;
                            return pct > 0 ? (
                              <div
                                key={rating}
                                style={{
                                  width: `${pct}%`,
                                  backgroundColor: rating === 'good' ? '#22c55e' : rating === 'needs-improvement' ? '#eab308' : '#ef4444',
                                  transition: 'width 0.3s ease',
                                }}
                              />
                            ) : null;
                          })}
                        </div>
                        <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground">
                          <span>Promedio: {formatValue(s.name, s.avgValue)} {METRIC_UNITS[s.name]}</span>
                          <span>Mín: {formatValue(s.name, s.minValue)}</span>
                          <span>Máx: {formatValue(s.name, s.maxValue)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Sin datos del portal en este período
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
