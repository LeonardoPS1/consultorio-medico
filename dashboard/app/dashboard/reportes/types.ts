// ============================================================
// Tipos compartidos para Reportes
// Re-exporta desde reportes-data.ts para compatibilidad
// ============================================================

import type { ComponentType, SVGProps } from 'react';

// Re-export everything from reportes-data.ts for backward compat
export type {
  Periodo,
  Metricas,
  TurnoDia,
  WhatsAppM,
  DistribucionEstado,
  WhatsAppVolumen,
  IntencionMensaje,
  PrediccionDia,
  ConversionLead,
  ComparativaAnual,
  EjecutivoResumen,
  ReportesData,
} from './reportes-data';

// Import the types we need locally
import type {
  TurnoDia,
  DistribucionEstado,
  WhatsAppVolumen,
  PrediccionDia,
  ConversionLead,
  EjecutivoResumen,
} from './reportes-data';

export interface ReporteApiResponse {
  metricas: { titulo: string; valor: string; cambio: string; icon: string; up: boolean }[];
  turnos: TurnoDia[];
  nuevosPacientes: number[];
  turnosKpis: { total: number; asistencia: string; duracion: string; cambioTotal: string };
  distribucionEstados: DistribucionEstado[];
  pacientesKpis: { total: number; nuevos: number; frecuentes: number; edadPromedio: number };
  nuevosPacientesLabels: string[];
  volumenWhatsApp: WhatsAppVolumen[];
  canalesContacto: { canal: string; porcentaje: number }[];
  calidadRespuesta: { tasa: string; tiempo: string; msgsPorConv: string };
  intenciones: { intencion: string; cantidad: number; porcentaje: number }[];
  whatsapp: { titulo: string; valor: string; cambio: string; up: boolean }[];
  prediccion?: PrediccionDia[];
  conversionLeads?: ConversionLead[];
  ejecutivo?: EjecutivoResumen;
  _demo?: boolean;
  _comparativa?: Record<string, unknown>;
}

export type IconMap = Record<string, ComponentType<SVGProps<SVGSVGElement>>>;
