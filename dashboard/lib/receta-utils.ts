/**
 * Utilidades puras para recetas (estados de visualización).
 * Seguro de importar desde server components y client components:
 * no dependen de la base de datos ni del bundle del servidor.
 */

export type EstadoReceta = 'activa' | 'vencida' | 'historial';

/**
 * Estados de la BD considerados "activos" (vigentes).
 * Incluye el valor legacy `'activa'` que aún persiste en filas históricas
 * (la columna `estado` en producción era `varchar`, no pgInt) para que el
 * filtrado funcione con datos reales y con el vocabulario nuevo del enum.
 */
export const ESTADOS_ACTIVOS = ['borrador', 'emitida', 'entregada', 'activa'] as const;

/** Estados de la BD considerados "historial" (terminales). */
export const ESTADOS_HISTORIAL = ['anulada', 'renovada', 'historial'] as const;

/** Fecha actual en formato ISO (YYYY-MM-DD). */
export function getHoyISO(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Mapea el estado de BD (enum receta_estado) + fecha de vencimiento
 * a un estado de visualización: 'activa' | 'vencida' | 'historial'.
 * @param estado
 * @param fechaFin
 */
export function mapEstadoDisplay(estado: string, fechaFin: string | null): EstadoReceta {
  if (estado === 'expirada' || estado === 'vencida') return 'vencida';
  if ((ESTADOS_HISTORIAL as readonly string[]).includes(estado)) return 'historial';
  if (fechaFin && fechaFin < getHoyISO()) return 'vencida';
  return 'activa';
}

/** Etiquetas en español para los estados de visualización. */
export const ESTADO_DISPLAY_LABELS: Record<EstadoReceta, string> = {
  activa: 'Activa',
  vencida: 'Vencida',
  historial: 'Historial',
};
