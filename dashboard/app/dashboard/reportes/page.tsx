'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import {
  TrendingUp, TrendingDown, Users, Calendar, MessageSquare, DollarSign,
  Download, BarChart3, PieChart, Activity, Phone, Mail, CheckCircle2, XCircle,
  Clock, ArrowUpRight, ArrowDownRight, FileSpreadsheet,
} from 'lucide-react';

// ============================================================
// Tipos y datos
// ============================================================

type Periodo = 'semana' | 'mes' | 'año';

interface Metricas { titulo: string; valor: string; cambio: string; icon?: any; up: boolean; }
interface TurnoDia { dia: string; cantidad: number; completados: number; cancelados: number; ausentes: number; }
interface WhatsAppM { titulo: string; valor: string; cambio: string; up: boolean; }

const intencionesData = [
  { intencion: 'Consulta', cantidad: 245, porcentaje: 38, icon: MessageSquare },
  { intencion: 'Reserva turno', cantidad: 180, porcentaje: 28, icon: Calendar },
  { intencion: 'Cancelación', cantidad: 65, porcentaje: 10, icon: XCircle },
  { intencion: 'Receta', cantidad: 85, porcentaje: 13, icon: Activity },
  { intencion: 'Urgencia', cantidad: 12, porcentaje: 2, icon: TrendingUp },
  { intencion: 'Otros', cantidad: 58, porcentaje: 9, icon: MessageSquare },
];

const pacientesPorObraSocial = [
  { obra: 'OSDE', cantidad: 28 }, { obra: 'Swiss Medical', cantidad: 22 },
  { obra: 'Galeno', cantidad: 15 }, { obra: 'Medicus', cantidad: 10 },
  { obra: 'Particular', cantidad: 32 }, { obra: 'Otras', cantidad: 8 },
];

const MaxObraSocial = Math.max(...pacientesPorObraSocial.map(t => t.cantidad));

const datosPorPeriodo: Record<Periodo, { metricas: Metricas[]; turnos: TurnoDia[]; whatsapp: WhatsAppM[]; nuevosPacientes: number[] }> = {
  semana: {
    metricas: [
      { titulo: 'Turnos esta semana', valor: '34', cambio: '+5%', icon: Calendar, up: true },
      { titulo: 'Pacientes nuevos', valor: '3', cambio: '+2', icon: Users, up: true },
      { titulo: 'Tasa de ausentismo', valor: '4.1%', cambio: '-0.5%', icon: TrendingDown, up: false },
      { titulo: 'Ingresos estimados', valor: '$98,000', cambio: '+7%', icon: DollarSign, up: true },
    ],
    turnos: [
      { dia: 'Lun', cantidad: 7, completados: 6, cancelados: 1, ausentes: 0 },
      { dia: 'Mar', cantidad: 8, completados: 7, cancelados: 0, ausentes: 1 },
      { dia: 'Mié', cantidad: 6, completados: 5, cancelados: 1, ausentes: 0 },
      { dia: 'Jue', cantidad: 8, completados: 8, cancelados: 0, ausentes: 0 },
      { dia: 'Vie', cantidad: 5, completados: 4, cancelados: 0, ausentes: 1 },
    ],
    whatsapp: [
      { titulo: 'Mensajes recibidos', valor: '287', cambio: '+8%', up: true },
      { titulo: 'Mensajes enviados', valor: '245', cambio: '+5%', up: true },
      { titulo: 'Tasa de respuesta', valor: '96%', cambio: '+2%', up: true },
      { titulo: 'Opt-outs', valor: '2', cambio: '-1', up: false },
    ],
    nuevosPacientes: [2, 1, 3, 0, 2],
  },
  mes: {
    metricas: [
      { titulo: 'Turnos este mes', valor: '142', cambio: '+12%', icon: Calendar, up: true },
      { titulo: 'Pacientes activos', valor: '89', cambio: '+8%', icon: Users, up: true },
      { titulo: 'Tasa de ausentismo', valor: '6.3%', cambio: '-2.1%', icon: TrendingDown, up: false },
      { titulo: 'Ingresos estimados', valor: '$425,000', cambio: '+18%', icon: DollarSign, up: true },
    ],
    turnos: [
      { dia: 'Lun', cantidad: 28, completados: 24, cancelados: 2, ausentes: 2 },
      { dia: 'Mar', cantidad: 32, completados: 30, cancelados: 1, ausentes: 1 },
      { dia: 'Mié', cantidad: 25, completados: 22, cancelados: 2, ausentes: 1 },
      { dia: 'Jue', cantidad: 35, completados: 32, cancelados: 1, ausentes: 2 },
      { dia: 'Vie', cantidad: 30, completados: 28, cancelados: 1, ausentes: 1 },
      { dia: 'Sáb', cantidad: 8, completados: 7, cancelados: 1, ausentes: 0 },
    ],
    whatsapp: [
      { titulo: 'Mensajes recibidos', valor: '1,245', cambio: '+23%', up: true },
      { titulo: 'Mensajes enviados', valor: '980', cambio: '+18%', up: true },
      { titulo: 'Tasa de respuesta', valor: '94%', cambio: '+5%', up: true },
      { titulo: 'Opt-outs', valor: '12', cambio: '-3%', up: false },
    ],
    nuevosPacientes: [5, 8, 12, 10, 8],
  },
  año: {
    metricas: [
      { titulo: 'Turnos este año', valor: '1,892', cambio: '+22%', icon: Calendar, up: true },
      { titulo: 'Pacientes totales', valor: '245', cambio: '+35%', icon: Users, up: true },
      { titulo: 'Tasa de ausentismo', valor: '5.8%', cambio: '-1.2%', icon: TrendingDown, up: false },
      { titulo: 'Ingresos estimados', valor: '$5.2M', cambio: '+31%', icon: DollarSign, up: true },
    ],
    turnos: [
      { dia: 'Ene', cantidad: 142, completados: 130, cancelados: 8, ausentes: 4 },
      { dia: 'Feb', cantidad: 158, completados: 145, cancelados: 7, ausentes: 6 },
      { dia: 'Mar', cantidad: 165, completados: 152, cancelados: 8, ausentes: 5 },
      { dia: 'Abr', cantidad: 148, completados: 138, cancelados: 6, ausentes: 4 },
      { dia: 'May', cantidad: 142, completados: 130, cancelados: 7, ausentes: 5 },
    ],
    whatsapp: [
      { titulo: 'Mensajes recibidos', valor: '12,450', cambio: '+45%', up: true },
      { titulo: 'Mensajes enviados', valor: '10,200', cambio: '+38%', up: true },
      { titulo: 'Tasa de respuesta', valor: '92%', cambio: '+3%', up: true },
      { titulo: 'Opt-outs', valor: '85', cambio: '-12%', up: false },
    ],
    nuevosPacientes: [12, 18, 22, 15, 20, 25, 28, 30, 22, 18, 15, 20],
  },
};

