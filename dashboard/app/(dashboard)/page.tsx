'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Calendar,
  Users,
  MessageSquare,
  AlertTriangle,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Datos mock para demostración
const kpis = [
  { title: 'Turnos Hoy', value: '8', change: '+2', icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  { title: 'Pacientes Nuevos', value: '12', change: '+15%', icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  { title: 'Mensajes Pendientes', value: '3', change: '-5', icon: MessageSquare, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  { title: 'Alertas', value: '1', change: 'Urgente', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
];

const proximosTurnos = [
  { hora: '09:00', paciente: 'Juan Pérez', tipo: 'Consulta', estado: 'confirmada' },
  { hora: '10:30', paciente: 'María García', tipo: 'Control', estado: 'confirmada' },
  { hora: '11:00', paciente: 'Pedro Sánchez', tipo: 'Resultados', estado: 'pendiente' },
  { hora: '12:00', paciente: 'Ana López', tipo: 'Consulta', estado: 'confirmada' },
  { hora: '15:30', paciente: 'Carlos Ruiz', tipo: 'Especialista', estado: 'pendiente' },
  { hora: '16:45', paciente: 'Laura Martínez', tipo: 'Control', estado: 'confirmada' },
];

const actividadReciente = [
  { hora: '08:15', texto: 'Juan Pérez confirmó turno de mañana', tipo: 'confirmacion' },
  { hora: '08:02', texto: 'María García preguntó por resultados', tipo: 'consulta' },
  { hora: '07:50', texto: '🚨 Paciente reporta dolor fuerte - Notificar', tipo: 'urgencia' },
  { hora: '07:30', texto: 'Recordatorio enviado a Pedro Sánchez', tipo: 'recordatorio' },
  { hora: '07:15', texto: 'Nuevo paciente registrado: Carlos Ruiz', tipo: 'nuevo' },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6 animate-in">
      {/* Título */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Panel Principal</h2>
        <p className="text-muted-foreground">
          Resumen de la actividad del consultorio
        </p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.title} className="transition-all hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {kpi.title}
                </CardTitle>
                <div className={`rounded-lg ${kpi.bg} p-2`}>
                  <Icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpi.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  <span className={kpi.color}>{kpi.change}</span> vs ayer
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Próximos Turnos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Próximos Turnos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {proximosTurnos.map((turno, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                      {turno.hora}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{turno.paciente}</p>
                      <p className="text-xs text-muted-foreground">{turno.tipo}</p>
                    </div>
                  </div>
                  <Badge
                    variant={turno.estado === 'confirmada' ? 'default' : 'secondary'}
                    className={
                      turno.estado === 'confirmada'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
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
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Actividad Reciente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {actividadReciente.map((act, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-[60px]">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-medium">
                      {act.hora}
                    </span>
                  </div>
                  <p className="text-sm">{act.texto}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recordatorio de configuración */}
      <Card className="border-dashed border-primary/30 bg-primary/5">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Conectá tus canales de comunicación</p>
              <p className="text-xs text-muted-foreground">
                Configurá Twilio (WhatsApp) y el correo electrónico en la sección de Configuración
              </p>
            </div>
          </div>
          <Badge variant="outline" className="cursor-pointer hover:bg-primary hover:text-white transition-colors">
            Configurar
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
}
