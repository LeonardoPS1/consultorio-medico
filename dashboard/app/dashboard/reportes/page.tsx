'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp, TrendingDown, Users, Calendar, MessageSquare, DollarSign,
  Download, BarChart3, PieChart, Activity, Phone, Mail, CheckCircle2, XCircle,
  Clock, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';

// ============================================================
// Datos mock completos
// ============================================================

const metricasGenerales = [
  { titulo: 'Turnos este mes', valor: '142', cambio: '+12%', icon: Calendar, up: true },
  { titulo: 'Pacientes activos', valor: '89', cambio: '+8%', icon: Users, up: true },
  { titulo: 'Tasa de ausentismo', valor: '6.3%', cambio: '-2.1%', icon: TrendingDown, up: false },
  { titulo: 'Ingresos estimados', valor: '$425,000', cambio: '+18%', icon: DollarSign, up: true },
];

const turnosPorDia = [
  { dia: 'Lun', cantidad: 28, completados: 24, cancelados: 2, ausentes: 2 },
  { dia: 'Mar', cantidad: 32, completados: 30, cancelados: 1, ausentes: 1 },
  { dia: 'Mié', cantidad: 25, completados: 22, cancelados: 2, ausentes: 1 },
  { dia: 'Jue', cantidad: 35, completados: 32, cancelados: 1, ausentes: 2 },
  { dia: 'Vie', cantidad: 30, completados: 28, cancelados: 1, ausentes: 1 },
  { dia: 'Sáb', cantidad: 8, completados: 7, cancelados: 1, ausentes: 0 },
];

const intencionesData = [
  { intencion: 'Consulta', cantidad: 245, porcentaje: 38, icon: MessageSquare },
  { intencion: 'Reserva turno', cantidad: 180, porcentaje: 28, icon: Calendar },
  { intencion: 'Cancelación', cantidad: 65, porcentaje: 10, icon: XCircle },
  { intencion: 'Receta', cantidad: 85, porcentaje: 13, icon: Activity },
  { intencion: 'Urgencia', cantidad: 12, porcentaje: 2, icon: TrendingUp },
  { intencion: 'Otros', cantidad: 58, porcentaje: 9, icon: MessageSquare },
];

const pacientesPorObraSocial = [
  { obra: 'OSDE', cantidad: 28 },
  { obra: 'Swiss Medical', cantidad: 22 },
  { obra: 'Galeno', cantidad: 15 },
  { obra: 'Medicus', cantidad: 10 },
  { obra: 'Particular', cantidad: 32 },
  { obra: 'Otras', cantidad: 8 },
];

const metricasWhatsApp = [
  { titulo: 'Mensajes recibidos', valor: '1,245', cambio: '+23%', up: true },
  { titulo: 'Mensajes enviados', valor: '980', cambio: '+18%', up: true },
  { titulo: 'Tasa de respuesta', valor: '94%', cambio: '+5%', up: true },
  { titulo: 'Opt-outs', valor: '12', cambio: '-3%', up: false },
];

const MaxTurnos = Math.max(...turnosPorDia.map(t => t.cantidad));
const MaxObraSocial = Math.max(...pacientesPorObraSocial.map(p => p.cantidad));

