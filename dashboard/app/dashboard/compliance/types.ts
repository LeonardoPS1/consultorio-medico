export type Periodo = 'semana' | 'mes';

export interface ComplianceMetricas {
  tiempoEsperaPromedio: number;
  cumplimientoPlazos: number;
  noShowRate: number;
  cancelacionRate: number;
  tendenciaTiempo: number;
  tendenciaCumplimiento: number;
}

export interface TiempoEsperaMes {
  label: string;
  promedio: number;
  maximo: number;
  minimo: number;
  cumplimiento: number;
}

export interface CumplimientoMedico {
  medicoId: string;
  medicoNombre: string;
  turnosAtendidos: number;
  promedioEspera: number;
  cumplimiento: number;
}

export interface ComplianceData {
  metricas: ComplianceMetricas;
  tendencias: TiempoEsperaMes[];
  porMedico: CumplimientoMedico[];
  distribucionCancelacion: { motivo: string; cantidad: number }[];
  _demo?: boolean;
}

export interface AccesoAuditoria {
  id: string;
  accion: string;
  entidad: string;
  entidadId: string | null;
  detalle: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  usuarioNombre: string | null;
  usuarioEmail: string | null;
}

export interface SolicitudARCO {
  id: string;
  pacienteId: string;
  tipo: string;
  accion: string;
  aceptado: boolean;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  pacienteNombre: string | null;
  pacienteApellido: string | null;
}