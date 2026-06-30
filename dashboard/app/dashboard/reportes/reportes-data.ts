// ============================================================
// Tipos compartidos para Reportes
// ============================================================

import { Calendar, Users, TrendingDown, DollarSign } from 'lucide-react';
import type { ComponentType, SVGProps } from 'react';

export type Periodo = 'semana' | 'mes' | 'año';

export interface Metricas {
  titulo: string;
  valor: string;
  cambio: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  up: boolean;
}

export interface TurnoDia {
  dia: string;
  cantidad: number;
  completados: number;
  cancelados: number;
  ausentes: number;
}

export interface WhatsAppM {
  titulo: string;
  valor: string;
  cambio: string;
  up: boolean;
}

export interface DistribucionEstado {
  estado: string;
  valor: number;
  color: string;
}

export interface WhatsAppVolumen {
  dia: string;
  recibidos: number;
  enviados: number;
}

export interface IntencionMensaje {
  intencion: string;
  cantidad: number;
  porcentaje: number;
}

export interface PrediccionDia {
  dia: string;
  real: number | null;
  estimado: number | null;
  min: number | null;
  max: number | null;
}

export interface ConversionLead {
  etapa: string;
  cantidad: number;
  porcentaje: number;
}

export interface ComparativaAnual {
  mes: string;
  actual: number;
  anterior: number;
}

export interface EjecutivoTrend {
  label: string;
  ingresos: number;
  ocupacion: number;
}

export interface EjecutivoResumen {
  totalIngresos: string;
  ingresosCambio: string;
  tasaOcupacion: string;
  ocupacionCambio: string;
  satisfaccion: string;
  nps: number;
  leadsConvertidos: number;
  leadsTotales: number;
  ingresosTrend: EjecutivoTrend[];
  ocupacionTrend: EjecutivoTrend[];
}

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
  canalesContacto: { canal: string; porcentaje: number }[];
  calidadRespuesta: { tasa: string; tiempo: string; msgsPorConv: string };
  prediccion?: PrediccionDia[];
  conversionLeads?: ConversionLead[];
  comparativaAnual?: ComparativaAnual[];
  ejecutivo?: EjecutivoResumen;
}