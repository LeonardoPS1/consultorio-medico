'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Calendar,
  Users,
  MessageSquare,
  AlertTriangle,
  Clock,
  ArrowRight,
  ChevronRight,
  Activity,
  BarChart3,
  Sparkles,
  Play,
  RefreshCw,
} from 'lucide-react';
import { NuevoTurnoModal } from '@/components/modals/nuevo-turno-modal';

// Tipos del API
interface DashboardKpi {
  title: string;
  value: string;
  change: string;
  type: string;
  urgent?: boolean;
}

interface ProximoTurno {
  hora: string;
  paciente: string;
  tipo: string;
  estado: string;
  medico: string;
}

interface ActividadItem {
  hora: string;
  texto: string;
  tipo: string;
}

interface SistemaStatus {
  online: boolean;
  conversacionesActivas: number;
  datosReales: boolean;
}

interface DashboardData {
  kpis: DashboardKpi[];
  proximosTurnos: ProximoTurno[];
  actividadReciente: ActividadItem[];
  sistema: SistemaStatus;
}

const quickActions = [
  {
    label: 'Nuevo Turno',
    icon: Calendar,
    color: 'text-blue-600 bg-blue-100 dark:bg-blue-950/50',
    action: 'turno',
  },
  {
    label: 'Nuevo Paciente',
    icon: Users,
    color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-950/50',
    action: 'paciente',
  },
  {
    label: 'Enviar WhatsApp',
    icon: MessageSquare,
    color: 'text-green-600 bg-green-100 dark:bg-green-950/50',
    action: 'whatsapp',
  },
  {
    label: 'Ver Reportes',
    icon: BarChart3,
    color: 'text-purple-600 bg-purple-100 dark:bg-purple-950/50',
    action: 'reportes',
  },
];

function getKpiIcon(type: string) {
  switch (type) {
    case 'calendar': return Calendar;
    case 'users': return Users;
    case 'messages': return MessageSquare;
    case 'alert': return AlertTriangle;
    default: return Activity;
  }
}

function getKpiGradient(type: string) {
  switch (type) {
    case 'calendar': return 'from-blue-500 to-blue-600';
    case 'users': return 'from-emerald-500 to-emerald-600';
    case 'messages': return 'from-amber-500 to-amber-600';
    case 'alert': return 'from-red-500 to-red-600';
    default: return 'from-gray-500 to-gray-600';
  }
}

function getKpiBg(type: string) {
  switch (type) {
    case 'calendar': return 'bg-blue-50 dark:bg-blue-950/30';
    case 'users': return 'bg-emerald-50 dark:bg-emerald-950/30';
    case 'messages': return 'bg-amber-50 dark:bg-amber-950/30';
    case 'alert': return 'bg-red-50 dark:bg-red-950/30';
    default: return 'bg-gray-50 dark:bg-gray-950/30';
  }
}

function ActividadDot({ tipo }: { tipo: string }) {
  const color =
    tipo === 'urgencia' ? 'bg-red-500 animate-pulse-soft' :
    tipo === 'confirmacion' ? 'bg-emerald-500' :
    tipo === 'nuevo' ? 'bg-blue-500' :
    tipo === 'recordatorio' ? 'bg-amber-500' :
    'bg-muted-foreground/30';
  return <div className={`h-2 w-2 rounded-full mt-1.5 ${color}`} />;
}

