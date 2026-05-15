'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, Users, Calendar, MessageSquare, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Datos mock
const metricas = [
  { titulo: 'Turnos este mes', valor: '142', cambio: '+12%', icon: Calendar, up: true },
  { titulo: 'Pacientes activos', valor: '89', cambio: '+8%', icon: Users, up: true },
  { titulo: 'Tasa de ausentismo', valor: '6.3%', cambio: '-2.1%', icon: TrendingDown, up: false },
  { titulo: 'Ingresos estimados', valor: '$425,000', cambio: '+18%', icon: DollarSign, up: true },
];

const intencionesData = [
  { intencion: 'Consulta', cantidad: 245, porcentaje: 38 },
  { intencion: 'Reserva turno', cantidad: 180, porcentaje: 28 },
  { intencion: 'Cancelación', cantidad: 65, porcentaje: 10 },
  { intencion: 'Receta', cantidad: 85, porcentaje: 13 },
  { intencion: 'Urgencia', cantidad: 12, porcentaje: 2 },
  { intencion: 'Otros', cantidad: 58, porcentaje: 9 },
];

const diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const turnosPorDia = [28, 32, 25, 35, 30, 8];

export default function ReportesPage() {
  const maxTurnos = Math.max(...turnosPorDia);

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Reportes</h2>
        <p className="text-muted-foreground">
          Métricas y estadísticas del consultorio
        </p>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="turnos">Turnos</TabsTrigger>
          <TabsTrigger value="pacientes">Pacientes</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-4 space-y-6">
          {/* KPIs */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {metricas.map((m) => {
              const Icon = m.icon;
              return (
                <Card key={m.titulo}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {m.titulo}
                    </CardTitle>
                    <Icon className="h-4 w-4 text-muted-foreground" />
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
                        {m.cambio} vs mes anterior
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Gráfico de barras simple */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Turnos por día de la semana</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between gap-2 h-40">
                  {diasSemana.map((dia, i) => (
                    <div key={dia} className="flex flex-col items-center gap-2 flex-1">
                      <span className="text-xs text-muted-foreground">{turnosPorDia[i]}</span>
                      <div
                        className="w-full rounded-md bg-primary/80 hover:bg-primary transition-colors"
                        style={{ height: `${(turnosPorDia[i] / maxTurnos) * 100}%` }}
                      />
                      <span className="text-xs text-muted-foreground">{dia}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Intenciones de mensajes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Intenciones de mensajes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {intencionesData.map((item) => (
                    <div key={item.intencion}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{item.intencion}</span>
                        <span className="text-muted-foreground">
                          {item.cantidad} ({item.porcentaje}%)
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${item.porcentaje}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="turnos" className="mt-4">
          <Card>
            <CardContent className="flex items-center justify-center h-64">
              <div className="text-center">
                <Calendar className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-lg font-medium text-muted-foreground">Reportes detallados de turnos</p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Próximamente: exportación a Excel, filtros avanzados, comparativas
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pacientes" className="mt-4">
          <Card>
            <CardContent className="flex items-center justify-center h-64">
              <div className="text-center">
                <Users className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-lg font-medium text-muted-foreground">Reportes de pacientes</p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Distribución por obra social, edad, frecuencia de visitas
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp" className="mt-4">
          <Card>
            <CardContent className="flex items-center justify-center h-64">
              <div className="text-center">
                <MessageSquare className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-lg font-medium text-muted-foreground">Métricas de WhatsApp</p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Mensajes enviados, recibidos, tasa de respuesta, opt-outs
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
