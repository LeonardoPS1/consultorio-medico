/**
 * Public API — Tipos y constantes compartidas.
 *
 * Este archivo NO importa db ni módulos de servidor,
 * puede ser importado desde componentes client-side.
 */

// ─── Scopes ──────────────────────────────────────────────────

export const API_SCOPES = {
  MEDICOS_READ: 'medicos:read',
  HORARIOS_READ: 'horarios:read',
  SERVICIOS_READ: 'servicios:read',
  TURNOS_READ: 'turnos:read',
  TURNOS_WRITE: 'turnos:write',
  PACIENTES_READ: 'pacientes:read',
  WEBHOOKS_WRITE: 'webhooks:write',
} as const;

export type ApiScope = (typeof API_SCOPES)[keyof typeof API_SCOPES];

// ─── Tipos ───────────────────────────────────────────────────

export interface ApiKeyData {
  id: string;
  tenantId: string;
  nombre: string;
  scopes: string[];
  activa: boolean;
  expiresAt: Date | null;
}

export interface ApiKeyValidation {
  valid: boolean;
  data?: ApiKeyData;
  error?: string;
}
