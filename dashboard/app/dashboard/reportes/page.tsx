'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { canAccess } from '@/lib/features';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import {
  TrendingUp, TrendingDown, MessageSquare, Calendar, Activity,
  Download, BarChart3, PieChart, Mail, CheckCircle2,
  Clock, ArrowUpRight, Users, Phone, XCircle, FileSpreadsheet,
  FileText, Loader2, AlertCircle, Award, DollarSign,
} from 'lucide-react';
import { escapeHtml } from '@/lib/html-utils';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PageHeader } from '@/components/page-header';
import type { TurnoDia } from '@/components/charts/turnos-chart';
import type { WhatsAppVolumen } from '@/components/charts/volumen-whatsapp-chart';
import type { DistribucionEstado } from '@/components/charts/distribucion-estados-chart';
import type { ComparativaData } from '@/components/reportes/comparativa-mensual';

// ─── Types ──────────────────────────────────────────────────

type Periodo = 'semana' | 'mes' | 'año';

interface ReporteApiResponse {
  metricas: { titulo: string; valor: string; cambio: string; icon: string; up: boolean }[];
  turnos: TurnoDia[];
  nuevosPacientes: number[];
  turnosKpis: { total: number; asistencia: string; duracion: string; cambioTotal: string };
  distribucionEstados: DistribucionEstado[];
  pacientesKpis: { total: number; nuevos: number; frecuentes: number; edadPromedio: number };
  nuevosPacientesLabels: string[];
  volumenWhatsApp: WhatsAppVolumen[];
  canalesContacto: { canal: string; porcentaje: number }[];
  calidadRespuesta: { tasa: string; tiempo: string; msgsPorConv: string };
  intenciones: { intencion: string; cantidad: number; porcentaje: number }[];
  whatsapp: { titulo: string; valor: string; cambio: string; up: boolean }[];
  prediccion?: { dia: string; real: number | null; estimado: number; min: number; max: number }[];
  conversionLeads?: { etapa: string; cantidad: number; porcentaje: number }[];
  ejecutivo?: {
    totalIngresos: string; ingresosCambio: string; tasaOcupacion: string;
    ocupacionCambio: string; satisfaccion: string;
    nps: number; leadsConvertidos: number; leadsTotales: number;
  };
  _demo?: boolean;
  _comparativa?: ComparativaData;
}

// ─── Charts (dynamic import, no SSR) ───────────────────────

const TurnosChart = dynamic(() => import('@/components/charts/turnos-chart'), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse rounded-lg bg-muted" />,
});
const NuevosPacientesChart = dynamic(() => import('@/components/charts/nuevos-pacientes-chart'), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse rounded-lg bg-muted" />,
});
const VolumenWhatsAppChart = dynamic(() => import('@/components/charts/volumen-whatsapp-chart'), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse rounded-lg bg-muted" />,
});
const DistribucionEstadosChart = dynamic(() => import('@/components/charts/distribucion-estados-chart'), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse rounded-lg bg-muted" />,
});
const ComparativaMensual = dynamic(() => import('@/components/reportes/comparativa-mensual'), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse rounded-lg bg-muted" />,
});
const PrediccionDemanda = dynamic(() => import('@/components/reportes/prediccion-demanda'), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse rounded-lg bg-muted" />,
});
const ConversionFunnel = dynamic(() => import('@/components/reportes/conversion-funnel'), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse rounded-lg bg-muted" />,
});

const iconosIntencion = [
  MessageSquare, Calendar, XCircle, Activity, TrendingUp, MessageSquare,
];

const iconNames: Record<string, React.ElementType> = {
  calendar: Calendar,
  users: Users,
  'trending-up': TrendingUp,
  'message-square': MessageSquare,
};