export default function ReportesPage() {
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const datos = datosPorPeriodo[periodo];
  const MaxTurnos = Math.max(...datos.turnos.map(t => t.cantidad));

  const exportarReporte = () => {
    const periodoLabel = periodo === 'semana' ? 'Semanal' : periodo === 'mes' ? 'Mensual' : 'Anual';
    const fechaHoy = new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
    const maxTurnos = Math.max(...datos.turnos.map(t => t.cantidad)) || 1;
    const maxIntencion = Math.max(...intencionesData.map(i => i.cantidad)) || 1;

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
  
  .chart-row { display:flex; align-items:flex-end; justify-content:space-between; gap:6px; height:100px; margin-bottom:12px; }
  .chart-col { flex:1; display:flex; flex-direction:column; align-items:center; gap:3px; height:100%; justify-content:flex-end; }
  .chart-bar { width:100%; border-radius:3px 3px 1px 1px; position:relative; min-height:4px; transition:all 0.3s; }
  .chart-label { font-size:8px; color:#666; font-weight:500; }
  .chart-num { font-size:9px; font-weight:700; color:#333; }
  
  .hc-row { display:flex; align-items:center; gap:8px; margin-bottom:6px; }
  .hc-bar-wrap { flex:1; background:#f0f0f0; border-radius:4px; height:14px; overflow:hidden; }
  .hc-bar { height:100%; border-radius:4px; transition:width 0.5s; }
  .hc-label { font-size:9px; min-width:80px; font-weight:500; }
  .hc-pct { font-size:9px; min-width:30px; text-align:right; color:#666; }

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
  ${datos.metricas.map(m => `<div class="kpi-card"><div class="val">${m.valor}</div><div class="lbl">${m.titulo}</div><div style="font-size:8px;color:${m.up ? '#10b981' : '#ef4444'};margin-top:2px">${m.cambio}</div></div>`).join('')}
</div>

<div class="section-title">📅 Turnos por Día</div>
<div style="background:#fafafa;border-radius:6px;padding:10px;border:1px solid #eee;margin-bottom:10px">
  <div style="display:flex;gap:10px;font-size:8px;color:#888;margin-bottom:4px">
    <span style="flex:1;text-align:center">Días</span>
  </div>
  <div class="chart-row">
    ${datos.turnos.map((t, i) => {
      const pct = Math.max((t.cantidad / maxTurnos) * 100, 4);
      const hue = 221 + i * 8;
      return `<div class="chart-col">
        <div class="chart-num">${t.cantidad}</div>
        <div class="chart-bar" style="height:${pct}%;background:linear-gradient(to top,hsl(${hue},80%,50%),hsl(${hue + 5},75%,60%))"></div>
        <div class="chart-label">${t.dia}</div>
      </div>`;
    }).join('')}
  </div>
  <div style="display:flex;gap:12px;font-size:8px;color:#888;margin-top:6px;justify-content:center">
    <span>✅ Completados</span><span>❌ Cancelados</span><span>⏳ Ausentes</span>
  </div>
</div>

<div class="section-title">💬 Intenciones de Mensajes</div>
<div style="background:#fafafa;border-radius:6px;padding:10px;border:1px solid #eee;margin-bottom:10px">
  ${intencionesData.map((item, idx) => {
    const colores = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#64748b'];
    return `<div class="hc-row">
      <div class="hc-label">${item.intencion}</div>
      <div class="hc-bar-wrap"><div class="hc-bar" style="width:${(item.cantidad / maxIntencion) * 100}%;background:${colores[idx]}"></div></div>
      <div class="hc-pct">${item.cantidad}</div>
    </div>`;
  }).join('')}
</div>

<div class="section-title">📱 WhatsApp</div>
<table>
  <tr><th>Métrica</th><th>Valor</th><th>Cambio</th></tr>
  ${datos.whatsapp.map(w => `<tr><td>${w.titulo}</td><td style="font-weight:600">${w.valor}</td><td style="color:${w.up ? '#10b981' : '#ef4444'}">${w.cambio}</td></tr>`).join('')}
</table>

<div class="section-title">👥 Pacientes por Obra Social</div>
<table>
  <tr><th>Obra Social</th><th>Cantidad</th></tr>
  ${pacientesPorObraSocial.map(p => `<tr><td>${p.obra}</td><td style="font-weight:600">${p.cantidad}</td></tr>`).join('')}
</table>

<div class="footer">
  <strong>Consultorio Médico</strong> · Reporte generado automáticamente el ${fechaHoy}
</div>
<div class="print-btn">
  <button onclick="window.print()">🖨️ Guardar como PDF</button>
  <p style="font-size:10px;color:#888;margin-top:4px">Seleccioná "Guardar como PDF" en el diálogo de impresión</p>
</div>
</body></html>`;

    const ventana = window.open('', '_blank');
    if (ventana) {
      ventana.document.write(html);
      ventana.document.close();
    } else {
      toast({ title: '❌ Error', description: 'Permití ventanas emergentes', variant: 'destructive' });
    }
    toast({ title: '📊 Reporte generado', description: `Período ${periodoLabel} - Abrí la ventana para guardar como PDF` });
  };

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
          <Button variant="outline" size="sm" onClick={exportarReporte}>
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
            {datos.metricas.map((m) => {
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
                <div className="flex items-end justify-between gap-1.5 h-56 px-1">
                  {datos.turnos.map((t, idx) => {
                    const maxVal = MaxTurnos || 1;
                    const altura = Math.max((t.cantidad / maxVal) * 100, t.cantidad > 0 ? 6 : 0);
                    const grados = 180 + idx * 15;
                    return (
                      <div key={t.dia} className="flex flex-col items-center gap-1 flex-1 h-full justify-end group">
                        <span className="text-xs font-semibold text-foreground/80 transition-all group-hover:scale-110">{t.cantidad}</span>
                        <div
                          className="w-full relative cursor-pointer transition-all duration-300 ease-out hover:scale-105 hover:shadow-lg"
                          style={{
                            height: `${altura}%`,
                            minHeight: t.cantidad > 0 ? '16px' : 0,
                            background: `linear-gradient(to top, hsl(221.2 83.2% 53.3%), hsl(${221.2 + idx * 5} ${70 + idx * 5}% ${55 + idx * 3}%))`,
                            borderRadius: '4px 4px 2px 2px',
                            boxShadow: '0 2px 8px hsl(221.2 83.2% 53.3% / 0.25)',
                          }}
                        >
                          {/* Brillito en la parte superior */}
                          <div className="absolute inset-x-[15%] top-0 h-1/3 rounded-full bg-white/20 blur-[1px]" />
                          {/* Tooltip */}
                          <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-xs rounded-lg px-2.5 py-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap shadow-lg border border-border/50 pointer-events-none z-10">
                            <div className="font-medium">{t.cantidad} turnos</div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              ✅ {t.completados} · ❌ {t.cancelados} · ⏳ {t.ausentes} ausentes
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-medium">{t.dia}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-center gap-5 mt-4 text-xs text-muted-foreground border-t pt-3">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Completados
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" /> Cancelados
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-red-500" /> Ausentes
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
                <div className="space-y-5">
                  {intencionesData.map((item, idx) => {
                    const Icon = item.icon;
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
                            className={`h-full rounded-full bg-gradient-to-r ${colores[idx]} transition-all duration-700 ease-out`}
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
            {datos.whatsapp.map((m) => (
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
