'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Users,
  MessageSquare,
  AlertTriangle,
  TrendingUp,
  Clock,
  Plus,
  Phone,
  FileText,
  ArrowRight,
  ChevronRight,
  Activity,
  Syringe,
  BarChart3,
  Sparkles,
  Play,
} from 'lucide-react';
import { NuevoTurnoModal } from '@/components/modals/nuevo-turno-modal';

// Mock data
const kpis = [
  {
    title: 'Turnos Hoy',
    value: '8',
    change: '+2',
    icon: Calendar,
    gradient: 'from-blue-500 to-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
  },
  {
    title: 'Pacientes Nuevos',
    value: '12',
    change: '+15%',
    icon: Users,
    gradient: 'from-emerald-500 to-emerald-600',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
  },
  {
    title: 'Mensajes Pendientes',
    value: '3',
    change: '-5',
    icon: MessageSquare,
    gradient: 'from-amber-500 to-amber-600',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
  },
  {
    title: 'Alertas',
    value: '1',
    change: 'Urgente',
    icon: AlertTriangle,
    gradient: 'from-red-500 to-red-600',
    bg: 'bg-red-50 dark:bg-red-950/30',
    urgent: true,
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
    icon: BarChart3,
    color: 'text-purple-600 bg-purple-100 dark:bg-purple-950/50',
    action: 'reportes',
  },
];

const proximosTurnos = [
  { hora: '09:00', paciente: 'Juan Pérez', tipo: 'Consulta Médica', estado: 'confirmada', medico: 'Dr. García' },
  { hora: '10:30', paciente: 'María García', tipo: 'Control', estado: 'confirmada', medico: 'Dr. García' },
  { hora: '11:00', paciente: 'Pedro Sánchez', tipo: 'Resultados', estado: 'pendiente', medico: 'Dra. López' },
  { hora: '12:00', paciente: 'Ana López', tipo: 'Consulta', estado: 'confirmada', medico: 'Dr. García' },
  { hora: '15:30', paciente: 'Carlos Ruiz', tipo: 'Especialista', estado: 'pendiente', medico: 'Dra. López' },
  { hora: '16:45', paciente: 'Laura Martínez', tipo: 'Control', estado: 'confirmada', medico: 'Dr. García' },
];

const actividadReciente = [
  { hora: '08:15', texto: 'Juan Pérez confirmó turno para mañana', tipo: 'confirmacion' },
  { hora: '08:02', texto: 'María García preguntó por resultados', tipo: 'consulta' },
  { hora: '07:50', texto: 'Carlos Ruiz reporta dolor en el pecho', tipo: 'urgencia' },
  { hora: '07:30', texto: 'Recordatorio enviado a Pedro Sánchez', tipo: 'recordatorio' },
  { hora: '07:15', texto: 'Nuevo paciente registrado: Diego Torres', tipo: 'nuevo' },
  { hora: '07:00', texto: 'Resumen diario enviado al WhatsApp del Dr.', tipo: 'sistema' },
];

export default function DashboardPage() {
  const router = useRouter();
  const [showNewTurno, setShowNewTurno] = useState(false);

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
          <p className="text-muted-foreground flex items-center gap-1.5 mt-1">
            <Sparkles className="h-4 w-4 text-primary" />
            Resumen de la actividad del consultorio &mdash; {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              onClick={() => handleQuickAction(action.action)}
              className="flex items-center gap-3 p-4 rounded-xl border bg-card hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 group"
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
          className="flex items-center gap-3 p-4 rounded-xl border-2 border-blue-200 bg-blue-50/50 dark:bg-blue-950/30 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 group"
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
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.title} className="hover-card overflow-hidden relative">
              <div className={`absolute inset-0 bg-gradient-to-br ${kpi.gradient} opacity-[0.03] dark:opacity-[0.08]`} />
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 relative">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {kpi.title}
                </CardTitle>
                <div className={`rounded-lg ${kpi.bg} p-2`}>
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
                  vs día anterior
                </p>
              </CardContent>
            </Card>
          );
        })}
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
            <div className="space-y-2">
              {proximosTurnos.map((turno, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors group cursor-pointer"
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
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    }
                  >
                    {turno.estado === 'confirmada' ? 'Confirmada' : 'Pendiente'}
                  </Badge>
                </div>
              ))}
            </div>
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
            <div className="space-y-1">
              {actividadReciente.map((act, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-[70px]">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-medium tabular-nums">
                      {act.hora}
                    </span>
                  </div>
                  <p className="text-sm flex-1">{act.texto}</p>
                  <div className={`h-2 w-2 rounded-full mt-1.5 ${
                    act.tipo === 'urgencia' ? 'bg-red-500 animate-pulse-soft' :
                    act.tipo === 'confirmacion' ? 'bg-emerald-500' :
                    act.tipo === 'nuevo' ? 'bg-blue-500' :
                    'bg-muted-foreground/30'
                  }`} />
                </div>
              ))}
            </div>
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
                Dashboard listo &middot; Datos de ejemplo cargados &middot; 8 conversaciones activas
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
