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

export async function POST(request: NextRequest) {
  let operator: ReturnType<typeof getOperatorFromHeaders> | null = null
  let tenantId: string | null = null
  try {
    operator = getOperatorFromHeaders(request)
    if (!operator) return unauthorized()

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') return error('Body inválido', 400)

    const { tenantId: tid, motivo } = body as Record<string, unknown>
    tenantId = typeof tid === 'string' ? tid : null
    if (!tenantId) return error('tenantId es obligatorio', 400)
    const motivoError = validateMotivo(motivo)
    if (motivoError) return error(motivoError, 400)

    const tenant = await getTenantById(tenantId)
    if (!tenant) return notFound('Tenant no encontrado')

    const db = getDb()
    const suscripcion = await getCurrentSuscripcion(tenantId)
    if (!suscripcion) return notFound('El tenant no tiene suscripción')

    const plan = suscripcion.plan as string

    const [usuariosResult] = await db.execute(sql`
      SELECT COUNT(*)::int AS count,
             ARRAY_AGG(email ORDER BY email) AS emails
      FROM public.usuarios
      WHERE tenant_id = ${tenantId}
    `)
    const usuarios = usuariosResult as Record<string, unknown>

    const antes = {
      estado: suscripcion.estado,
      plan: suscripcion.plan,
      periodEnd: suscripcion.period_end,
      usuariosConPlan: (usuarios.emails as string[]) || [],
    }

    const [updated] = await db.execute(sql`
      UPDATE public.suscripciones
      SET estado = 'active',
          period_start = now(),
          period_end = now() + interval '1 month',
          updated_at = now()
      WHERE id = ${suscripcion.id as string}
      RETURNING estado, plan, period_start, period_end
    `)
    const despues = updated as Record<string, unknown>

    const [usersUpdated] = await db.execute(sql`
      UPDATE public.usuarios
      SET plan = ${plan}
      WHERE tenant_id = ${tenantId} AND deleted_at IS NULL
      RETURNING id
    `)
    const usuariosActualizados = (usersUpdated as unknown as unknown[]).length

    logAudit({
      operatorId: operator.operatorId,
      operatorEmail: operator.operatorEmail,
      accion: 'override.suscripcion.activar',
      tenantAfectado: tenant.nombre as string,
      recurso: `suscripcion:${suscripcion.id}`,
      motivo: String(motivo).trim(),
      ipAddress: operator.ipAddress,
      detalles: {
        antes,
        despues: {
          estado: despues.estado,
          plan: despues.plan,
          periodStart: despues.period_start,
          periodEnd: despues.period_end,
        },
        usuariosActualizados,
      },
    })

    return ok({
      ok: true,
      antes,
      despues: {
        estado: despues.estado,
        plan: despues.plan,
        periodStart: despues.period_start,
        periodEnd: despues.period_end,
      },
      usuariosActualizados,
    })
  } catch (err) {
    try {
      await logAudit({
        operatorId: operator?.operatorId ?? 'desconocido',
        operatorEmail: operator?.operatorEmail ?? 'desconocido',
        accion: 'override.suscripcion.activar.failed',
        tenantAfectado: tenantId ?? 'desconocido',
        motivo: null,
        detalles: { error: err instanceof Error ? err.message : String(err) },
      })
    } catch (logErr) {
      console.error('[ops-audit] No se pudo registrar el intento fallido de override.suscripcion.activar', logErr)
    }
    return serverError(err)
  }
}
