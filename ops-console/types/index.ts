import type { JWTPayload } from 'jose'

export interface OpsSessionPayload extends JWTPayload {
  sub: string
  email: string
  nombre: string
  jti: string
}

export interface AuditEntry {
  operatorId?: string
  operatorEmail: string
  accion: string
  tenantAfectado?: string
  recurso?: string
  motivo?: string | null
  ipAddress?: string
  detalles?: Record<string, unknown>
}

export interface TenantBasic {
  id: string
  nombre: string
  subdomain: string | null
  activo: boolean
  created_at: Date
  usuario_count: number
  paciente_count: number
  turno_count: number
  ultimo_turno: Date | null
}

export interface AuditLogEntry {
  id: string
  operator_email: string
  accion: string
  tenant_afectado: string | null
  recurso: string | null
  motivo: string | null
  ip_address: string | null
  created_at: Date
  operator_nombre?: string
}

export interface OperatorBasic {
  id: string
  email: string
  nombre: string
  activo: boolean
  ultimo_acceso: Date | null
  passkey_count?: number
  created_at: Date
}

export interface SessionInfo {
  id: string
  jti: string
  expires_at: Date
  revoked: boolean
  ip_address: string | null
  user_agent: string | null
  created_at: Date
  is_current: boolean
}

export interface PasskeyInfo {
  id: string
  credential_id: string
  device_name: string | null
  created_at: Date
  last_used_at: Date | null
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
