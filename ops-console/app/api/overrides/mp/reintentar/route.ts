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

const DASHBOARD_URL = process.env.DASHBOARD_URL || 'https://med.aicorebots.com'
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY

// Lista los pagos MercadoPago conocidos del tenant (para elegir cuál reprocesar)
export async function GET(request: NextRequest) {
  try {
    const operator = getOperatorFromHeaders(request)
    if (!operator) return unauthorized()

    const { searchParams } = request.nextUrl
    const tenantId = searchParams.get('tenantId')
    if (!tenantId) return error('tenantId es obligatorio', 400)

    const tenant = await getTenantById(tenantId)
    if (!tenant) return notFound('Tenant no encontrado')

    const db = getDb()
    const rows = await db.execute(sql`
      SELECT id, plan, estado, mercadopago_payment_id, mercadopago_preference_id,
             period_start, period_end, created_at
      FROM public.suscripciones
      WHERE organizacion_id = ${tenantId}
        AND (mercadopago_payment_id IS NOT NULL OR mercadopago_preference_id IS NOT NULL)
      ORDER BY created_at DESC
      LIMIT 20
    `)

    const pagos = (rows as unknown as Record<string, unknown>[]).map((r) => ({
      suscripcionId: r.id,
      plan: r.plan,
      estado: r.estado,
      mercadopagoPaymentId: r.mercadopago_payment_id,
      mercadopagoPreferenceId: r.mercadopago_preference_id,
      periodEnd: r.period_end,
      createdAt: r.created_at,
    }))

    return ok({ tenantId, pagos })
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

    const { tenantId, paymentId, motivo } = body as Record<string, unknown>
    if (!tenantId || typeof tenantId !== 'string') return error('tenantId es obligatorio', 400)
    if (typeof paymentId !== 'string' || !paymentId.trim()) {
      return error('paymentId es obligatorio', 400)
    }
    const motivoError = validateMotivo(motivo)
    if (motivoError) return error(motivoError, 400)

    const tenant = await getTenantById(tenantId)
    if (!tenant) return notFound('Tenant no encontrado')

    // Verificar que el pago pertenece al tenant antes de reprocesar
    const suscripcion = await getCurrentSuscripcion(tenantId)
    const pagoPertenece =
      suscripcion &&
      (suscripcion.mercadopago_payment_id === paymentId ||
        suscripcion.mercadopago_preference_id === paymentId)

    if (!pagoPertenece) {
      return error(
        'El paymentId no corresponde a la suscripción vigente del tenant. Verificá el valor con la lista de pagos.',
        400,
      )
    }

    if (!INTERNAL_API_KEY) {
      return error('INTERNAL_API_KEY no configurada en ops-console', 500)
    }

    const response = await fetch(`${DASHBOARD_URL}/api/internal/pagos/reprocesar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': INTERNAL_API_KEY,
      },
      body: JSON.stringify({ paymentId }),
    })

    let data: Record<string, unknown> = {}
    try {
      data = await response.json()
    } catch {
      data = {}
    }

    if (!response.ok) {
      return error((data.error as string) || 'Error al reprocesar el pago', response.status)
    }

    logAudit({
      operatorId: operator.operatorId,
      operatorEmail: operator.operatorEmail,
      accion: 'override.mp.reintentar',
      tenantAfectado: tenant.nombre as string,
      recurso: `suscripcion:${suscripcion?.id}`,
      motivo: String(motivo).trim(),
      ipAddress: operator.ipAddress,
      detalles: {
        paymentId,
        resultadoDashboard: data,
      },
    })

    return ok({ ok: true, paymentId, resultadoDashboard: data })
  } catch (err) {
    return serverError(err)
  }
}
