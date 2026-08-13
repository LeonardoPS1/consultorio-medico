/**
 * Compartido (lógica pura, sin DB) entre el dashboard y el benchmark.
 * No depende de drizzle/ops ni de RLS: solo utilidad de bucketing.
 */

export interface BenchmarkBucket {
  bucketLabel: string;
  bucketRange: string;
  tenantCount: number;
  avgNoShow: number;
  avgOcupacion: number;
  avgNps: number | null;
}

export interface BenchmarkTenantMetric {
  tenantId: string;
  tenantNombre: string;
  pacientesActivos: number;
  totalTurnos: number;
  noShows: number;
  completados: number;
  cancelados: number;
  nps: number | null;
}

export const UMBRAL_TENANTS = 5;

export const BUCKETS: Array<{ min: number; max: number; label: string; range: string }> = [
  { min: 0, max: 99, label: 'pequeña', range: '0-99' },
  { min: 100, max: 499, label: 'mediana', range: '100-499' },
  { min: 500, max: 1499, label: 'grande', range: '500-1499' },
  { min: 1500, max: Infinity, label: 'muy grande', range: '1500+' },
];

/**
 * Determina el bucket de tamaño según la cantidad de pacientes activos.
 * @param {number} pacientes - Cantidad de pacientes activos del tenant.
 * @returns {{ label: string; range: string }} Bucket con label y rango.
 */
export function bucketForPacientes(pacientes: number): { label: string; range: string } {
  for (const b of BUCKETS) {
    if (pacientes >= b.min && pacientes <= b.max) return { label: b.label, range: b.range };
  }
  return { label: 'muy grande', range: '1500+' };
}
