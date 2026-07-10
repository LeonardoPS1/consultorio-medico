import { cookies } from 'next/headers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Users,
  MessageSquare,
  AlertTriangle,
  Clock,
  ArrowRight,
  Activity,
  Sparkles,
  TrendingUp,
  Smartphone,
  Video,
} from 'lucide-react';
import Link from 'next/link';
import { DashboardClient } from './dashboard-client';
import { DashboardKpisClient } from '@/components/dashboard/dashboard-kpis-client';
import { PWAInstallPrompt } from '@/components/pwa-install-prompt';

// ─── Types ────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────

function getKpiIcon(type: string) {
  switch (type) {
    case 'calendar':
      return Calendar;
    case 'users':
      return Users;
    case 'messages':
      return MessageSquare;
    case 'alert':
      return AlertTriangle;
    case 'response':
      return TrendingUp;
    case 'today':
      return Smartphone;
    default:
      return Activity;
  }
}

function getKpiGradient(type: string) {
  switch (type) {
    case 'calendar':
      return 'from-blue-500 to-blue-600';
    case 'users':
      return 'from-emerald-500 to-emerald-600';
    case 'messages':
      return 'from-amber-500 to-amber-600';
    case 'alert':
      return 'from-red-500 to-red-600';
    case 'response':
      return 'from-purple-500 to-purple-600';
    case 'today':
      return 'from-cyan-500 to-cyan-600';
    default:
      return 'from-gray-500 to-gray-600';
  }
}

function getKpiBg(type: string) {
  switch (type) {
    case 'calendar':
      return 'bg-blue-50 dark:bg-blue-950/30';
    case 'users':
      return 'bg-emerald-50 dark:bg-emerald-950/30';
    case 'messages':
      return 'bg-amber-50 dark:bg-amber-950/30';
    case 'alert':
      return 'bg-red-50 dark:bg-red-950/30';
    case 'response':
      return 'bg-purple-50 dark:bg-purple-950/30';
    case 'today':
      return 'bg-cyan-50 dark:bg-cyan-950/30';
    default:
      return 'bg-gray-50 dark:bg-gray-950/30';
  }
}

function ActividadDot({ tipo }: { tipo: string }) {
  const color =
    tipo === 'urgencia'
      ? 'bg-red-500 animate-pulse-soft'
      : tipo === 'confirmacion'
        ? 'bg-emerald-500'
        : tipo === 'nuevo'
          ? 'bg-blue-500'
          : tipo === 'recordatorio'
            ? 'bg-amber-500'
            : 'bg-muted-foreground/30';
  return <div className={`h-2 w-2 rounded-full mt-1.5 ${color}`} />;
}

// ─── Data fetching ─────────────────────────────────────────

/** Forzar renderizado dinámico (no pre-renderizar en build) */
export const dynamic = 'force-dynamic';

async function getDashboardData(sucursalId?: string): Promise<DashboardData | null> {
  try {
    const params = new URLSearchParams();
    if (sucursalId) params.set('sucursalId', sucursalId);
    const res = await fetch(`http://localhost:3000/api/dashboard/stats?${params.toString()}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ─── Page ──────────────────────────────────────────────────

export default async function DashboardPage() {
  const cookieStore = cookies();
  const sucursalId = cookieStore.get('sucursal_activa')?.value;
  const data = await getDashboardData(sucursalId);

  const dateStr = new Date().toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      {/*
       * DashboardClient maneja:
       * - Header con fecha + botón Actualizar
       * - Quick Actions grid
       * - NuevoTurnoModal
       */}
      <DashboardClient dateStr={dateStr} />

      {/* ─── KPIs (server-rendered + client re-fetch on sucursal change) ─── */}
      <DashboardKpisClient initialKpis={data?.kpis ?? []} />

      {/* ─── Turnos + Actividad ────────────────────────── */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Próximos Turnos */}
        <Card className="hover-card">
          <CardHeader className="flex flex-row items-center justify-between px-3 sm:px-6 py-3 sm:py-4">
            <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Próximos Turnos
            </CardTitle>
            <Link
              href="/dashboard/turnos"
              className="inline-flex items-center text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              Ver todos <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            {data?.proximosTurnos && data.proximosTurnos.length > 0 ? (
              <div className="space-y-2">
                {data.proximosTurnos.map((turno) => (
                  <div
                    key={`${turno.hora}-${turno.paciente}`}
                    className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-muted/30 hoverable:hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <div className="flex items-center justify-center h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-primary/10 text-primary font-bold text-xs sm:text-sm group-hover:scale-105 transition-transform shrink-0">
                        {turno.hora}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-xs sm:text-sm truncate">{turno.paciente}</p>
                        <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
                          {turno.tipo} &middot; {turno.medico}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={`shrink-0 text-[10px] sm:text-xs ${
                        turno.estado === 'confirmada'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : turno.estado === 'pendiente'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                            : 'bg-muted-foreground/20 text-muted-foreground'
                      }`}
                    >
                      {turno.estado === 'confirmada'
                        ? 'Confirmada'
                        : turno.estado === 'pendiente'
                          ? 'Pendiente'
                          : turno.estado}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 sm:py-8 text-muted-foreground">
                <Calendar className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs sm:text-sm">No hay turnos programados para hoy</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actividad Reciente */}
        <Card className="hover-card">
          <CardHeader className="flex flex-row items-center justify-between px-3 sm:px-6 py-3 sm:py-4">
            <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
              <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Actividad Reciente
            </CardTitle>
            <Link
              href="/dashboard/conversaciones"
              className="inline-flex items-center text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              Ver todo <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            {data?.actividadReciente && data.actividadReciente.length > 0 ? (
              <div className="space-y-1">
                {data.actividadReciente.map((act, i) => (
                  <div
                    key={`${act.hora}-${i}`}
                    className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl hoverable:hoverable:hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-1 sm:gap-2 min-w-[60px] sm:min-w-[70px]">
                      <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="text-[11px] sm:text-xs text-muted-foreground font-medium tabular-nums">
                        {act.hora}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm flex-1 leading-snug">{act.texto}</p>
                    <ActividadDot tipo={act.tipo} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 sm:py-8 text-muted-foreground">
                <Activity className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs sm:text-sm">Sin actividad reciente</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Sistema Status ────────────────────────────── */}
      <Card className="border-primary/10 bg-gradient-to-br from-primary/[0.03] to-transparent">
        <CardContent className="flex items-center justify-between p-3 sm:p-5">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium">Sistema operativo y funcional</p>
              <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
                {data
                  ? data.sistema.datosReales
                    ? `Dashboard con datos en vivo · ${data.sistema.conversacionesActivas} conversaciones activas`
                    : 'Dashboard listo'
                  : 'No se pudieron cargar los datos del dashboard'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse-soft" />
            <span className="text-[11px] sm:text-xs text-emerald-600 font-medium">Online</span>
          </div>
        </CardContent>
      </Card>

      {/* Telemedicina */}
      <Card className="border-primary/10 bg-gradient-to-br from-primary/[0.03] to-transparent">
        <CardContent className="flex items-center justify-between p-3 sm:p-5">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
              <Video className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium">Telemedicina disponible</p>
              <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
                Videoconsultas en vivo con LiveKit · Link automático por WhatsApp
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/atencion"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors shrink-0 ml-2"
          >
            Ir a Atención <ArrowRight className="h-3 w-3" />
          </Link>
        </CardContent>
      </Card>

      {/* PWA Install — solo en la pantalla principal del dashboard */}
      <PWAInstallPrompt />
    </div>
  );
}
