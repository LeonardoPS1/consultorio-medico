// ============================================================
// Tipos y datos para la página de Reportes
// ============================================================

import {
  Calendar, Users, TrendingDown, DollarSign,
} from 'lucide-react';
import type { ComponentType, SVGProps } from 'react';

export type Periodo = 'semana' | 'mes' | 'año';

export interface Metricas { titulo: string; valor: string; cambio: string; icon: ComponentType<SVGProps<SVGSVGElement>>; up: boolean; }
export interface TurnoDia { dia: string; cantidad: number; completados: number; cancelados: number; ausentes: number; }
export interface WhatsAppM { titulo: string; valor: string; cambio: string; up: boolean; }

export interface DistribucionEstado { estado: string; valor: number; color: string; }
export interface WhatsAppVolumen { dia: string; recibidos: number; enviados: number; }
export interface IntencionMensaje { intencion: string; cantidad: number; porcentaje: number; }

export interface ReportesData {
  metricas: Metricas[];
  turnos: TurnoDia[];
  whatsapp: WhatsAppM[];
  nuevosPacientes: number[];
  turnosKpis: { total: number; asistencia: string; duracion: string; cambioTotal: string };
  distribucionEstados: DistribucionEstado[];
  pacientesKpis: { total: number; nuevos: number; frecuentes: number; edadPromedio: number };
  nuevosPacientesLabels: string[];
  volumenWhatsApp: WhatsAppVolumen[];
  canalesContacto: { canal: string; porcentaje: number; }[];
  calidadRespuesta: { tasa: string; tiempo: string; msgsPorConv: string };
}

export const intencionesPorPeriodo: Record<Periodo, IntencionMensaje[]> = {
  semana: [
    { intencion: 'Consulta', cantidad: 38, porcentaje: 35 },
    { intencion: 'Reserva turno', cantidad: 32, porcentaje: 30 },
    { intencion: 'Cancelación', cantidad: 12, porcentaje: 11 },
    { intencion: 'Receta', cantidad: 15, porcentaje: 14 },
    { intencion: 'Urgencia', cantidad: 3, porcentaje: 3 },
    { intencion: 'Otros', cantidad: 8, porcentaje: 7 },
  ],
  mes: [
    { intencion: 'Consulta', cantidad: 158, porcentaje: 36 },
    { intencion: 'Reserva turno', cantidad: 125, porcentaje: 28 },
    { intencion: 'Cancelación', cantidad: 38, porcentaje: 9 },
    { intencion: 'Receta', cantidad: 58, porcentaje: 13 },
    { intencion: 'Urgencia', cantidad: 8, porcentaje: 2 },
    { intencion: 'Otros', cantidad: 52, porcentaje: 12 },
  ],
  año: [
    { intencion: 'Consulta', cantidad: 1980, porcentaje: 38 },
    { intencion: 'Reserva turno', cantidad: 1480, porcentaje: 28 },
    { intencion: 'Cancelación', cantidad: 520, porcentaje: 10 },
    { intencion: 'Receta', cantidad: 680, porcentaje: 13 },
    { intencion: 'Urgencia', cantidad: 95, porcentaje: 2 },
    { intencion: 'Otros', cantidad: 475, porcentaje: 9 },
  ],
};

export const pacientesPorObraSocial = [
  { obra: 'OSDE', cantidad: 28 }, { obra: 'Swiss Medical', cantidad: 22 },
  { obra: 'Galeno', cantidad: 15 }, { obra: 'Medicus', cantidad: 10 },
  { obra: 'Particular', cantidad: 32 }, { obra: 'Otras', cantidad: 8 },
];

// ─── Comparativa Mensual ──────────────────────────────────
export interface ComparativaKpi {
  titulo: string;
  actual: string;
  anterior: string;
  cambio: string;
  cambioPct: string;
  up: boolean;
}

export interface ComparativaTurno {
  label: string;
  actual: number;
  anterior: number;
}

