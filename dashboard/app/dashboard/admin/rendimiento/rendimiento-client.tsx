'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Activity, Loader2, AlertCircle, BarChart3, PieChart as PieChartIcon,
  Clock, Gauge, Smartphone,
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';

type Period = '24h' | '7d' | '30d' | 'all';

const PERIODS: { value: Period; label: string }[] = [
  { value: '24h', label: '24 horas' },
  { value: '7d', label: '7 días' },
  { value: '30d', label: '30 días' },
  { value: 'all', label: 'Todo' },
];

const METRIC_LABELS: Record<string, string> = {
  LCP: 'Largest Contentful Paint',
  INP: 'Interaction to Next Paint',
  CLS: 'Cumulative Layout Shift',
  FCP: 'First Contentful Paint',
  TTFB: 'Time to First Byte',
};

const METRIC_UNITS: Record<string, string> = {
  LCP: 'ms',
  INP: 'ms',
  CLS: '',
  FCP: 'ms',
  TTFB: 'ms',
};

const RATING_COLORS: Record<string, string> = {
  good: '#22c55e',
  'needs-improvement': '#eab308',
  poor: '#ef4444',
};

interface MetricStat {
  name: string;
  avgValue: number;
  minValue: number;
  maxValue: number;
  count: number;
}

interface RatingDist {
  name: string;
  rating: string;
  count: number;
}

interface RecentEntry {
  id: string;
  name: string;
  value: string;
  rating: string;
  url: string | null;
  createdAt: string;
}

interface ByUrlRow {
  url: string | null;
  metricName: string;
  avgValue: number;
  minValue: number;
  maxValue: number;
  count: number;
}

export function WebVitalsClient() {
  const [period, setPeriod] = useState<Period>('24h');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<MetricStat[]>([]);
  const [ratingDist, setRatingDist] = useState<RatingDist[]>([]);
  const [total, setTotal] = useState(0);
  const [recent, setRecent] = useState<RecentEntry[]>([]);
  const [byUrl, setByUrl] = useState<ByUrlRow[]>([]);
  const [view, setView] = useState<'stats' | 'recent' | 'by-url'>('stats');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, recentRes, urlRes] = await Promise.all([
        fetch(`/api/web-vitals?period=${period}&view=stats`),
        fetch(`/api/web-vitals?period=${period}&view=recent`),
        fetch(`/api/web-vitals?period=${period}&view=by-url`),
      ]);

      if (!statsRes.ok || !recentRes.ok || !urlRes.ok) {
        throw new Error('Error al cargar datos');
      }

      const [statsJson, recentJson, urlJson] = await Promise.all([
        statsRes.json(), recentRes.json(), urlRes.json(),
      ]);

      setStats(statsJson.data?.stats || []);
      setRatingDist(statsJson.data?.ratingDistribution || []);
      setTotal(statsJson.data?.total || 0);
      setRecent(recentJson.data?.data || []);
      setByUrl(urlJson.data?.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatValue = (name: string, value: number | string) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '—';
    if (name === 'CLS') return num.toFixed(3);
    return Math.round(num).toLocaleString('es-CL');
  };

  const getBarColor = (name: string) => {
    const colors: Record<string, string> = {
      LCP: '#6366f1',
      INP: '#8b5cf6',
      CLS: '#a855f7',
      FCP: '#3b82f6',
      TTFB: '#06b6d4',
    };
    return colors[name] || '#6b7280';
  };

  const pieData = stats
    .map((s) => ({
      name: s.name,
      value: s.avgValue,
      fill: getBarColor(s.name),
    }))
    .filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <PageHeader
          title="Rendimiento Web"
          description="Core Web Vitals y métricas de rendimiento"
          icon={<Activity className="h-6 w-6" />}
        />
        <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
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
      </div>

      {/* Total metrics card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Métricas capturadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : total.toLocaleString('es-CL')}
            </p>
          </CardContent>
        </Card>
        {stats.map((s) => (
          <Card key={s.name}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Gauge className="h-4 w-4" />
                {s.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold" style={{ color: getBarColor(s.name) }}>
                {formatValue(s.name, s.avgValue)}
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  {METRIC_UNITS[s.name]}
                </span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                min {formatValue(s.name, s.minValue)} · máx {formatValue(s.name, s.maxValue)} · {s.count} muestras
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Charts section */}
          <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
            <TabsList>
              <TabsTrigger value="stats" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Promedios
              </TabsTrigger>
              <TabsTrigger value="recent" className="gap-2">
                <Clock className="h-4 w-4" />
                Recientes
              </TabsTrigger>
              <TabsTrigger value="by-url" className="gap-2">
                <Smartphone className="h-4 w-4" />
                Por URL
              </TabsTrigger>
            </TabsList>

            <TabsContent value="stats" className="mt-4 space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Bar chart: promedios por métrica */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-primary" />
                      Valores promedio por métrica
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={pieData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="name" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--popover))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                          formatter={(value: number, name: string) => [formatValue('', value), '']}
                          labelFormatter={(label: string) => METRIC_LABELS[label] || label}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {pieData.map((entry, idx) => (
                            <Cell key={idx} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Rating distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <PieChartIcon className="h-4 w-4 text-primary" />
                      Distribución de ratings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {stats.map((s) => {
                        const ratings = ratingDist.filter((r) => r.name === s.name);
                        const totalForMetric = ratings.reduce((acc, r) => acc + r.count, 0);
                        return (
                          <div key={s.name}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium">{s.name}</span>
                              <span className="text-xs text-muted-foreground">{totalForMetric} muestras</span>
                            </div>
                            <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                              {ratings.map((r) => (
                                <div
                                  key={r.rating}
                                  className="transition-all"
                                  style={{
                                    width: `${(r.count / totalForMetric) * 100}%`,
                                    backgroundColor: RATING_COLORS[r.rating] || '#6b7280',
                                  }}
                                  title={`${r.rating}: ${r.count} (${Math.round((r.count / totalForMetric) * 100)}%)`}
                                />
                              ))}
                            </div>
                            <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground">
                              {ratings.map((r) => (
                                <span key={r.rating} className="flex items-center gap-1">
                                  <span
                                    className="h-2 w-2 rounded-full"
                                    style={{ backgroundColor: RATING_COLORS[r.rating] }}
                                  />
                                  {r.rating === 'good' ? 'Bueno' : r.rating === 'needs-improvement' ? 'Regular' : 'Malo'}: {r.count}
                                </span>
                              ))}
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

            <TabsContent value="recent" className="mt-4">
              <Card>
                <CardHeader>
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
                        </tr>
                      </thead>
                      <tbody>
                        {recent.map((r) => (
                          <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30">
                            <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">
                              {new Date(r.createdAt).toLocaleString('es-CL')}
                            </td>
                            <td className="px-4 py-2 font-medium text-xs">{r.name}</td>
                            <td className="px-4 py-2 text-right text-xs font-mono tabular-nums">
                              {formatValue(r.name, Number(r.value))}
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
                          </tr>
                        ))}
                        {recent.length === 0 && (
                          <tr>
                            <td colSpan={5} className="text-center py-8 text-muted-foreground">
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

            <TabsContent value="by-url" className="mt-4">
              <Card>
                <CardHeader>
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
                            <td className="px-4 py-2 text-xs font-medium">{r.metricName}</td>
                            <td className="px-4 py-2 text-right text-xs font-mono tabular-nums">
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
