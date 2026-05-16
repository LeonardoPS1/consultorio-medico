'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Users,
  MessageSquare,
  AlertTriangle,
  Clock,
  Plus,
  ArrowRight,
  ChevronRight,
  Activity,
  Sparkles,
  Play,
  CheckCircle2,
  XCircle,
  UserCheck,
  Hourglass,
  Timer,
} from 'lucide-react';
import { NuevoTurnoModal } from '@/components/modals/nuevo-turno-modal';
import { getTurnoColor, getTurnoLabel } from '@/lib/utils';

// ============================================================
// Tipos
// ============================================================
type TurnoEstado = 'pendiente' | 'confirmada' | 'en_atencion' | 'atendido' | 'cancelada';

interface Turno {
  id: string;
  hora: string;
  paciente: string;
  tipo: string;
  medico: string;
  estado: TurnoEstado;
  atendidoAt?: string;
}

// ============================================================
// Mock data de turnos para hoy
// ============================================================
const hoy = new Date();
const TURNOS_INICIALES: Turno[] = [
  { id: '1', hora: '09:00', paciente: 'Juan Pérez', tipo: 'Consulta Médica', medico: 'Dr. García', estado: 'pendiente' },
  { id: '2', hora: '09:30', paciente: 'María Rodríguez', tipo: 'Control', medico: 'Dr. García', estado: 'atendido', atendidoAt: new Date(hoy.getTime() - 30 * 60000).toISOString() },
  { id: '3', hora: '10:00', paciente: 'Pedro Sánchez', tipo: 'Resultados', medico: 'Dra. López', estado: 'en_atencion', atendidoAt: new Date(hoy.getTime() - 12 * 60000).toISOString() },
  { id: '4', hora: '10:30', paciente: 'Ana López', tipo: 'Consulta', medico: 'Dr. García', estado: 'confirmada' },
  { id: '5', hora: '11:00', paciente: 'Carlos Ruiz', tipo: 'Especialista', medico: 'Dra. López', estado: 'en_atencion', atendidoAt: new Date(hoy.getTime() - 5 * 60000).toISOString() },
  { id: '6', hora: '11:30', paciente: 'Laura Martínez', tipo: 'Control', medico: 'Dr. García', estado: 'pendiente' },
  { id: '7', hora: '12:00', paciente: 'Sofía Herrera', tipo: 'Primera vez', medico: 'Dra. López', estado: 'cancelada' },
  { id: '8', hora: '15:00', paciente: 'Diego Torres', tipo: 'Consulta', medico: 'Dr. García', estado: 'confirmada' },
  { id: '9', hora: '15:30', paciente: 'Elena Martínez', tipo: 'Control', medico: 'Dr. García', estado: 'atendido', atendidoAt: new Date(hoy.getTime() - 180 * 60000).toISOString() },
  { id: '10', hora: '16:00', paciente: 'Roberto Fernández', tipo: 'Primera vez', medico: 'Dra. López', estado: 'pendiente' },
  { id: '11', hora: '16:30', paciente: 'Valentina Gómez', tipo: 'Consulta', medico: 'Dr. García', estado: 'pendiente' },
  { id: '12', hora: '17:00', paciente: 'Luis Martínez', tipo: 'Resultados', medico: 'Dra. López', estado: 'atendido', atendidoAt: new Date(hoy.getTime() - 240 * 60000).toISOString() },
];

// ============================================================
// Componente: Timer de atención
// ============================================================
function AtencionTimer({ desde }: { desde: string }) {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    const calc = () => {
      const diff = Date.now() - new Date(desde).getTime();
      const min = Math.floor(diff / 60000);
      if (min < 1) return 'ahora';
      const h = Math.floor(min / 60);
      const m = min % 60;
      return h > 0 ? `${h}h ${m}m` : `${m} min`;
    };
    setElapsed(calc());
    const interval = setInterval(() => setElapsed(calc()), 30000);
    return () => clearInterval(interval);
  }, [desde]);

  if (!elapsed) return null;

  return (
    <span className="inline-flex items-center gap-1 text-xs font-mono tabular-nums">
      <Timer className="h-3 w-3" />
      {elapsed}
    </span>
  );
}

