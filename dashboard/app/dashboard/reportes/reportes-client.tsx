'use client';

import { useState, useEffect, useCallback, useRef, memo } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import {
  TrendingUp,
  TrendingDown,
  MessageSquare,
  Calendar,
  Activity,
  Download,
  BarChart3,
  PieChart,
  Loader2,
  AlertCircle,
  Award,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { generarHTMLReporte } from '@/lib/reportes-export-html';
import type { ReporteApiResponse, Periodo, IconMap } from './types';
import type { ComparativaData } from '@/components/reportes/comparativa-mensual';

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
const DistribucionEstadosChart = dynamic(
  () => import('@/components/charts/distribucion-estados-chart'),
  { ssr: false, loading: () => <div className="h-48 animate-pulse rounded-lg bg-muted" /> },
);
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

const iconNames: IconMap = {
  calendar: Calendar,
  users: Activity,
  'trending-up': TrendingUp,
  'message-square': MessageSquare,
};

const iconosIntencion = [MessageSquare, Calendar, AlertTriangle, Activity, TrendingUp, MessageSquare];

const coloresIntencion = [
  'from-blue-500 to-blue-600',
  'from-emerald-500 to-emerald-600',
  'from-amber-500 to-amber-600',
  'from-purple-500 to-purple-600',
  'from-red-500 to-red-600',
  'from-slate-500 to-slate-600',
];

const KpiCard = memo(function KpiCard({
  titulo, valor, cambio, up, icon,
}: {
  titulo: string; valor: string; cambio: string; up: boolean; icon: string;
}) {
  const Icon = iconNames[icon] || Calendar;
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <Card className="relative overflow-hidden transition-[transform,box-shadow] duration-200 hoverable:hover:-translate-y-[1px] hoverable:hover:shadow-card-hover">
        <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${up ? 'from-emerald-400 to-emerald-600' : 'from-red-400 to-red-600'}`} />
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{titulo}</CardTitle>
          <div className={`p-1.5 rounded-md ${up ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400' : 'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400'}`}>
            <Icon className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{valor}</div>
          <div className="flex items-center gap-1 mt-1">
            {up ? <TrendingUp className="h-3 w-3 text-emerald-500" /> : <TrendingDown className="h-3 w-3 text-red-500" />}
            <span className={`text-xs ${up ? 'text-emerald-600' : 'text-red-600'}`}>{cambio} vs período anterior</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});

const StatCard = memo(function StatCard({
  title, value, subtitle, gradient, icon: Icon, color,
}: {
  title: string; value: string; gradient: string; icon: React.ElementType; subtitle: string; color?: string;
}) {
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <Card className="relative overflow-hidden">
        <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${gradient}`} />
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          <p className={`text-xs flex items-center gap-1 mt-1 ${color || 'text-muted-foreground'}`}>{subtitle}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
});

const ReportesSkeleton = () => (
  <div className="space-y-6 animate-in">
    <PageHeader title="Reportes" description="Cargando métricas del consultorio..." />
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, duration: 0.2 }}>
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
        <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.05, duration: 0.2 }}>
          <Card>
            <CardHeader><div className="h-5 w-40 bg-muted rounded animate-pulse" /></CardHeader>
            <CardContent><div className="h-52 bg-muted rounded animate-pulse" /></CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  </div>
);

const ReportesError = ({ error, onRetry }: { error: string; onRetry: () => void }) => (
  <div className="space-y-6 animate-in">
    <PageHeader title="Reportes" description="Métricas y estadísticas del consultorio" />
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-10 w-10 text-destructive mb-3" />
        <p className="text-sm font-medium text-destructive mb-1">Error al cargar reportes</p>
        <p className="text-xs text-muted-foreground mb-4">{error}</p>
        <Button variant="outline" size="sm" onClick={onRetry}>Reintentar</Button>
      </CardContent>
    </Card>
  </div>
);

function TabGeneral({ data }: { data: ReporteApiResponse }) {
  return (
    <TabsContent value="general" className="mt-4 space-y-6">
      <motion.div
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
      >
        {data.metricas.map((m) => <KpiCard key={m.titulo} {...m} />)}
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" /> Turnos por día
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3"><TurnosChart data={data.turnos} /></CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" /> Intenciones de mensajes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              {data.intenciones.map((item, idx) => {
                const Icon = iconosIntencion[idx];
                return (
                  <div key={item.intencion}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="flex items-center gap-2 font-medium">
                        <div className={`h-6 w-6 rounded-md bg-gradient-to-br ${coloresIntencion[idx]} flex items-center justify-center`}>
                          <Icon className="h-3 w-3 text-white" />
                        </div>
                        {item.intencion}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{item.cantidad}</span>
                        <span className="text-[11px] font-mono px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">{item.porcentaje}%</span>
                      </div>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${coloresIntencion[idx]} origin-left transition-transform duration-300 ease-out`}
                        style={{ transform: `scaleX(${item.porcentaje / 100})`, width: '100%' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </TabsContent>
  );
}

interface Props {
  initialData: ReporteApiResponse | null;
  isAdvancedReports: boolean;
}

export function ReportesClient({ initialData, isAdvancedReports }: Props) {
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const [fetchKey, setFetchKey] = useState(0);
  const [data, setData] = useState<ReporteApiResponse | null>(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    const fetchReportes = async () => {
      if (data) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const res = await fetch(`/api/reportes?periodo=${periodo}&demo=true`);
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const json = await res.json();
        if (isMounted.current) setData(json);
      } catch (err) {
        console.error('[Reportes] Error fetching:', err);
        if (isMounted.current) setError('No se pudieron cargar los reportes. Intentalo de nuevo.');
      } finally {
        if (isMounted.current) {
          setLoading(false);
          setIsRefreshing(false);
        }
      }
    };
    fetchReportes();
    return () => { isMounted.current = false; };
  }, [periodo, fetchKey]);

  const reintentar = useCallback(() => setFetchKey((k) => k + 1), []);

  const exportarReporte = useCallback(
    (formato: 'pdf' | 'excel') => {
      if (!data) return;
      const periodoLabel = periodo === 'semana' ? 'Semanal' : periodo === 'mes' ? 'Mensual' : 'Anual';
      const fechaHoy = new Date().toLocaleDateString('es-CL', {
        day: 'numeric', month: 'long', year: 'numeric',
      });

      if (formato === 'excel') {
        import('@/lib/export-reporte-excel')
          .then(({ exportReporteExcel }) => {
            exportReporteExcel({
              periodo,
              datos: data as never,
              intenciones: data.intenciones,
              pacientesObraSocial: [{ obra: 'Total', cantidad: data.pacientesKpis.total }],
              fecha: fechaHoy,
            });
            toast({ title: '📊 Excel descargado', description: `Reporte ${periodoLabel} exportado correctamente` });
          })
          .catch(() => {
            toast({ title: '❌ Error', description: 'No se pudo generar el archivo Excel', variant: 'destructive' });
          });
        return;
      }

      const html = generarHTMLReporte(data, periodo);
      const ventana = window.open('', '_blank');
      if (ventana) {
        ventana.document.write(html);
        ventana.document.close();
      } else {
        toast({ title: '❌ Error', description: 'Permití ventanas emergentes', variant: 'destructive' });
      }
      toast({ title: '📊 Reporte generado', description: `Período ${periodoLabel} - Abrí la ventana para guardar como PDF` });
    },
    [data, periodo],
  );

  if (loading && !data) return <ReportesSkeleton />;
  if ((error && !data) || (!loading && !data && !error)) {
    return <ReportesError error={error || 'No hay datos disponibles'} onRetry={reintentar} />;
  }
  if (!data) return null;

  return (
    <div className="space-y-6 animate-in">
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
            <Button variant={periodo === 'semana' ? 'secondary' : 'ghost'} size="sm" onClick={() => setPeriodo('semana')}>Semana</Button>
            <Button variant={periodo === 'mes' ? 'secondary' : 'ghost'} size="sm" onClick={() => setPeriodo('mes')}>Mes</Button>
            <Button variant={periodo === 'año' ? 'secondary' : 'ghost'} size="sm" onClick={() => setPeriodo('año')}>Año</Button>
          </div>
          {isAdvancedReports && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" /> Exportar</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[180px]">
                <DropdownMenuItem onClick={() => exportarReporte('pdf')}>📄 Exportar PDF</DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportarReporte('excel')}>📊 Exportar Excel</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Badge variant="outline" className={`group relative text-[10px] cursor-default select-none ${data._demo ? 'text-amber-600 border-amber-200 dark:text-amber-400 dark:border-amber-800' : 'text-emerald-600 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800'}`}>
            {data._demo ? '⚡ Datos demo' : '✅ Datos reales'}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="overflow-x-auto flex-nowrap w-full">
          <TabsTrigger value="general" className="px-2 sm:px-3"><BarChart3 className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">General</span></TabsTrigger>
          <TabsTrigger value="turnos" className="px-2 sm:px-3"><Calendar className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Turnos</span></TabsTrigger>
          <TabsTrigger value="pacientes" className="px-2 sm:px-3"><Activity className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Pacientes</span></TabsTrigger>
          <TabsTrigger value="whatsapp" className="px-2 sm:px-3"><MessageSquare className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">WhatsApp</span></TabsTrigger>
          <TabsTrigger value="comparativa" className="px-2 sm:px-3"><TrendingUp className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Comparativa</span></TabsTrigger>
          <TabsTrigger value="ejecutivo" className="px-2 sm:px-3"><Award className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Ejecutivo</span></TabsTrigger>
        </TabsList>

        <TabGeneral data={data} />

        <TabsContent value="turnos" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard title="Total Turnos" value={String(data.turnosKpis.total)} subtitle={`${data.turnosKpis.cambioTotal} este ${periodo === 'año' ? 'año' : periodo === 'mes' ? 'mes' : 'período'}`} gradient="from-blue-400 to-blue-600" icon={Calendar} color="text-emerald-600" />
            <StatCard title="Tasa de Asistencia" value={data.turnosKpis.asistencia} subtitle="vs período anterior" gradient="from-emerald-400 to-emerald-600" icon={TrendingUp} color="text-emerald-600" />
            <StatCard title="Duración Promedio" value={data.turnosKpis.duracion} subtitle="Por consulta" gradient="from-purple-400 to-purple-600" icon={Calendar} />
          </div>
          <Card>
            <CardHeader><CardTitle className="text-lg">Distribución por Estado</CardTitle></CardHeader>
            <CardContent><DistribucionEstadosChart data={data.distribucionEstados} /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-lg">Predicción de Demanda</CardTitle></CardHeader>
            <CardContent><PrediccionDemanda data={data.prediccion || []} /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pacientes" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard title="Total Pacientes" value={String(data.pacientesKpis.total)} subtitle="Pacientes registrados" gradient="from-blue-400 to-blue-600" icon={Activity} />
            <StatCard title="Nuevos" value={String(data.pacientesKpis.nuevos)} subtitle="En el período" gradient="from-emerald-400 to-emerald-600" icon={TrendingUp} color="text-emerald-600" />
            <StatCard title="Edad Promedio" value={`${data.pacientesKpis.edadPromedio} años`} subtitle="Promedio general" gradient="from-purple-400 to-purple-600" icon={Calendar} />
          </div>
          <Card>
            <CardHeader><CardTitle className="text-lg">Nuevos Pacientes</CardTitle></CardHeader>
            <CardContent>
              <NuevosPacientesChart data={data.nuevosPacientesLabels.map((label, i) => ({ label, valor: data.nuevosPacientes[i] || 0 }))} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Volumen WhatsApp</CardTitle></CardHeader>
            <CardContent><VolumenWhatsAppChart data={data.volumenWhatsApp} /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-lg">Calidad de Respuesta</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div><p className="text-2xl font-bold text-primary">{data.calidadRespuesta.tasa}</p><p className="text-xs text-muted-foreground">Tasa Respuesta</p></div>
                <div><p className="text-2xl font-bold text-primary">{data.calidadRespuesta.tiempo}</p><p className="text-xs text-muted-foreground">Tiempo Medio</p></div>
                <div><p className="text-2xl font-bold text-primary">{data.calidadRespuesta.msgsPorConv}</p><p className="text-xs text-muted-foreground">Msgs/Conv</p></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparativa" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Comparativa Mensual</CardTitle></CardHeader>
            <CardContent>
              <ComparativaMensual data={(data._comparativa || {}) as ComparativaData} periodo={periodo} />
            </CardContent>
          </Card>
          {isAdvancedReports && data.prediccion && data.prediccion.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Comparativa vs Predicción</CardTitle></CardHeader>
              <CardContent><PrediccionDemanda data={data.prediccion || []} /></CardContent>
            </Card>
          )}
        </TabsContent>

        {data.ejecutivo && (
          <TabsContent value="ejecutivo" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" /> Resumen Ejecutivo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div><p className="text-xs text-muted-foreground">Ingresos</p><p className="text-xl font-bold">{data.ejecutivo.totalIngresos}</p></div>
                  <div><p className="text-xs text-muted-foreground">Ocupación</p><p className="text-xl font-bold">{data.ejecutivo.tasaOcupacion}</p></div>
                  <div><p className="text-xs text-muted-foreground">Satisfacción</p><p className="text-xl font-bold">{data.ejecutivo.satisfaccion}</p></div>
                  <div><p className="text-xs text-muted-foreground">NPS</p><p className="text-xl font-bold">{data.ejecutivo.nps}</p></div>
                </div>
              </CardContent>
            </Card>
            {data.conversionLeads && (
              <Card>
                <CardHeader><CardTitle className="text-lg">Embudo de Conversión</CardTitle></CardHeader>
                <CardContent><ConversionFunnel data={data.conversionLeads} /></CardContent>
              </Card>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
