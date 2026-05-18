// ============================================================
// Exportación a Excel de Reportes
// ============================================================
import * as XLSX from 'xlsx';
import type { ReportesData, Periodo, IntencionMensaje } from '@/app/dashboard/reportes/reportes-data';

export interface ExcelExportInput {
  periodo: Periodo;
  datos: ReportesData;
  intenciones: IntencionMensaje[];
  pacientesObraSocial: { obra: string; cantidad: number }[];
  fecha: string;
}

export function exportReporteExcel(input: ExcelExportInput): void {
  const { periodo, datos, intenciones, pacientesObraSocial, fecha } = input;
  const periodoLabel = periodo === 'semana' ? 'Semanal' : periodo === 'mes' ? 'Mensual' : 'Anual';

  const wb = XLSX.utils.book_new();

  // ─── Hoja 1: Resumen ─────────────────────────────────
  const resumenRows: any[][] = [
    ['Reporte ' + periodoLabel, fecha],
    ['Consultorio Médico — Sistema de Gestión'],
    [],
    ['Métrica', 'Valor', 'Cambio'],
    ...datos.metricas.map(m => [m.titulo, m.valor, `${m.cambio}${m.up ? ' ↑' : ' ↓'}`]),
    [],
    ['KPIs Turnos', '', ''],
    ['Total Turnos', datos.turnosKpis.total, datos.turnosKpis.cambioTotal],
    ['Tasa Asistencia', datos.turnosKpis.asistencia, ''],
    ['Duración Promedio', datos.turnosKpis.duracion, ''],
    [],
    ['KPIs Pacientes', '', ''],
    ['Total Pacientes', datos.pacientesKpis.total, ''],
    ['Nuevos', datos.pacientesKpis.nuevos, ''],
    ['Frecuentes', datos.pacientesKpis.frecuentes, ''],
    ['Edad Promedio', datos.pacientesKpis.edadPromedio, ''],
    [],
    ['WhatsApp', '', ''],
    ...datos.whatsapp.map(w => [w.titulo, w.valor, `${w.cambio}${w.up ? ' ↑' : ' ↓'}`]),
    [],
    ['Calidad Respuesta', '', ''],
    ['Tasa', datos.calidadRespuesta.tasa, ''],
    ['Tiempo Promedio', datos.calidadRespuesta.tiempo, ''],
    ['Mensajes por Conv.', datos.calidadRespuesta.msgsPorConv, ''],
  ];

  const wsResumen = XLSX.utils.aoa_to_sheet(resumenRows);
  wsResumen['!cols'] = [{ wch: 24 }, { wch: 16 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

  // ─── Hoja 2: Turnos por día ──────────────────────────
  const turnosRows: any[][] = [
    ['Día', 'Total', 'Completados', 'Cancelados', 'Ausentes'],
    ...datos.turnos.map(t => [t.dia, t.cantidad, t.completados, t.cancelados, t.ausentes]),
  ];
  const wsTurnos = XLSX.utils.aoa_to_sheet(turnosRows);
  wsTurnos['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, wsTurnos, 'Turnos');

  // ─── Hoja 3: Intenciones ────────────────────────────
  const intencionesRows: any[][] = [
    ['Intención', 'Cantidad', 'Porcentaje'],
    ...intenciones.map(i => [i.intencion, i.cantidad, `${i.porcentaje}%`]),
  ];
  const wsIntenciones = XLSX.utils.aoa_to_sheet(intencionesRows);
  wsIntenciones['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsIntenciones, 'Intenciones');

  // ─── Hoja 4: Obra Social ─────────────────────────────
  const osRows: any[][] = [
    ['Obra Social', 'Cantidad'],
    ...pacientesObraSocial.map(p => [p.obra, p.cantidad]),
  ];
  const wsOS = XLSX.utils.aoa_to_sheet(osRows);
  wsOS['!cols'] = [{ wch: 20 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsOS, 'Obra Social');

  // ─── Hoja 5: Canales de Contacto ─────────────────────
  const canalesRows: any[][] = [
    ['Canal', 'Porcentaje'],
    ...datos.canalesContacto.map(c => [c.canal, `${c.porcentaje}%`]),
  ];
  const wsCanales = XLSX.utils.aoa_to_sheet(canalesRows);
  wsCanales['!cols'] = [{ wch: 16 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsCanales, 'Canales');

  // ─── Descargar ───────────────────────────────────────
  const wbname = `reporte-${periodoLabel.toLowerCase()}-${fecha.replace(/\//g, '-')}.xlsx`;
  XLSX.writeFile(wb, wbname);
}