export default function ReportesPage() {
  const [periodo, setPeriodo] = useState('mes');

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Reportes</h2>
          <p className="text-muted-foreground">
            Métricas y estadísticas del consultorio
          </p>
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
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            Exportar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">
            <BarChart3 className="h-4 w-4 mr-1" />
            General
          </TabsTrigger>
          <TabsTrigger value="turnos">
            <Calendar className="h-4 w-4 mr-1" />
            Turnos
          </TabsTrigger>
          <TabsTrigger value="pacientes">
            <Users className="h-4 w-4 mr-1" />
            Pacientes
          </TabsTrigger>
          <TabsTrigger value="whatsapp">
            <MessageSquare className="h-4 w-4 mr-1" />
            WhatsApp
          </TabsTrigger>
        </TabsList>

        {/* ============ TAB GENERAL ============ */}
        <TabsContent value="general" className="mt-4 space-y-6">
          {/* KPIs */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {metricasGenerales.map((m) => {
              const Icon = m.icon;
              return (
                <Card key={m.titulo} className="transition-all hover:shadow-md">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{m.titulo}</CardTitle>
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
            {/* Gráfico Turnos por día */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Turnos por día de la semana
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between gap-2 h-48">
                  {turnosPorDia.map((t) => (
                    <div key={t.dia} className="flex flex-col items-center gap-2 flex-1">
                      <span className="text-xs font-medium text-muted-foreground">{t.cantidad}</span>
                      <div className="w-full rounded-md bg-primary/80 hover:bg-primary transition-colors relative group"
                        style={{ height: `${(t.cantidad / MaxTurnos) * 100}%` }}
                      >
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md">
                          {t.completados} completados · {t.cancelados} cancelados
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">{t.dia}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" /> Completados
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-amber-500" /> Cancelados
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-red-500" /> Ausentes
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Intenciones */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-primary" />
                  Intenciones de mensajes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {intencionesData.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.intencion}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="flex items-center gap-2">
                            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                            {item.intencion}
                          </span>
                          <span className="text-muted-foreground">
                            {item.cantidad} ({item.porcentaje}%)
                          </span>
                        </div>
                        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-500"
                            style={{ width: `${item.porcentaje}%` }}
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

        {/* ============ TAB TURNOS ============ */}
        <TabsContent value="turnos" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Turnos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">158</div>
                <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
                  <ArrowUpRight className="h-3 w-3" /> +12% este mes
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Tasa de Asistencia</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">93.7%</div>
                <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
                  <ArrowUpRight className="h-3 w-3" /> +2.1% vs mes anterior
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Duración Promedio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">28 min</div>
                <p className="text-xs text-muted-foreground mt-1">Por consulta</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Distribución por Estado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-4">
                {[
                  { estado: 'Completados', valor: 115, color: 'bg-emerald-500' },
                  { estado: 'Pendientes', valor: 18, color: 'bg-amber-500' },
                  { estado: 'Cancelados', valor: 15, color: 'bg-red-500' },
                  { estado: 'Ausentes', valor: 8, color: 'bg-purple-500' },
                  { estado: 'En consulta', valor: 2, color: 'bg-blue-500' },
                ].map((item) => (
                  <div key={item.estado} className="text-center">
                    <div className="flex items-center justify-center h-20 mb-2">
                      <div className={`w-full rounded-lg ${item.color} opacity-80`}
                        style={{ height: `${(item.valor / 115) * 100}%`, maxHeight: '100%' }}
                      />
                    </div>
                    <p className="text-lg font-bold">{item.valor}</p>
                    <p className="text-xs text-muted-foreground">{item.estado}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Próximos Pasos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/5 border border-amber-200/50">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-amber-600" />
                    <div>
                      <p className="text-sm font-medium">Exportación a Excel</p>
                      <p className="text-xs text-muted-foreground">Descargá reportes detallados en formato XLSX</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-amber-600 border-amber-300">Próximamente</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/5 border border-blue-200/50">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium">Comparativa mensual</p>
                      <p className="text-xs text-muted-foreground">Compará métricas entre períodos seleccionables</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-blue-600 border-blue-300">Próximamente</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ TAB PACIENTES ============ */}
        <TabsContent value="pacientes" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Pacientes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">89</div>
                <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
                  <ArrowUpRight className="h-3 w-3" /> +8 nuevos este mes
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pacientes Frecuentes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">42</div>
                <p className="text-xs text-muted-foreground mt-1">+3 turnos en los últimos 6 meses</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Edad Promedio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">42</div>
                <p className="text-xs text-muted-foreground mt-1">Rango: 18-85 años</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Distribución por Obra Social</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {pacientesPorObraSocial.map((p) => (
                  <div key={p.obra}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{p.obra}</span>
                      <span className="text-muted-foreground">{p.cantidad} ({Math.round(p.cantidad / 115 * 100)}%)</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${(p.cantidad / MaxObraSocial) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Nuevos Pacientes por Mes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between gap-2 h-40">
                  {['Ene', 'Feb', 'Mar', 'Abr', 'May'].map((mes, i) => {
                    const valores = [5, 8, 12, 10, 8];
                    return (
                      <div key={mes} className="flex flex-col items-center gap-2 flex-1">
                        <span className="text-xs text-muted-foreground">{valores[i]}</span>
                        <div
                          className="w-full rounded-md bg-emerald-400/80 hover:bg-emerald-400 transition-colors"
                          style={{ height: `${(valores[i] / 12) * 100}%` }}
                        />
                        <span className="text-xs text-muted-foreground">{mes}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ============ TAB WHATSAPP ============ */}
        <TabsContent value="whatsapp" className="mt-4 space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {metricasWhatsApp.map((m) => (
              <Card key={m.titulo}>
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
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Volumen de Mensajes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between gap-2 h-40">
                  {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((dia, i) => {
                    const recibidos = [45, 52, 38, 55, 48, 12];
                    const enviados = [35, 42, 30, 45, 38, 8];
                    return (
                      <div key={dia} className="flex flex-col items-center gap-1 flex-1">
                        <div className="w-full flex flex-col-reverse gap-0.5 h-32">
                          <div
                            className="w-full rounded-sm bg-primary/60"
                            style={{ height: `${(enviados[i] / 55) * 100}%` }}
                          />
                          <div
                            className="w-full rounded-sm bg-primary"
                            style={{ height: `${(recibidos[i] / 55) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{dia}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary" /> Recibidos</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary/60" /> Enviados</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Canales de Contacto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { canal: 'WhatsApp', porcentaje: 78, icon: MessageSquare, color: 'bg-emerald-500' },
                  { canal: 'Email', porcentaje: 15, icon: Mail, color: 'bg-blue-500' },
                  { canal: 'SMS', porcentaje: 5, icon: Phone, color: 'bg-purple-500' },
                  { canal: 'Web', porcentaje: 2, icon: GlobeIcon, color: 'bg-amber-500' },
                ].map((item) => {
                  const Icon = item.icon;
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
                        <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.porcentaje}%` }} />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Calidad de Respuesta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-lg bg-emerald-500/5">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-emerald-600">94%</p>
                  <p className="text-xs text-muted-foreground">Tasa de respuesta</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-blue-500/5">
                  <Clock className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-blue-600">&lt;5 min</p>
                  <p className="text-xs text-muted-foreground">Tiempo promedio</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-purple-500/5">
                  <MessageSquare className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-purple-600">2.3</p>
                  <p className="text-xs text-muted-foreground">Mensajes por conv.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Needed for the web icon
function GlobeIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="2" x2="22" y1="12" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}
