import { eq } from 'drizzle-orm'
import { getDb } from './db'
import { platformAuditLog } from '../drizzle/schema'

export interface AuditEntry {
  operatorId?: string
  operatorEmail: string
  accion: string
  tenantAfectado?: string
  recurso?: string
  motivo?: string
  ipAddress?: string
  detalles?: Record<string, unknown>
}

export async function logAudit(entry: AuditEntry) {
  try {
    const db = getDb()
    await db.insert(platformAuditLog).values({
      operatorId: entry.operatorId,
      operatorEmail: entry.operatorEmail,
      accion: entry.accion,
      tenantAfectado: entry.tenantAfectado || null,
      recurso: entry.recurso || null,
      motivo: entry.motivo || null,
      ipAddress: entry.ipAddress || null,
      detalles: entry.detalles || {},
    })
  } catch (error) {
    console.error('[ops-audit] Error al loggear auditoría:', error)
  }
}

export function getAuditAccion(pathname: string, method: string): string {
  if (pathname.startsWith('/api/tenants')) {
    if (method === 'GET') return 'tenant.list'
    if (method === 'POST') return 'tenant.update'
    return 'tenant.access'
  }
  if (pathname.startsWith('/api/audit')) return 'audit.query'
  if (pathname.startsWith('/api/health')) return 'health.check'
  return 'api.access'
}
