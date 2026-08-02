import { NextRequest } from 'next/server'
import { logAudit } from '@/lib/audit'
import { ok, error, serverError, unauthorized, notFound } from '@/lib/api-handler'
import {
  getOperatorFromHeaders,
  validateMotivo,
  getTenantById,
} from '@/lib/overrides'

export const dynamic = 'force-dynamic'

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://evolution:8080'
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY

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

    const instanceName = tenant.subdomain as string | null
    if (!instanceName) {
      return error('El tenant no tiene subdomain — no se puede determinar la instancia de Evolution', 400)
    }

    if (!EVOLUTION_API_KEY) {
      return error('EVOLUTION_API_KEY no configurada en ops-console', 503)
    }

    const response = await fetch(`${EVOLUTION_API_URL}/instance/restart`, {
      method: 'POST',
      headers: {
        apikey: EVOLUTION_API_KEY,
        instanceName,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    })

    let responseBody: Record<string, unknown> = {}
    try {
      responseBody = await response.json()
    } catch {
      responseBody = { raw: await response.text().catch(() => '') }
    }

    if (!response.ok) {
      logAudit({
        operatorId: operator.operatorId,
        operatorEmail: operator.operatorEmail,
        accion: 'override.evolution.reiniciar',
        tenantAfectado: tenant.nombre as string,
        recurso: `evolution:${instanceName}`,
        motivo: String(motivo).trim(),
        ipAddress: operator.ipAddress,
        detalles: { instancia: instanceName, ok: false, httpStatus: response.status, error: responseBody },
      })
      return error(
        `Evolution API respondió ${response.status}: ${JSON.stringify(responseBody).slice(0, 200)}`,
        response.status === 404 ? 404 : 502,
      )
    }

    logAudit({
      operatorId: operator.operatorId,
      operatorEmail: operator.operatorEmail,
      accion: 'override.evolution.reiniciar',
      tenantAfectado: tenant.nombre as string,
      recurso: `evolution:${instanceName}`,
      motivo: String(motivo).trim(),
      ipAddress: operator.ipAddress,
      detalles: { instancia: instanceName, ok: true, httpStatus: response.status, respuesta: responseBody },
    })

    return ok({ ok: true, instancia: instanceName, respuesta: responseBody })
  } catch (err) {
    try {
      await logAudit({
        operatorId: operator?.operatorId ?? 'desconocido',
        operatorEmail: operator?.operatorEmail ?? 'desconocido',
        accion: 'override.evolution.reiniciar.failed',
        tenantAfectado: tenantId ?? 'desconocido',
        motivo: null,
        detalles: { error: err instanceof Error ? err.message : String(err) },
      })
    } catch (logErr) {
      console.error('[ops-audit] No se pudo registrar el intento fallido de override.evolution.reiniciar', logErr)
    }
    return serverError(err)
  }
}
