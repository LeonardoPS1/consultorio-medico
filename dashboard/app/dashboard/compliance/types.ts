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
