import { getDb } from '@/lib/db'
import { sql } from 'drizzle-orm'

export const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000'

export interface OverrideOperator {
  operatorId: string
  operatorEmail: string
  operatorNombre?: string
  ipAddress?: string
}

export function getOperatorFromHeaders(request: Request): OverrideOperator | null {
  const operatorId = request.headers.get('x-operator-id')
  const operatorEmail = request.headers.get('x-operator-email')
  if (!operatorId || !operatorEmail) return null
  return {
    operatorId,
    operatorEmail,
    operatorNombre: request.headers.get('x-operator-nombre') || undefined,
    ipAddress: request.headers.get('x-forwarded-for') || undefined,
  }
}

export function validateMotivo(motivo: unknown): string | null {
  if (typeof motivo !== 'string') return 'El campo motivo es obligatorio'
  const trimmed = motivo.trim()
  if (trimmed.length < 5) return 'El motivo debe tener al menos 5 caracteres'
  return null
}

export async function getTenantById(tenantId: string) {
  const db = getDb()
  const [tenantResult] = await db.execute(sql`
    SELECT id, nombre, subdomain, activo
    FROM public.tenants
    WHERE id = ${tenantId}
  `)
  return tenantResult ? (tenantResult as Record<string, unknown>) : null
}

export async function getCurrentSuscripcion(tenantId: string) {
  const db = getDb()
  const [row] = await db.execute(sql`
    SELECT id, plan, estado, period_start, period_end, mercadopago_preference_id,
           mercadopago_payment_id, mercadopago_merchant_order_id, created_at
    FROM public.suscripciones
    WHERE organizacion_id = ${tenantId}
    ORDER BY created_at DESC
    LIMIT 1
  `)
  return row ? (row as Record<string, unknown>) : null
}