export default function ReportesPage() {
  const { data: session } = useSession();
  const userPlan = session?.user?.plan ?? 'free';
  const isAdvancedReports = canAccess(userPlan, 'reportes-avanzados');

  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const [fetchKey, setFetchKey] = useState(0);
  const [data, setData] = useState<ReporteApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch desde API ──────────────────────────────────────
  // Stale-while-revalidate: mantiene datos viejos visibles mientras carga
  useEffect(() => {
    const fetchReportes = async () => {
      if (data) {
        // Ya hay datos previos → refresco silencioso
        setIsRefreshing(true);
      } else {
        // Primera carga → muestra skeleton
        setLoading(true);
      }
      setError(null);
      try {
        const res = await fetch(`/api/reportes?periodo=${periodo}&demo=true`);
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error('[Reportes] Error fetching:', err);
        setError('No se pudieron cargar los reportes. Intentalo de nuevo.');
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    };
    fetchReportes();
  }, [periodo, fetchKey]);

  const reintentar = () => setFetchKey(k => k + 1);

  // ── Exportar ──────────────────────────────────────────────

  const exportarReporte = (formato: 'pdf' | 'excel') => {
    if (!data) return;
    const periodoLabel = periodo === 'semana' ? 'Semanal' : periodo === 'mes' ? 'Mensual' : 'Anual';
    const fechaHoy = new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
    const maxTurnos = Math.max(...data.turnos.map(t => t.cantidad)) || 1;
    const maxIntencion = Math.max(...data.intenciones.map(i => i.cantidad)) || 1;

    const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Reporte ${periodoLabel} - ${fechaHoy}</title>
<style>
  @page { margin: 12mm 15mm; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Helvetica', Arial, sans-serif; color:#1a1a1a; font-size:11px; line-height:1.4; }
  .header { text-align:center; padding-bottom:12px; border-bottom:3px solid #2563eb; margin-bottom:16px; }
  .header h1 { font-size:22px; color:#2563eb; margin-bottom:2px; }
  .header p { font-size:10px; color:#666; }
  .section-title { font-size:13px; color:#2563eb; margin:16px 0 8px; border-bottom:1px solid #e5e5e5; padding-bottom:4px; font-weight:600; }
  .kpi-grid { display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:8px; margin-bottom:14px; }
  .kpi-card { background:linear-gradient(135deg,#f8f9fa,#fff); border:1px solid #e5e5e5; border-radius:6px; padding:8px; text-align:center; }
  .kpi-card .val { font-size:16px; font-weight:700; color:#2563eb; }
  .kpi-card .lbl { font-size:8px; color:#888; text-transform:uppercase; letter-spacing:0.3px; }
  
  .chart-box { position:relative; height:130px; margin-bottom:10px; }
  .chart-line { position:absolute; left:0; right:0; border-top:1px dashed #e0e0e0; }
  .chart-line span { position:absolute; left:-24px; top:-6px; font-size:8px; color:#aaa; }
  .chart-bars { position:absolute; inset:0; display:flex; align-items:flex-end; justify-content:space-around; gap:6px; padding: 0 4px; }
  .chart-col { flex:1; display:flex; flex-direction:column; align-items:center; gap:2px; height:100%; justify-content:flex-end; }
  .chart-bar { width:100%; border-radius:2px; transition:none; }
  .chart-num { font-size:9px; font-weight:700; color:#333; line-height:1; }
  .chart-label { font-size:7px; color:#666; font-weight:500; }
  
  .hc-row { display:flex; align-items:center; gap:8px; margin-bottom:5px; }
  .hc-bar-wrap { flex:1; background:#f0f0f0; border-radius:3px; height:12px; overflow:hidden; }
  .hc-bar { height:100%; border-radius:3px; }
  .hc-label { font-size:9px; min-width:70px; font-weight:500; }
  .hc-pct { font-size:9px; min-width:26px; text-align:right; color:#666; font-weight:600; }

  table { width:100%; border-collapse:collapse; margin-bottom:10px; }
  th, td { padding:4px 6px; text-align:left; border-bottom:1px solid #eee; font-size:10px; }
  th { background:#f5f6f8; font-weight:600; color:#444; font-size:9px; text-transform:uppercase; letter-spacing:0.3px; }

  .footer { margin-top:20px; padding-top:10px; border-top:1px solid #ddd; text-align:center; font-size:9px; color:#999; }
  .print-btn { text-align:center; margin-top:16px; }
  .print-btn button { padding:8px 24px; background:linear-gradient(135deg,#2563eb,#1d4ed8); color:white; border:none; border-radius:6px; font-size:12px; cursor:pointer; box-shadow:0 2px 8px #2563eb40; }
  @media print { .print-btn { display:none; } }
</style></head>
<body>
<div class="header">
  <h1>📊 Reporte ${periodoLabel}</h1>
  <p>${fechaHoy} · Consultorio Médico · Sistema de Gestión</p>
</div>

<div class="section-title">📈 Métricas Generales</div>
<div class="kpi-grid">
  ${data.metricas.map(m => `<div class="kpi-card"><div class="val">${escapeHtml(m.valor)}</div><div class="lbl">${escapeHtml(m.titulo)}</div><div style="font-size:8px;color:${m.up ? '#10b981' : '#ef4444'};margin-top:2px">${escapeHtml(m.cambio)}</div></div>`).join('')}
</div>

<div class="section-title">📅 Turnos por Día</div>
<div style="background:#fafafa;border-radius:6px;padding:10px;border:1px solid #eee;margin-bottom:10px">
  <div class="chart-box">
    ${[0.25, 0.5, 0.75].map(f => `<div class="chart-line" style="bottom:${f * 100}%"><span>${Math.round(maxTurnos * f)}</span></div>`).join('')}
    <div class="chart-bars">
      ${data.turnos.map((t, i) => {
        const pct = Math.max((t.cantidad / maxTurnos) * 100, 5);
        const colores = ['#3b82f6','#60a5fa','#2563eb','#1d4ed8','#93c5fd','#818cf8'];
        return `<div class="chart-col">
          <div class="chart-num">${escapeHtml(String(t.cantidad))}</div>
          <div class="chart-bar" style="height:${pct}%;background-color:${colores[i % colores.length]}"></div>
          <div class="chart-label">${escapeHtml(t.dia)}</div>
        </div>`;
      }).join('')}
    </div>
  </div>
  <div style="display:flex;gap:10px;font-size:7px;color:#888;margin-top:4px;justify-content:center">
    <span>✅ Completados</span><span>❌ Cancelados</span><span>⏳ Ausentes</span>
  </div>
</div>

<div class="section-title">💬 Intenciones de Mensajes</div>
<div style="background:#fafafa;border-radius:6px;padding:10px;border:1px solid #eee;margin-bottom:10px">
  ${data.intenciones.map((item, idx) => {
    const colores = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#64748b'];
    return `<div class="hc-row">
      <div class="hc-label">${escapeHtml(item.intencion)}</div>
      <div class="hc-bar-wrap"><div class="hc-bar" style="width:${(item.cantidad / maxIntencion) * 100}%;background-color:${colores[idx]}\"></div></div>
      <div class="hc-pct">${escapeHtml(String(item.porcentaje))}%</div>
    </div>`;
  }).join('')}
</div>

<div class="section-title">📱 WhatsApp</div>
<table>
  <tr><th>Métrica</th><th>Valor</th><th>Cambio</th></tr>
  ${data.whatsapp.map(w => `<tr><td>${escapeHtml(w.titulo)}</td><td style="font-weight:600">${escapeHtml(w.valor)}</td><td style="color:${w.up ? '#10b981' : '#ef4444'}">${escapeHtml(w.cambio)}</td></tr>`).join('')}
</table>

<div class="section-title">👥 Pacientes</div>
<table>
  <tr><th>Métrica</th><th>Valor</th></tr>
  <tr><td>Total pacientes</td><td style="font-weight:600">${escapeHtml(String(data.pacientesKpis.total))}</td></tr>
  <tr><td>Nuevos en el período</td><td style="font-weight:600">${escapeHtml(String(data.pacientesKpis.nuevos))}</td></tr>
  <tr><td>Edad promedio</td><td style="font-weight:600">${escapeHtml(String(data.pacientesKpis.edadPromedio))} años</td></tr>
</table>

${data.ejecutivo ? `
<div class="section-title">🏆 Resumen Ejecutivo</div>
<table>
  <tr><th>Indicador</th><th>Valor</th></tr>
  <tr><td>Ingresos Proyectados</td><td style="font-weight:600">${escapeHtml(data.ejecutivo.totalIngresos)}</td></tr>
  <tr><td>Ocupación</td><td style="font-weight:600">${escapeHtml(data.ejecutivo.tasaOcupacion)}</td></tr>
  <tr><td>Satisfacción</td><td style="font-weight:600">${escapeHtml(data.ejecutivo.satisfaccion)}</td></tr>
  <tr><td>NPS</td><td style="font-weight:600">${escapeHtml(String(data.ejecutivo.nps))}</td></tr>
</table>

<div style="margin-bottom:10px">${data.conversionLeads ? `
<div class="section-title">🔄 Embudo de Conversión</div>
<table>
  <tr><th>Etapa</th><th>Cantidad</th><th>%</th></tr>
  ${data.conversionLeads.map(c => `<tr><td>${escapeHtml(c.etapa)}</td><td style="font-weight:600">${escapeHtml(String(c.cantidad))}</td><td>${escapeHtml(String(c.porcentaje))}%</td></tr>`).join('')}
</table>` : ''}</div>
` : ''}

<div class="footer">
  <strong>Consultorio Médico</strong> · Reporte generado automáticamente el ${fechaHoy}
</div>
<div class="print-btn">
  <button onclick="window.print()">🖨️ Guardar como PDF</button>
  <p style="font-size:10px;color:#888;margin-top:4px">Seleccioná "Guardar como PDF" en el diálogo de impresión</p>
</div>
</body></html>`;

    if (formato === 'excel') {
      try {
        import('@/lib/export-reporte-excel').then(({ exportReporteExcel }) => {
          exportReporteExcel({
            periodo,
            datos: {
              metricas: data.metricas.map(m => ({
                ...m, icon: Calendar,
              })) as any,
              turnos: data.turnos,
              whatsapp: data.whatsapp,
              nuevosPacientes: data.nuevosPacientes,
              turnosKpis: data.turnosKpis,
              distribucionEstados: data.distribucionEstados,
              pacientesKpis: data.pacientesKpis,
              nuevosPacientesLabels: data.nuevosPacientesLabels,
              volumenWhatsApp: data.volumenWhatsApp,
              canalesContacto: data.canalesContacto,
              calidadRespuesta: data.calidadRespuesta,
            },
            intenciones: data.intenciones,
            pacientesObraSocial: [{ obra: 'Total', cantidad: data.pacientesKpis.total }],
            fecha: fechaHoy,
          });
          toast({ title: '📊 Excel descargado', description: `Reporte ${periodoLabel} exportado correctamente` });
        });
      } catch {
        toast({ title: '❌ Error', description: 'No se pudo generar el archivo Excel', variant: 'destructive' });
      }
      return;
    }

    const ventana = window.open('', '_blank');
    if (ventana) {
      ventana.document.write(html);
      ventana.document.close();
    } else {
      toast({ title: '❌ Error', description: 'Permití ventanas emergentes', variant: 'destructive' });
    }
    toast({ title: '📊 Reporte generado', description: `Período ${periodoLabel} - Abrí la ventana para guardar como PDF` });
  };

  // ── UI: Loading (solo primera carga) ─────────────────────
  if (loading && !data) {
    return (
      <div className="space-y-6 animate-in">
        <PageHeader title="Reportes" description="Cargando métricas del consultorio..." />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.2 }}
            >
              <Card>
                <CardContent className="p-4">
                  <div className="h-3 w-24 bg-muted rounded animate-pulse mb-2" />
                  <div className="h-7 w-16 bg-muted rounded animate-pulse mb-1" />
                  <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.05, duration: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <div className="h-5 w-40 bg-muted rounded animate-pulse" />
                </CardHeader>
                <CardContent>
                  <div className="h-52 bg-muted rounded animate-pulse" />
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  // ── UI: Error (solo si no hay datos previos) ─────────────
  if ((error && !data) || (!loading && !data && !error)) {
    return (
      <div className="space-y-6 animate-in">
        <PageHeader title="Reportes" description="Métricas y estadísticas del consultorio" />
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-10 w-10 text-destructive mb-3" />
            <p className="text-sm font-medium text-destructive mb-1">Error al cargar reportes</p>
            <p className="text-xs text-muted-foreground mb-4">{error || 'No hay datos disponibles'}</p>
            <Button variant="outline" size="sm" onClick={reintentar}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Si no hay datos (loading + no data todavía), no renderizar nada
  if (!data) return null;

  // ── UI: Normal ───────────────────────────────────────────
  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <PageHeader title="Reportes" description="Métricas y estadísticas del consultorio" />
          {isRefreshing && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground animate-in fade-in">
              <Loader2 className="h-3 w-3 animate-spin" />
              Actualizando...
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border p-1">
            <Button variant={periodo === 'semana' ? 'secondary' : 'ghost'} size="sm" onClick={() => setPeriodo('semana')}>
              Semana
            </Button>
            <Button variant={periodo === 'mes' ? 'secondary' : 'ghost'} size="sm" onClick={() => setPeriodo('mes')}>
              Mes
            </Button>
            <Button variant={periodo === 'año' ? 'secondary' : 'ghost'} size="sm" onClick={() => setPeriodo('año')}>
              Año
            </Button>
          </div>
          {isAdvancedReports && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1" />
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[180px]">
              <DropdownMenuItem onClick={() => exportarReporte('pdf')}>
                <FileText className="h-4 w-4 mr-2" />
                Exportar PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportarReporte('excel')}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Exportar Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          )}
          <Badge variant="outline" className={`group relative text-[10px] cursor-default select-none ${data?._demo ? 'text-amber-600 border-amber-200 dark:text-amber-400 dark:border-amber-800' : 'text-emerald-600 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800'}`}>
            {data?._demo ? '⚡ Datos demo' : '✅ Datos reales'}
            {data?._demo && (
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-10">
                <span className="whitespace-nowrap bg-foreground text-background text-[10px] px-2 py-1 rounded shadow-md">
                  Datos ilustrativos — conectá la DB para datos reales
                </span>
              </span>
            )}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="overflow-x-auto flex-nowrap w-full">
          <TabsTrigger value="general" className="px-2 sm:px-3">
            <BarChart3 className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">General</span>
          </TabsTrigger>
          <TabsTrigger value="turnos" className="px-2 sm:px-3">
            <Calendar className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Turnos</span>
          </TabsTrigger>
          <TabsTrigger value="pacientes" className="px-2 sm:px-3">
            <Users className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Pacientes</span>
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="px-2 sm:px-3">
            <MessageSquare className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">WhatsApp</span>
          </TabsTrigger>
          <TabsTrigger value="comparativa" className="px-2 sm:px-3">
            <TrendingUp className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Comparativa</span>
          </TabsTrigger>
          <TabsTrigger value="ejecutivo" className="px-2 sm:px-3">
            <Award className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Ejecutivo</span>
          </TabsTrigger>
        </TabsList>

        {/* ============ TAB GENERAL ============ */}
        <TabsContent value="general" className="mt-4 space-y-6">
          {/* KPIs */}
          <motion.div
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
          >
            {data.metricas.map((m) => {
              const Icon = iconNames[m.icon] || Calendar;
              return (
                <motion.div
                  key={m.titulo}
                  variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                  <Card className="relative overflow-hidden transition-[transform,box-shadow] duration-200 hoverable:hover:-translate-y-[1px] hoverable:hover:shadow-card-hover">
                    <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${m.up ? 'from-emerald-400 to-emerald-600' : 'from-red-400 to-red-600'}`} />
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">{m.titulo}</CardTitle>
                      <div className={`p-1.5 rounded-md ${m.up ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400' : 'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400'}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{m.valor}</div>
                      <div className="flex items-center gap-1 mt-1">
                        {m.up ? (
                          <TrendingUp className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-red-500" />
                        )}
                        <span className={`text-xs ${m.up ? 'text-emerald-600' : 'text-red-600'}`}>
                          {m.cambio} vs período anterior
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>

          <motion.div
            className="grid gap-6 lg:grid-cols-2"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
          >
            {/* Gráfico Turnos por día */}
            <motion.div variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }} transition={{ duration: 0.2, ease: 'easeOut' }}>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Turnos por día
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <TurnosChart data={data.turnos} />
              </CardContent>
            </Card>
            </motion.div>

            {/* Intenciones */}
            <motion.div variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }} transition={{ duration: 0.2, ease: 'easeOut' }}>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-primary" />
                  Intenciones de mensajes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-5">
                  {data.intenciones.map((item, idx) => {
                    const Icon = iconosIntencion[idx];
                    const colores = [
                      'from-blue-500 to-blue-600', 'from-emerald-500 to-emerald-600',
                      'from-amber-500 to-amber-600', 'from-purple-500 to-purple-600',
                      'from-red-500 to-red-600', 'from-slate-500 to-slate-600',
                    ];
                    return (
                      <div key={item.intencion}>
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="flex items-center gap-2 font-medium">
                            <div className={`h-6 w-6 rounded-md bg-gradient-to-br ${colores[idx]} flex items-center justify-center`}>
                              <Icon className="h-3 w-3 text-white" />
                            </div>
                            {item.intencion}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{item.cantidad}</span>
                            <span className="text-[11px] font-mono px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
                              {item.porcentaje}%
                            </span>
                          </div>
                        </div>
                        <div className="h-3 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${colores[idx]} origin-left transition-transform duration-300 ease-out`}
                            style={{ transform: `scaleX(${item.porcentaje / 100})`, width: '100%' }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
            </motion.div>
          </motion.div>
        </TabsContent>

        {/* ============ TAB TURNOS ============ */}
        <TabsContent value="turnos" className="mt-4 space-y-4">
          <motion.div
            className="grid gap-4 md:grid-cols-3"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
          >
            <motion.div
              variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <Card className="relative overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-blue-400 to-blue-600" />
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Turnos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.turnosKpis.total}</div>
                  <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
                    <ArrowUpRight className="h-3 w-3" /> {data.turnosKpis.cambioTotal} este {periodo === 'año' ? 'año' : periodo === 'mes' ? 'mes' : 'período'}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div
              variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <Card className="relative overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-emerald-400 to-emerald-600" />
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Tasa de Asistencia</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.turnosKpis.asistencia}</div>
                  <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
                    <ArrowUpRight className="h-3 w-3" /> vs período anterior
                  </p>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div
              variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <Card className="relative overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-purple-400 to-purple-600" />
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Duración Promedio</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.turnosKpis.duracion}</div>
                  <p className="text-xs text-muted-foreground mt-1">Por consulta</p>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.1, ease: 'easeOut' }}
          >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Distribución por Estado</CardTitle>
            </CardHeader>
            <CardContent>
              <DistribucionEstadosChart data={data.distribucionEstados} />
            </CardContent>
          </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.15, ease: 'easeOut' }}
          >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                Datos desde la DB
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>✓ Turnos, pacientes y conversaciones con datos reales del consultorio</p>
                <p>✓ Períodos comparativos calculados automáticamente</p>
                <p>✓ Distribución de estados, volumen WhatsApp e intenciones en vivo</p>
              </div>
            </CardContent>
          </Card>
          </motion.div>
        </TabsContent>

        {/* ============ TAB PACIENTES ============ */}
        <TabsContent value="pacientes" className="mt-4 space-y-4">
          <motion.div
            className="grid gap-4 md:grid-cols-3"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
          >
            <motion.div
              variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <Card className="relative overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-blue-400 to-blue-600" />
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {periodo === 'año' ? 'Total Pacientes' : 'Pacientes Activos'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.pacientesKpis.total}</div>
                  <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
                    <ArrowUpRight className="h-3 w-3" /> +{data.pacientesKpis.nuevos} nuevos este {periodo === 'año' ? 'año' : periodo === 'mes' ? 'mes' : 'período'}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div
              variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <Card className="relative overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-amber-400 to-amber-600" />
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Pacientes Frecuentes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.pacientesKpis.frecuentes}</div>
                  <p className="text-xs text-muted-foreground mt-1">+3 turnos en los últimos 6 meses</p>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div
              variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <Card className="relative overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-purple-400 to-purple-600" />
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Edad Promedio</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.pacientesKpis.edadPromedio}</div>
                  <p className="text-xs text-muted-foreground mt-1">De pacientes registrados</p>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Nuevos Pacientes</CardTitle>
              </CardHeader>
              <CardContent>
                <NuevosPacientesChart
                  data={data.nuevosPacientes.map((val, i) => ({
                    label: data.nuevosPacientesLabels[i] || `#${i + 1}`,
                    valor: val,
                  }))}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resumen de Pacientes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-primary/5 p-3 text-center">
                    <p className="text-2xl font-bold text-primary">{data.pacientesKpis.total}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                  <div className="rounded-lg bg-emerald-500/5 p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-600">{data.pacientesKpis.nuevos}</p>
                    <p className="text-xs text-muted-foreground">Nuevos</p>
                  </div>
                  <div className="rounded-lg bg-amber-500/5 p-3 text-center">
                    <p className="text-2xl font-bold text-amber-600">{data.pacientesKpis.frecuentes}</p>
                    <p className="text-xs text-muted-foreground">Frecuentes</p>
                  </div>
                  <div className="rounded-lg bg-blue-500/5 p-3 text-center">
                    <p className="text-2xl font-bold text-blue-600">{data.pacientesKpis.edadPromedio}</p>
                    <p className="text-xs text-muted-foreground">Edad prom.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ============ TAB WHATSAPP ============ */}
        <TabsContent value="whatsapp" className="mt-4 space-y-6">
          <motion.div
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
          >
            {data.whatsapp.map((m) => (
              <motion.div
                key={m.titulo}
                variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <Card className="relative overflow-hidden">
                  <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${m.up ? 'from-emerald-400 to-emerald-600' : 'from-red-400 to-red-600'}`} />
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{m.titulo}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{m.valor}</div>
                    <div className="flex items-center gap-1 mt-1">
                      {m.up ? (
                        <TrendingUp className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-500" />
                      )}
                      <span className={`text-xs ${m.up ? 'text-emerald-600' : 'text-red-600'}`}>{m.cambio}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Volumen de Mensajes</CardTitle>
              </CardHeader>
              <CardContent>
                <VolumenWhatsAppChart data={data.volumenWhatsApp} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Canales de Contacto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(() => {
                  const iconosCanal = [MessageSquare, Mail, Phone, Activity];
                  const coloresCanal = ['bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500'];
                  return data.canalesContacto.map((item, i) => {
                    const Icon = iconosCanal[i] || MessageSquare;
                    return (
                      <div key={item.canal}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="flex items-center gap-2">
                            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                            {item.canal}
                          </span>
                          <span className="font-medium">{item.porcentaje}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full ${coloresCanal[i] || 'bg-emerald-500'} rounded-full origin-left transition-transform duration-300 ease-out`} style={{ transform: `scaleX(${item.porcentaje / 100})`, width: '100%' }} />
                        </div>
                      </div>
                    );
                  });
                })()}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Calidad de Respuesta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="text-center p-3 sm:p-4 rounded-lg bg-emerald-500/5">
                  <CheckCircle2 className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-500 mx-auto mb-1 sm:mb-2" />
                  <p className="text-xl sm:text-2xl font-bold text-emerald-600">{data.calidadRespuesta.tasa}</p>
                  <p className="text-xs text-muted-foreground">Tasa de respuesta</p>
                </div>
                <div className="text-center p-3 sm:p-4 rounded-lg bg-blue-500/5">
                  <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 mx-auto mb-1 sm:mb-2" />
                  <p className="text-xl sm:text-2xl font-bold text-blue-600">{data.calidadRespuesta.tiempo}</p>
                  <p className="text-xs text-muted-foreground">Tiempo promedio</p>
                </div>
                <div className="text-center p-3 sm:p-4 rounded-lg bg-purple-500/5">
                  <MessageSquare className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500 mx-auto mb-1 sm:mb-2" />
                  <p className="text-xl sm:text-2xl font-bold text-purple-600">{data.calidadRespuesta.msgsPorConv}</p>
                  <p className="text-xs text-muted-foreground">Mensajes por conv.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ TAB COMPARATIVA ============ */}
        <TabsContent value="comparativa" className="mt-4">
          {data._comparativa ? (
            <ComparativaMensual data={data._comparativa} periodo={periodo} />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Datos comparativos no disponibles para este período</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ============ TAB EJECUTIVO ============ */}
        <TabsContent value="ejecutivo" className="mt-4 space-y-6">
          {data?.ejecutivo ? (
            <>
              {/* KPIs ejecutivos */}
              <motion.div
                className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
                initial="hidden"
                animate="visible"
                variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
              >
                {[
                  { label: 'Ingresos Proyectados', valor: data.ejecutivo.totalIngresos, icon: DollarSign, up: true },
                  { label: 'Ocupación', valor: data.ejecutivo.tasaOcupacion, icon: Calendar, up: true },
                  { label: 'Satisfacción', valor: data.ejecutivo.satisfaccion, icon: Award, up: true },
                  { label: 'NPS', valor: data.ejecutivo.nps, icon: TrendingUp, up: data.ejecutivo.nps >= 50 },
                ].map((kpi) => (
                  <motion.div
                    key={kpi.label}
                    variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
                  >
                    <Card>
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{kpi.label}</span>
                          <kpi.icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-bold">{kpi.valor}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>

              {/* Predicción de demanda */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Predicción de Demanda — Próximos 30 Días
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {data.prediccion ? (
                    <PrediccionDemanda data={data.prediccion} />
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">Datos de predicción no disponibles</p>
                  )}
                </CardContent>
              </Card>

              {/* Embudo de conversión */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Embudo de Conversión — Leads a Pacientes Recurrentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {data.conversionLeads ? (
                    <ConversionFunnel data={data.conversionLeads} />
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">Datos de conversión no disponibles</p>
                  )}
                </CardContent>
              </Card>

              {/* Resumen de indicadores */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Resumen de Indicadores Clave
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Leads contactados</p>
                      <p className="font-semibold text-lg">{data.ejecutivo.leadsTotales}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Leads convertidos</p>
                      <p className="font-semibold text-lg">{data.ejecutivo.leadsConvertidos}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Tasa conversión</p>
                      <p className="font-semibold text-lg">{Math.round((data.ejecutivo.leadsConvertidos / data.ejecutivo.leadsTotales) * 100)}%</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Pacientes recurrentes</p>
                      <p className="font-semibold text-lg">{Math.round(data.ejecutivo.leadsConvertidos * 0.67)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Datos ejecutivos no disponibles para este período</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