export default function DashboardPage() {
  const router = useRouter();
  const [showNewTurno, setShowNewTurno] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/dashboard/stats');
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('[Dashboard] Error fetching stats:', err);
      setError('No se pudieron cargar los datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'turno': setShowNewTurno(true); break;
      case 'paciente': router.push('/dashboard/pacientes'); break;
      case 'whatsapp': router.push('/dashboard/conversaciones'); break;
      case 'reportes': router.push('/dashboard/reportes'); break;
    }
  };

  return (
    <div className="space-y-6 animate-in">
      {/* Header con bienvenida */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight gradient-text">
            Panel Principal
          </h2>
          <p className="text-muted-foreground flex items-center gap-2 mt-1">
            <Sparkles className="h-4 w-4 text-primary" />
            Resumen de la actividad del consultorio &mdash; {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchStats}
          disabled={loading}
          className="text-muted-foreground"
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              onClick={() => handleQuickAction(action.action)}
              className="flex items-center gap-3 p-4 rounded-xl border bg-card hoverable:hover:shadow-card-hover transition-[transform,box-shadow] duration-200 hoverable:hover:-translate-y-0.5 group"
            >
              <div className={`h-10 w-10 rounded-lg ${action.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className="font-medium text-sm">{action.label}</span>
              <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
            </button>
          );
        })}
        {/* Botón directo a Atención */}
        <button
          onClick={() => router.push('/dashboard/atencion')}
          className="flex items-center gap-3 p-4 rounded-xl border-2 border-blue-200 bg-blue-50/50 dark:bg-blue-950/30 hoverable:hover:shadow-card-hover transition-[transform,box-shadow] duration-200 hoverable:hover:-translate-y-0.5 group"
        >
          <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Play className="h-5 w-5 text-blue-600" />
          </div>
          <span className="font-medium text-sm">Atención</span>
          <Badge variant="secondary" className="ml-auto text-[10px] bg-blue-200 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
            En vivo
          </Badge>
        </button>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 stagger-children">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={`skeleton-${i}`} className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))
        ) : error ? (
          <Card className="col-span-full">
            <CardContent className="flex items-center gap-3 p-6">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchStats}>
                Reintentar
              </Button>
            </CardContent>
          </Card>
        ) : (
          data?.kpis.map((kpi) => {
            const Icon = getKpiIcon(kpi.type);
            const gradient = getKpiGradient(kpi.type);
            const bg = getKpiBg(kpi.type);
            return (
              <Card key={kpi.title} className="hover-card overflow-hidden relative">
                <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-[0.03] dark:opacity-[0.08]`} />
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 relative">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {kpi.title}
                  </CardTitle>
                  <div className={`rounded-lg ${bg} p-2`}>
                    <Icon className={`h-4 w-4 ${kpi.urgent ? 'text-red-500 animate-pulse-soft' : ''}`} />
                  </div>
                </CardHeader>
                <CardContent className="relative">
                  <div className="flex items-baseline gap-2">
                    <div className="text-3xl font-bold">{kpi.value}</div>
                    <span className={`text-sm font-medium ${kpi.urgent ? 'text-red-500' : 'text-emerald-500'}`}>
                      {kpi.change}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {kpi.type === 'calendar' ? 'vs día anterior' :
                     kpi.type === 'users' ? 'vs semana anterior' :
                     'últimas 24 hs'}
                  </p>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Próximos Turnos */}
        <Card className="hover-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Próximos Turnos
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => router.push('/dashboard/turnos')}
            >
              Ver todos <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <Skeleton className="h-11 w-11 rounded-xl" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                ))}
              </div>
            ) : data?.proximosTurnos && data.proximosTurnos.length > 0 ? (
              <div className="space-y-2">
                {data.proximosTurnos.map((turno) => (
                  <div
                    key={`${turno.hora}-${turno.paciente}`}
                    className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hoverable:hover:bg-muted/50 transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-primary/10 text-primary font-bold text-sm group-hover:scale-105 transition-transform">
                        {turno.hora}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{turno.paciente}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          {turno.tipo} &middot; {turno.medico}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={
                        turno.estado === 'confirmada'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : turno.estado === 'pendiente'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          : 'bg-muted-foreground/20 text-muted-foreground'
                      }
                    >
                      {turno.estado === 'confirmada' ? 'Confirmada' :
                       turno.estado === 'pendiente' ? 'Pendiente' :
                       turno.estado}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay turnos programados para hoy</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actividad Reciente */}
        <Card className="hover-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Actividad Reciente
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => router.push('/dashboard/conversaciones')}
            >
              Ver todo <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-1">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3 p-3">
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-4 flex-1" />
                  </div>
                ))}
              </div>
            ) : data?.actividadReciente && data.actividadReciente.length > 0 ? (
              <div className="space-y-1">
                {data.actividadReciente.map((act, i) => (
                  <div
                    key={`${act.hora}-${i}`}
                    className="flex items-start gap-3 p-3 rounded-xl hoverable:hoverable:hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-[70px]">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground font-medium tabular-nums">
                        {act.hora}
                      </span>
                    </div>
                    <p className="text-sm flex-1">{act.texto}</p>
                    <ActividadDot tipo={act.tipo} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Sin actividad reciente</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tarjeta de estado del sistema */}
      <Card className="border-primary/10 bg-gradient-to-br from-primary/[0.03] to-transparent">
        <CardContent className="flex items-center justify-between p-5">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-medium">Sistema operativo y funcional</p>
              <p className="text-xs text-muted-foreground">
                {loading
                  ? 'Cargando...'
                  : data?.sistema.datosReales
                  ? `Dashboard con datos en vivo · ${data.sistema.conversacionesActivas} conversaciones activas`
                  : 'Dashboard listo'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse-soft" />
            <span className="text-xs text-emerald-600 font-medium">Online</span>
          </div>
        </CardContent>
      </Card>

      {/* Modal Nuevo Turno */}
      <NuevoTurnoModal
        open={showNewTurno}
        onOpenChange={setShowNewTurno}
        onSubmit={() => setShowNewTurno(false)}
      />
    </div>
  );
}
