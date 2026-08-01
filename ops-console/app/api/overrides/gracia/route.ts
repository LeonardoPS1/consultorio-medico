import { NextRequest } from 'next/server'
import { getDb } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { logAudit } from '@/lib/audit'
import { ok, error, serverError, unauthorized, notFound } from '@/lib/api-handler'
import {
  getOperatorFromHeaders,
  validateMotivo,
  getTenantById,
  getCurrentSuscripcion,
} from '@/lib/overrides'

export const dynamic = 'force-dynamic'

// Estado actual de la suscripción del tenant (para los modales de confirmación)
export async function GET(request: NextRequest) {
  try {
    const operator = getOperatorFromHeaders(request)
    if (!operator) return unauthorized()

    const { searchParams } = request.nextUrl
    const tenantId = searchParams.get('tenantId')
    if (!tenantId) return error('tenantId es obligatorio', 400)

    const tenant = await getTenantById(tenantId)
    if (!tenant) return notFound('Tenant no encontrado')

    const suscripcion = await getCurrentSuscripcion(tenantId)

    return ok({
      tenantId,
      tenantNombre: tenant.nombre,
      subdomain: tenant.subdomain,
      suscripcion: suscripcion
        ? {
            id: suscripcion.id,
            plan: suscripcion.plan,
            estado: suscripcion.estado,
            periodStart: suscripcion.period_start,
            periodEnd: suscripcion.period_end,
            mercadopagoPaymentId: suscripcion.mercadopago_payment_id,
          }
        : null,
    })
  } catch (err) {
    return serverError(err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const operator = getOperatorFromHeaders(request)
    if (!operator) return unauthorized()

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') return error('Body inválido', 400)

    const { tenantId, dias, motivo } = body as Record<string, unknown>
    if (!tenantId || typeof tenantId !== 'string') return error('tenantId es obligatorio', 400)
    if (typeof dias !== 'number' || !Number.isInteger(dias) || dias < 1 || dias > 30) {
      return error('dias debe ser un entero entre 1 y 30', 400)
    }
    const motivoError = validateMotivo(motivo)
    if (motivoError) return error(motivoError, 400)

    const tenant = await getTenantById(tenantId)
    if (!tenant) return notFound('Tenant no encontrado')

    const db = getDb()
    const suscripcion = await getCurrentSuscripcion(tenantId)
    if (!suscripcion) return notFound('El tenant no tiene suscripción')

    const antes = {
      estado: suscripcion.estado,
      plan: suscripcion.plan,
      periodEnd: suscripcion.period_end,
    }

    const [updated] = await db.execute(sql`
      UPDATE public.suscripciones
      SET estado = 'past_due',
          period_end = now() + (${dias} || ' days')::interval,
          updated_at = now()
      WHERE id = ${suscripcion.id as string}
      RETURNING estado, plan, period_start, period_end
    `)
    const despues = updated as Record<string, unknown>

    logAudit({
      operatorId: operator.operatorId,
      operatorEmail: operator.operatorEmail,
      accion: 'override.gracia',
      tenantAfectado: tenant.nombre as string,
      recurso: `suscripcion:${suscripcion.id}`,
      motivo: String(motivo).trim(),
      ipAddress: operator.ipAddress,
      detalles: {
        dias,
        antes,
        despues: {
          estado: despues.estado,
          plan: despues.plan,
          periodEnd: despues.period_end,
        },
      },
    })

    return ok({ ok: true, antes, despues })
  } catch (err) {
    return serverError(err)
  }
}