// ============================================================
// Componente: Tarjeta de turno
// ============================================================
function TurnoCard({
  turno,
  onAtender,
  onFinalizar,
  onCancelar,
}: {
  turno: Turno;
  onAtender: (id: string) => void;
  onFinalizar: (id: string) => void;
  onCancelar: (id: string) => void;
}) {
  const color = getTurnoColor(turno.estado);
  const isPending = turno.estado === 'pendiente' || turno.estado === 'confirmada';
  const isInAttention = turno.estado === 'en_atencion';

  return (
    <div
      className={`group relative rounded-xl border bg-card p-3 transition-all duration-300
        ${isInAttention ? 'ring-2 shadow-lg scale-[1.02]' : 'hover:shadow-md hover:-translate-y-0.5'}
      `}
      style={{ borderColor: isInAttention ? color : undefined }}
    >
      {/* Barra lateral de color */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
        style={{ backgroundColor: color }}
      />

      <div className="pl-3">
        {/* Header: hora + estado badge */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center justify-center h-7 w-14 rounded-lg text-xs font-bold tabular-nums ${
                isInAttention
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {turno.hora}
            </span>
            {isInAttention && (
              <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse-soft" />
            )}
          </div>
          <Badge
            variant="outline"
            className="text-[10px] px-2 py-0 font-medium"
            style={{
              backgroundColor: `${color}18`,
              color: color,
              borderColor: `${color}30`,
            }}
          >
            {isInAttention ? (
              <span className="flex items-center gap-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                </span>
                {getTurnoLabel(turno.estado)}
              </span>
            ) : (
              getTurnoLabel(turno.estado)
            )}
          </Badge>
        </div>

        {/* Nombre paciente */}
        <p className="font-semibold text-sm truncate">{turno.paciente}</p>

        {/* Tipo + médico */}
        <p className="text-xs text-muted-foreground truncate mb-2">
          {turno.tipo} · {turno.medico}
        </p>

        {/* Timer de atención o tiempo de espera */}
        {isInAttention && turno.atendidoAt && (
          <div className="flex items-center gap-2 mb-2 text-blue-600 dark:text-blue-400">
            <AtencionTimer desde={turno.atendidoAt} />
          </div>
        )}

        {/* Acciones */}
        <div className="flex gap-1.5">
          {isPending && (
            <Button
              size="sm"
              className="flex-1 h-8 text-xs gap-1.5 font-semibold"
              onClick={() => onAtender(turno.id)}
            >
              <Play className="h-3.5 w-3.5" />
              Atender
            </Button>
          )}
          {isInAttention && (
            <Button
              size="sm"
              variant="default"
              className="flex-1 h-8 text-xs gap-1.5 font-semibold bg-emerald-600 hover:bg-emerald-700"
              onClick={() => onFinalizar(turno.id)}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Finalizar
            </Button>
          )}
          {isPending && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
              onClick={() => onCancelar(turno.id)}
              title="Cancelar turno"
            >
              <XCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Componente: Columna del Kanban
// ============================================================
function KanbanColumn({
  titulo,
  icono: Icono,
  turnos,
  color,
  onAtender,
  onFinalizar,
  onCancelar,
  vacioMsg,
}: {
  titulo: string;
  icono: React.ElementType;
  turnos: Turno[];
  color: string;
  onAtender: (id: string) => void;
  onFinalizar: (id: string) => void;
  onCancelar: (id: string) => void;
  vacioMsg: string;
}) {
  return (
    <div className="flex flex-col gap-2 min-h-[200px]">
      {/* Header de columna */}
      <div className="flex items-center gap-2 px-1">
        <div className="flex items-center justify-center h-7 w-7 rounded-lg" style={{ backgroundColor: `${color}18` }}>
          <Icono className="h-4 w-4" style={{ color }} />
        </div>
        <span className="text-sm font-semibold">{titulo}</span>
        <Badge
          variant="secondary"
          className="ml-auto text-xs font-mono"
          style={{
            backgroundColor: `${color}12`,
            color: color,
          }}
        >
          {turnos.length}
        </Badge>
      </div>

      {/* Cards */}
      {turnos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground/60 rounded-xl border-2 border-dashed border-muted-foreground/10 flex-1">
          <Icono className="h-8 w-8 mb-2 opacity-30" />
          <p className="text-xs">{vacioMsg}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {turnos.map((t) => (
            <TurnoCard
              key={t.id}
              turno={t}
              onAtender={onAtender}
              onFinalizar={onFinalizar}
              onCancelar={onCancelar}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Página Principal
// ============================================================
export default function DashboardPage() {
  const router = useRouter();
  const [showNewTurno, setShowNewTurno] = useState(false);
  const [turnos, setTurnos] = useState(TURNOS_INICIALES);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // KPIs dinámicos según estado real de turnos
  const kpis = [
    {
      title: 'Turnos Hoy',
      value: String(turnos.filter((t) => t.estado !== 'cancelada').length),
      change: `+${turnos.filter((t) => t.estado === 'atendido').length} atendidos`,
      icon: Calendar,
      gradient: 'from-blue-500 to-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-950/30',
    },
    {
      title: 'En Atención',
      value: String(turnos.filter((t) => t.estado === 'en_atencion').length),
      change: `${turnos.filter((t) => t.estado === 'pendiente' || t.estado === 'confirmada').length} esperando`,
      icon: UserCheck,
      gradient: 'from-amber-500 to-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-950/30',
    },
    {
      title: 'Atendidos',
      value: String(turnos.filter((t) => t.estado === 'atendido').length),
      change: `${turnos.filter((t) => t.estado === 'cancelada').length} cancelados`,
      icon: CheckCircle2,
      gradient: 'from-emerald-500 to-emerald-600',
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    },
    {
      title: 'Pacientes Nuevos',
      value: '12',
      change: '+15%',
      icon: Users,
      gradient: 'from-violet-500 to-violet-600',
      bg: 'bg-violet-50 dark:bg-violet-950/30',
    },
  ];

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
      icon: Activity,
      color: 'text-purple-600 bg-purple-100 dark:bg-purple-950/50',
      action: 'reportes',
    },
  ];

  const handleQuickAction = useCallback(
    (action: string) => {
      switch (action) {
        case 'turno':
          setShowNewTurno(true);
          break;
        case 'paciente':
          router.push('/dashboard/pacientes');
          break;
        case 'whatsapp':
          router.push('/dashboard/conversaciones');
          break;
        case 'reportes':
          router.push('/dashboard/reportes');
          break;
      }
    },
    [router]
  );

  // Acciones sobre turnos
  const atenderTurno = useCallback((id: string) => {
    setTurnos((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, estado: 'en_atencion' as const, atendidoAt: new Date().toISOString() }
          : t
      )
    );
  }, []);

  const finalizarTurno = useCallback((id: string) => {
    setTurnos((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, estado: 'atendido' as const, atendidoAt: new Date().toISOString() }
          : t
      )
    );
  }, []);

  const cancelarTurno = useCallback((id: string) => {
    setTurnos((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, estado: 'cancelada' as const } : t
      )
    );
  }, []);

  // Columnas del Kanban
  const pendientes = turnos.filter(
    (t) => t.estado === 'pendiente' || t.estado === 'confirmada'
  ).sort((a, b) => a.hora.localeCompare(b.hora));

  const enAtencion = turnos.filter((t) => t.estado === 'en_atencion');
  const atendidos = turnos.filter((t) => t.estado === 'atendido');
  const cancelados = turnos.filter((t) => t.estado === 'cancelada');

  return (
    <div className="space-y-5 animate-in">
      {/* Header con bienvenida */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight gradient-text">
            Panel Principal
          </h2>
          <p className="text-muted-foreground flex items-center gap-1.5 mt-1">
            <Sparkles className="h-4 w-4 text-primary" />
            Atención de turnos —{' '}
            {new Date().toLocaleDateString('es-AR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard/turnos')} variant="outline" size="sm">
          <Calendar className="h-4 w-4 mr-1.5" />
          Gestión de Turnos
          <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
        </Button>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              onClick={() => handleQuickAction(action.action)}
              className="flex items-center gap-3 p-4 rounded-xl border bg-card hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 group"
            >
              <div
                className={`h-10 w-10 rounded-lg ${action.color} flex items-center justify-center group-hover:scale-110 transition-transform`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <span className="font-medium text-sm">{action.label}</span>
              <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
            </button>
          );
        })}
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 stagger-children">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.title} className="hover-card overflow-hidden relative">
              <div
                className={`absolute inset-0 bg-gradient-to-br ${kpi.gradient} opacity-[0.03] dark:opacity-[0.08]`}
              />
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 relative">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {kpi.title}
                </CardTitle>
                <div className={`rounded-lg ${kpi.bg} p-2`}>
                  <Icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="flex items-baseline gap-2">
                  <div className="text-3xl font-bold">{kpi.value}</div>
                  <span className="text-sm font-medium text-muted-foreground">
                    {kpi.change}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ================================================================ */}
      {/* TABLERO DE ATENCIÓN - KANBAN                                    */}
      {/* ================================================================ */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3 border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Atención de Turnos
            </CardTitle>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />{' '}
                {turnos.filter((t) => t.estado !== 'cancelada').length} activos
              </span>
              <span className="hidden sm:inline">·</span>
              <span className="hidden sm:flex items-center gap-1">
                <Hourglass className="h-3.5 w-3.5" />{' '}
                {pendientes.length} pendientes
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {!mounted ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Columna: Pendientes */}
              <KanbanColumn
                titulo="Pendientes"
                icono={Hourglass}
                turnos={pendientes}
                color="#F59E0B"
                onAtender={atenderTurno}
                onFinalizar={finalizarTurno}
                onCancelar={cancelarTurno}
                vacioMsg="Sin turnos pendientes"
              />

              {/* Columna: En Atención */}
              <KanbanColumn
                titulo="En Atención"
                icono={Play}
                turnos={enAtencion}
                color="#2563EB"
                onAtender={atenderTurno}
                onFinalizar={finalizarTurno}
                onCancelar={cancelarTurno}
                vacioMsg="Nadie en atención"
              />

              {/* Columna: Atendidos */}
              <KanbanColumn
                titulo="Atendidos"
                icono={CheckCircle2}
                turnos={atendidos}
                color="#059669"
                onAtender={atenderTurno}
                onFinalizar={finalizarTurno}
                onCancelar={cancelarTurno}
                vacioMsg="Sin atendidos hoy"
              />

              {/* Columna: Cancelados */}
              <KanbanColumn
                titulo="Cancelados"
                icono={XCircle}
                turnos={cancelados}
                color="#EF4444"
                onAtender={atenderTurno}
                onFinalizar={finalizarTurno}
                onCancelar={cancelarTurno}
                vacioMsg="Sin cancelados"
              />
            </div>
          )}
        </CardContent>
      </Card>

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
                {turnos.length} turnos hoy · {enAtencion.length} en atención ·{' '}
                {atendidos.length} atendidos · {pendientes.length} pendientes
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