export interface ComparativaIntencion {
  intencion: string;
  actual: number;
  anterior: number;
  cambioPct: number;
}

export interface ComparativaData {
  kpis: ComparativaKpi[];
  turnos: ComparativaTurno[];
  intenciones: ComparativaIntencion[];
  whatsapp: { titulo: string; actual: string; anterior: string; cambio: string; up: boolean }[];
  pacientesActual: number;
  pacientesAnterior: number;
}

export const comparativaPorPeriodo: Record<Periodo, ComparativaData> = {
  semana: {
    kpis: [
      { titulo: 'Turnos', actual: '34', anterior: '31', cambio: '+3', cambioPct: '+9.7%', up: true },
      { titulo: 'Pacientes nuevos', actual: '3', anterior: '5', cambio: '-2', cambioPct: '-40%', up: false },
      { titulo: 'Ausentismo', actual: '4.1%', anterior: '4.6%', cambio: '-0.5pp', cambioPct: '-10.9%', up: true },
      { titulo: 'Ingresos', actual: '$98,000', anterior: '$91,500', cambio: '+$6,500', cambioPct: '+7.1%', up: true },
    ],
    turnos: [
      { label: 'Lun', actual: 7, anterior: 6 },
      { label: 'Mar', actual: 8, anterior: 7 },
      { label: 'Mié', actual: 6, anterior: 8 },
      { label: 'Jue', actual: 8, anterior: 5 },
      { label: 'Vie', actual: 5, anterior: 7 },
    ],
    intenciones: [
      { intencion: 'Consulta', actual: 38, anterior: 35, cambioPct: 8.6 },
      { intencion: 'Reserva turno', actual: 32, anterior: 28, cambioPct: 14.3 },
      { intencion: 'Cancelación', actual: 12, anterior: 15, cambioPct: -20 },
      { intencion: 'Receta', actual: 15, anterior: 12, cambioPct: 25 },
      { intencion: 'Urgencia', actual: 3, anterior: 4, cambioPct: -25 },
      { intencion: 'Otros', actual: 8, anterior: 10, cambioPct: -20 },
    ],
    whatsapp: [
      { titulo: 'Mensajes recibidos', actual: '287', anterior: '265', cambio: '+22', up: true },
      { titulo: 'Mensajes enviados', actual: '245', anterior: '233', cambio: '+12', up: true },
      { titulo: 'Tasa de respuesta', actual: '96%', anterior: '94%', cambio: '+2pp', up: true },
      { titulo: 'Opt-outs', actual: '2', anterior: '3', cambio: '-1', up: true },
    ],
    pacientesActual: 89,
    pacientesAnterior: 84,
  },
  mes: {
    kpis: [
      { titulo: 'Turnos', actual: '142', anterior: '127', cambio: '+15', cambioPct: '+11.8%', up: true },
      { titulo: 'Pacientes activos', actual: '89', anterior: '82', cambio: '+7', cambioPct: '+8.5%', up: true },
      { titulo: 'Ausentismo', actual: '6.3%', anterior: '8.4%', cambio: '-2.1pp', cambioPct: '-25%', up: true },
      { titulo: 'Ingresos', actual: '$425,000', anterior: '$360,000', cambio: '+$65,000', cambioPct: '+18.1%', up: true },
    ],
    turnos: [
      { label: 'Lun', actual: 28, anterior: 25 },
      { label: 'Mar', actual: 32, anterior: 28 },
      { label: 'Mié', actual: 25, anterior: 22 },
      { label: 'Jue', actual: 35, anterior: 30 },
      { label: 'Vie', actual: 30, anterior: 28 },
      { label: 'Sáb', actual: 8, anterior: 10 },
    ],
    intenciones: [
      { intencion: 'Consulta', actual: 158, anterior: 142, cambioPct: 11.3 },
      { intencion: 'Reserva turno', actual: 125, anterior: 108, cambioPct: 15.7 },
      { intencion: 'Cancelación', actual: 38, anterior: 42, cambioPct: -9.5 },
      { intencion: 'Receta', actual: 58, anterior: 52, cambioPct: 11.5 },
      { intencion: 'Urgencia', actual: 8, anterior: 12, cambioPct: -33.3 },
      { intencion: 'Otros', actual: 52, anterior: 48, cambioPct: 8.3 },
    ],
    whatsapp: [
      { titulo: 'Mensajes recibidos', actual: '1,245', anterior: '1,012', cambio: '+233', up: true },
      { titulo: 'Mensajes enviados', actual: '980', anterior: '830', cambio: '+150', up: true },
      { titulo: 'Tasa de respuesta', actual: '94%', anterior: '89%', cambio: '+5pp', up: true },
      { titulo: 'Opt-outs', actual: '12', anterior: '15', cambio: '-3', up: true },
    ],
    pacientesActual: 89,
    pacientesAnterior: 82,
  },
  año: {
    kpis: [
      { titulo: 'Turnos', actual: '1,892', anterior: '1,551', cambio: '+341', cambioPct: '+22%', up: true },
      { titulo: 'Pacientes totales', actual: '245', anterior: '181', cambio: '+64', cambioPct: '+35.4%', up: true },
      { titulo: 'Ausentismo', actual: '5.8%', anterior: '7.0%', cambio: '-1.2pp', cambioPct: '-17.1%', up: true },
      { titulo: 'Ingresos', actual: '$5.2M', anterior: '$3.97M', cambio: '+$1.23M', cambioPct: '+31%', up: true },
    ],
    turnos: [
      { label: 'Ene', actual: 142, anterior: 130 },
      { label: 'Feb', actual: 158, anterior: 135 },
      { label: 'Mar', actual: 165, anterior: 140 },
      { label: 'Abr', actual: 148, anterior: 125 },
      { label: 'May', actual: 142, anterior: 128 },
    ],
    intenciones: [
      { intencion: 'Consulta', actual: 1980, anterior: 1650, cambioPct: 20 },
      { intencion: 'Reserva turno', actual: 1480, anterior: 1250, cambioPct: 18.4 },
      { intencion: 'Cancelación', actual: 520, anterior: 480, cambioPct: 8.3 },
      { intencion: 'Receta', actual: 680, anterior: 590, cambioPct: 15.3 },
      { intencion: 'Urgencia', actual: 95, anterior: 110, cambioPct: -13.6 },
      { intencion: 'Otros', actual: 475, anterior: 420, cambioPct: 13.1 },
    ],
    whatsapp: [
      { titulo: 'Mensajes recibidos', actual: '12,450', anterior: '8,590', cambio: '+3,860', up: true },
      { titulo: 'Mensajes enviados', actual: '10,200', anterior: '7,390', cambio: '+2,810', up: true },
      { titulo: 'Tasa de respuesta', actual: '92%', anterior: '89%', cambio: '+3pp', up: true },
      { titulo: 'Opt-outs', actual: '85', anterior: '97', cambio: '-12', up: true },
    ],
    pacientesActual: 245,
    pacientesAnterior: 181,
  },
};

