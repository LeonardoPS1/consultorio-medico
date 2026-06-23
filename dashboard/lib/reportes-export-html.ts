/**
 * Template HTML para exportar reportes a PDF (imprimible)
 * Extraído del page.tsx para reducir bundle size (~35KB menos)
 */

import { escapeHtml } from '@/lib/html-utils';
import type { ReporteApiResponse, Periodo } from '@/app/dashboard/reportes/types';

export function generarHTMLReporte(
  data: ReporteApiResponse,
  periodo: Periodo,
): string {
  const periodoLabel =
    periodo === 'semana'
      ? 'Semanal'
      : periodo === 'mes'
        ? 'Mensual'
        : 'Anual';
  const fechaHoy = new Date().toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const maxTurnos = Math.max(...data.turnos.map((t) => t.cantidad)) || 1;
  const maxIntencion =
    Math.max(...data.intenciones.map((i) => i.cantidad)) || 1;

  return `<!DOCTYPE html>
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
  ${data.metricas
    .map(
      (m) => `<div class="kpi-card"><div class="val">${escapeHtml(m.valor)}</div><div class="lbl">${escapeHtml(m.titulo)}</div><div style="font-size:8px;color:${m.up ? '#10b981' : '#ef4444'};margin-top:2px">${escapeHtml(m.cambio)}</div></div>`,
    )
    .join('')}
</div>

<div class="section-title">📅 Turnos por Día</div>
<div style="background:#fafafa;border-radius:6px;padding:10px;border:1px solid #eee;margin-bottom:10px">
  <div class="chart-box">
    ${[0.25, 0.5, 0.75]
      .map(
        (f) =>
          `<div class="chart-line" style="bottom:${f * 100}%"><span>${Math.round(maxTurnos * f)}</span></div>`,
      )
      .join('')}
    <div class="chart-bars">
      ${data.turnos
        .map((t, i) => {
          const pct = Math.max((t.cantidad / maxTurnos) * 100, 5);
          const colores = [
            '#3b82f6',
            '#60a5fa',
            '#2563eb',
            '#1d4ed8',
            '#93c5fd',
            '#818cf8',
          ];
          return `<div class="chart-col">
          <div class="chart-num">${escapeHtml(String(t.cantidad))}</div>
          <div class="chart-bar" style="height:${pct}%;background-color:${colores[i % colores.length]}"></div>
          <div class="chart-label">${escapeHtml(t.dia)}</div>
        </div>`;
        })
        .join('')}
    </div>
  </div>
  <div style="display:flex;gap:10px;font-size:7px;color:#888;margin-top:4px;justify-content:center">
    <span>✅ Completados</span><span>❌ Cancelados</span><span>⏳ Ausentes</span>
  </div>
</div>

<div class="section-title">💬 Intenciones de Mensajes</div>
<div style="background:#fafafa;border-radius:6px;padding:10px;border:1px solid #eee;margin-bottom:10px">
  ${data.intenciones
    .map((item, idx) => {
      const colores = [
        '#3b82f6',
        '#10b981',
        '#f59e0b',
        '#8b5cf6',
        '#ef4444',
        '#64748b',
      ];
      return `<div class="hc-row">
      <div class="hc-label">${escapeHtml(item.intencion)}</div>
      <div class="hc-bar-wrap"><div class="hc-bar" style="width:${(item.cantidad / maxIntencion) * 100}%;background-color:${colores[idx]}"></div></div>
      <div class="hc-pct">${escapeHtml(String(item.porcentaje))}%</div>
    </div>`;
    })
    .join('')}
</div>

<div class="section-title">📱 WhatsApp</div>
<table>
  <tr><th>Métrica</th><th>Valor</th><th>Cambio</th></tr>
  ${data.whatsapp
    .map(
      (w) =>
        `<tr><td>${escapeHtml(w.titulo)}</td><td style="font-weight:600">${escapeHtml(w.valor)}</td><td style="color:${w.up ? '#10b981' : '#ef4444'}">${escapeHtml(w.cambio)}</td></tr>`,
    )
    .join('')}
</table>

<div class="section-title">👥 Pacientes</div>
<table>
  <tr><th>Métrica</th><th>Valor</th></tr>
  <tr><td>Total pacientes</td><td style="font-weight:600">${escapeHtml(String(data.pacientesKpis.total))}</td></tr>
  <tr><td>Nuevos en el período</td><td style="font-weight:600">${escapeHtml(String(data.pacientesKpis.nuevos))}</td></tr>
  <tr><td>Edad promedio</td><td style="font-weight:600">${escapeHtml(String(data.pacientesKpis.edadPromedio))} años</td></tr>
</table>

${data.ejecutivo
  ? `
<div class="section-title">🏆 Resumen Ejecutivo</div>
<table>
  <tr><th>Indicador</th><th>Valor</th></tr>
  <tr><td>Ingresos Proyectados</td><td style="font-weight:600">${escapeHtml(data.ejecutivo.totalIngresos)}</td></tr>
  <tr><td>Ocupación</td><td style="font-weight:600">${escapeHtml(data.ejecutivo.tasaOcupacion)}</td></tr>
  <tr><td>Satisfacción</td><td style="font-weight:600">${escapeHtml(data.ejecutivo.satisfaccion)}</td></tr>
  <tr><td>NPS</td><td style="font-weight:600">${escapeHtml(String(data.ejecutivo.nps))}</td></tr>
</table>

${data.conversionLeads
    ? `
<div class="section-title">🔄 Embudo de Conversión</div>
<table>
  <tr><th>Etapa</th><th>Cantidad</th><th>%</th></tr>
  ${data.conversionLeads
    .map(
      (c) =>
        `<tr><td>${escapeHtml(c.etapa)}</td><td style="font-weight:600">${escapeHtml(String(c.cantidad))}</td><td>${escapeHtml(String(c.porcentaje))}%</td></tr>`,
    )
    .join('')}
</table>`
    : ''}</div>`
  : ''}

<div class="footer">
  <strong>Consultorio Médico</strong> · Reporte generado automáticamente el ${fechaHoy}
</div>
<div class="print-btn">
  <button onclick="window.print()">🖨️ Guardar como PDF</button>
  <p style="font-size:10px;color:#888;margin-top:4px">Seleccioná "Guardar como PDF" en el diálogo de impresión</p>
</div>
</body></html>`;
}
