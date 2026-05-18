'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import {
  TrendingUp, TrendingDown, MessageSquare, Calendar, Activity,
  Download, BarChart3, PieChart, Mail, CheckCircle2,
  Clock, ArrowUpRight, Users, Phone, XCircle, FileSpreadsheet,
  FileText,
} from 'lucide-react';
import {
  Periodo,
  intencionesPorPeriodo,
  pacientesPorObraSocial, MaxObraSocial,
  datosPorPeriodo, comparativaPorPeriodo,
} from './reportes-data';
import TurnosChart from '@/components/charts/turnos-chart';
import NuevosPacientesChart from '@/components/charts/nuevos-pacientes-chart';
import VolumenWhatsAppChart from '@/components/charts/volumen-whatsapp-chart';
import DistribucionEstadosChart from '@/components/charts/distribucion-estados-chart';
import ComparativaMensual from '@/components/reportes/comparativa-mensual';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { exportReporteExcel } from '@/lib/export-reporte-excel';

const iconosIntencion = [
  MessageSquare, Calendar, XCircle, Activity, TrendingUp, MessageSquare,
];

export default function ReportesPage() {
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const datos = datosPorPeriodo[periodo];
  const intencionesData = intencionesPorPeriodo[periodo];
  const comparativa = comparativaPorPeriodo[periodo];

  const exportarReporte = (formato: 'pdf' | 'excel') => {
    const periodoLabel = periodo === 'semana' ? 'Semanal' : periodo === 'mes' ? 'Mensual' : 'Anual';
    const fechaHoy = new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
    const maxTurnos = Math.max(...datos.turnos.map(t => t.cantidad)) || 1;
    const intencionesExport = intencionesPorPeriodo[periodo];
    const maxIntencion = Math.max(...intencionesExport.map(i => i.cantidad)) || 1;

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
  ${datos.metricas.map(m => `<div class="kpi-card"><div class="val">${m.valor}</div><div class="lbl">${m.titulo}</div><div style="font-size:8px;color:${m.up ? '#10b981' : '#ef4444'};margin-top:2px">${m.cambio}</div></div>`).join('')}
</div>

<div class="section-title">📅 Turnos por Día</div>
<div style="background:#fafafa;border-radius:6px;padding:10px;border:1px solid #eee;margin-bottom:10px">
  <div class="chart-box">
    ${[0.25, 0.5, 0.75].map(f => `<div class="chart-line" style="bottom:${f * 100}%"><span>${Math.round(maxTurnos * f)}</span></div>`).join('')}
    <div class="chart-bars">
      ${datos.turnos.map((t, i) => {
        const pct = Math.max((t.cantidad / maxTurnos) * 100, 5);
        const colores = ['#3b82f6','#60a5fa','#2563eb','#1d4ed8','#93c5fd','#818cf8'];
        return `<div class="chart-col">
          <div class="chart-num">${t.cantidad}</div>
          <div class="chart-bar" style="height:${pct}%;background-color:${colores[i % colores.length]}"></div>
          <div class="chart-label">${t.dia}</div>
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
  ${intencionesExport.map((item, idx) => {
    const colores = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#64748b'];
    return `<div class=\"hc-row\">
      <div class=\"hc-label\">${item.intencion}</div>
      <div class=\"hc-bar-wrap\"><div class=\"hc-bar\" style=\"width:${(item.cantidad / maxIntencion) * 100}%;background-color:${colores[idx]}\"></div></div>
      <div class=\"hc-pct\">${item.cantidad}</div>
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

    if (formato === 'excel') {
      try {
        exportReporteExcel({
          periodo,
          datos,
          intenciones: intencionesData,
          pacientesObraSocial: pacientesPorObraSocial,
          fecha: fechaHoy,
        });
        toast({ title: '📊 Excel descargado', description: `Reporte ${periodoLabel} exportado correctamente` });
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
          <TabsTrigger value="comparativa">
            <Activity className="h-4 w-4 mr-1" />
            Comparativa
          </TabsTrigger>
        </TabsList>

        {/* ============ TAB GENERAL ============ */}
        <TabsContent value="general" className="mt-4 space-y-6">
          {/* KPIs */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {datos.metricas.map((m) => {
              const Icon = m.icon;
              return (
                <Card key={m.titulo} className="transition-[transform,box-shadow] duration-200 hoverable:hover:-translate-y-[1px] hoverable:hover:shadow-card-hover">
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
                  Turnos por día
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <TurnosChart data={datos.turnos} />
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
                <div className="text-2xl font-bold">{datos.turnosKpis.total}</div>
                <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
                  <ArrowUpRight className="h-3 w-3" /> {datos.turnosKpis.cambioTotal} este {periodo === 'año' ? 'año' : periodo === 'mes' ? 'mes' : 'período'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Tasa de Asistencia</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{datos.turnosKpis.asistencia}</div>
                <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
                  <ArrowUpRight className="h-3 w-3" /> vs período anterior
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Duración Promedio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{datos.turnosKpis.duracion}</div>
                <p className="text-xs text-muted-foreground mt-1">Por consulta</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Distribución por Estado</CardTitle>
            </CardHeader>
            <CardContent>
              <DistribucionEstadosChart data={datos.distribucionEstados} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                Features disponibles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-200/50">
                  <Download className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Exportar a Excel</p>
                    <p className="text-xs text-muted-foreground">Descargalo desde el botón Exportar</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-200/50">
                  <Activity className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Comparativa mensual</p>
                    <p className="text-xs text-muted-foreground">Analizala en la pestaña Comparativa</p>
                  </div>
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
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {periodo === 'año' ? 'Total Pacientes en el año' : periodo === 'mes' ? 'Pacientes Activos' : 'Pacientes en la semana'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{datos.pacientesKpis.total}</div>
                <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
                  <ArrowUpRight className="h-3 w-3" /> +{datos.pacientesKpis.nuevos} nuevos este {periodo === 'año' ? 'año' : periodo === 'mes' ? 'mes' : 'período'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pacientes Frecuentes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{datos.pacientesKpis.frecuentes}</div>
                <p className="text-xs text-muted-foreground mt-1">+3 turnos en los últimos 6 meses</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Edad Promedio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{datos.pacientesKpis.edadPromedio}</div>
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
                {pacientesPorObraSocial.map((p) => {
                  const totalPac = pacientesPorObraSocial.reduce((sum, o) => sum + o.cantidad, 0);
                  return (
                    <div key={p.obra}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{p.obra}</span>
                        <span className="text-muted-foreground">{p.cantidad} ({Math.round(p.cantidad / totalPac * 100)}%)</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full origin-left transition-transform duration-300 ease-out"
                          style={{ transform: `scaleX(${p.cantidad / MaxObraSocial})`, width: '100%' }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Nuevos Pacientes</CardTitle>
              </CardHeader>
              <CardContent>
                <NuevosPacientesChart
                  data={datos.nuevosPacientes.map((val, i) => ({
                    label: datos.nuevosPacientesLabels[i] || `#${i + 1}`,
                    valor: val,
                  }))}
                />
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
                <VolumenWhatsAppChart data={datos.volumenWhatsApp} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Canales de Contacto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(() => {
                  const iconosCanal = [MessageSquare, Mail, Phone, GlobeIcon];
                  const coloresCanal = ['bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500'];
                  return datos.canalesContacto.map((item, i) => {
                    const Icon = iconosCanal[i];
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
                          <div className={`h-full ${coloresCanal[i]} rounded-full origin-left transition-transform duration-300 ease-out`} style={{ transform: `scaleX(${item.porcentaje / 100})`, width: '100%' }} />
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
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-lg bg-emerald-500/5">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-emerald-600">{datos.calidadRespuesta.tasa}</p>
                  <p className="text-xs text-muted-foreground">Tasa de respuesta</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-blue-500/5">
                  <Clock className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-blue-600">&lt;{datos.calidadRespuesta.tiempo}</p>
                  <p className="text-xs text-muted-foreground">Tiempo promedio</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-purple-500/5">
                  <MessageSquare className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-purple-600">{datos.calidadRespuesta.msgsPorConv}</p>
                  <p className="text-xs text-muted-foreground">Mensajes por conv.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ TAB COMPARATIVA ============ */}
        <TabsContent value="comparativa" className="mt-4 space-y-6">
          <ComparativaMensual data={comparativa} periodo={periodo} />
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