export const MaxObraSocial = Math.max(...pacientesPorObraSocial.map(t => t.cantidad));

export const datosPorPeriodo: Record<Periodo, ReportesData> = {
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
    turnosKpis: { total: 34, asistencia: '94.1%', duracion: '25 min', cambioTotal: '+5%' },
    distribucionEstados: [
      { estado: 'Completados', valor: 22, color: 'bg-emerald-500' },
      { estado: 'Pendientes', valor: 6, color: 'bg-amber-500' },
      { estado: 'Cancelados', valor: 3, color: 'bg-red-500' },
      { estado: 'Ausentes', valor: 2, color: 'bg-purple-500' },
      { estado: 'En consulta', valor: 1, color: 'bg-blue-500' },
    ],
    pacientesKpis: { total: 89, nuevos: 3, frecuentes: 42, edadPromedio: 42 },
    nuevosPacientesLabels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'],
    volumenWhatsApp: [
      { dia: 'Lun', recibidos: 58, enviados: 48 },
      { dia: 'Mar', recibidos: 62, enviados: 52 },
      { dia: 'Mié', recibidos: 45, enviados: 38 },
      { dia: 'Jue', recibidos: 68, enviados: 55 },
      { dia: 'Vie', recibidos: 42, enviados: 38 },
      { dia: 'Sáb', recibidos: 12, enviados: 14 },
    ],
    canalesContacto: [
      { canal: 'WhatsApp', porcentaje: 82 },
      { canal: 'Email', porcentaje: 11 },
      { canal: 'SMS', porcentaje: 5 },
      { canal: 'Web', porcentaje: 2 },
    ],
    calidadRespuesta: { tasa: '96%', tiempo: '<3 min', msgsPorConv: '2.1' },
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
    turnosKpis: { total: 158, asistencia: '93.7%', duracion: '28 min', cambioTotal: '+12%' },
    distribucionEstados: [
      { estado: 'Completados', valor: 115, color: 'bg-emerald-500' },
      { estado: 'Pendientes', valor: 18, color: 'bg-amber-500' },
      { estado: 'Cancelados', valor: 15, color: 'bg-red-500' },
      { estado: 'Ausentes', valor: 8, color: 'bg-purple-500' },
      { estado: 'En consulta', valor: 2, color: 'bg-blue-500' },
    ],
    pacientesKpis: { total: 89, nuevos: 8, frecuentes: 42, edadPromedio: 42 },
    nuevosPacientesLabels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5'],
    volumenWhatsApp: [
      { dia: 'Lun', recibidos: 245, enviados: 195 },
      { dia: 'Mar', recibidos: 268, enviados: 210 },
      { dia: 'Mié', recibidos: 195, enviados: 165 },
      { dia: 'Jue', recibidos: 285, enviados: 225 },
      { dia: 'Vie', recibidos: 198, enviados: 165 },
      { dia: 'Sáb', recibidos: 54, enviados: 30 },
    ],
    canalesContacto: [
      { canal: 'WhatsApp', porcentaje: 78 },
      { canal: 'Email', porcentaje: 15 },
      { canal: 'SMS', porcentaje: 5 },
      { canal: 'Web', porcentaje: 2 },
    ],
    calidadRespuesta: { tasa: '94%', tiempo: '<5 min', msgsPorConv: '2.3' },
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
    turnosKpis: { total: 1892, asistencia: '94.2%', duracion: '28 min', cambioTotal: '+22%' },
    distribucionEstados: [
      { estado: 'Completados', valor: 1430, color: 'bg-emerald-500' },
      { estado: 'Pendientes', valor: 210, color: 'bg-amber-500' },
      { estado: 'Cancelados', valor: 125, color: 'bg-red-500' },
      { estado: 'Ausentes', valor: 85, color: 'bg-purple-500' },
      { estado: 'En consulta', valor: 42, color: 'bg-blue-500' },
    ],
    pacientesKpis: { total: 245, nuevos: 22, frecuentes: 120, edadPromedio: 42 },
    nuevosPacientesLabels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
    volumenWhatsApp: [
      { dia: 'Ene', recibidos: 980, enviados: 820 },
      { dia: 'Feb', recibidos: 1050, enviados: 880 },
      { dia: 'Mar', recibidos: 1120, enviados: 920 },
      { dia: 'Abr', recibidos: 980, enviados: 810 },
      { dia: 'May', recibidos: 1040, enviados: 850 },
      { dia: 'Jun', recibidos: 1150, enviados: 950 },
    ],
    canalesContacto: [
      { canal: 'WhatsApp', porcentaje: 72 },
      { canal: 'Email', porcentaje: 18 },
      { canal: 'SMS', porcentaje: 7 },
      { canal: 'Web', porcentaje: 3 },
    ],
    calidadRespuesta: { tasa: '92%', tiempo: '<8 min', msgsPorConv: '2.5' },
  },
};
