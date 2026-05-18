/**
 * Hook y utilidad para obtener el nombre del tenant.
 * En Phase 1 usa env vars. En Phase 2+ usará el contexto de tenant.
 */

/**
 * Nombre por defecto del tenant desde variable de entorno.
 * Se usa como fallback mientras se resuelve el nombre real desde la API.
 */
export const DEFAULT_TENANT_NAME =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_TENANT_NAME) || 'Consultorio';

/**
 * Obtiene el nombre para mostrar del tenant.
 * Prioriza el argumento (desde API/DB), usa env var como fallback.
 */
export function resolveTenantName(apiName?: string | null): string {
  return apiName?.trim() || DEFAULT_TENANT_NAME;
}
