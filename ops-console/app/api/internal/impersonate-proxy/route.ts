import { NextRequest } from 'next/server'
import { ok, error, serverError, unauthorized } from '@/lib/api-handler'
import { logAudit } from '@/lib/audit'

const DASHBOARD_URL = process.env.DASHBOARD_URL || 'https://med.aicorebots.com'
const INTERNAL_KEY = process.env.INTERNAL_API_KEY || ''

export async function POST(request: NextRequest) {
  try {
    const operatorId = request.headers.get('x-operator-id')
    const operatorEmail = request.headers.get('x-operator-email')
    const operatorNombre = request.headers.get('x-operator-nombre')
    if (!operatorId || !operatorEmail) return unauthorized()

    const { tenantId, tenantName, motivo, creadoPor, creadoPorNombre } = await request.json()

    if (!tenantId || !motivo || !creadoPor) {
      return error('Faltan campos requeridos', 400)
    }

    const res = await fetch(`${DASHBOARD_URL}/api/internal/impersonate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': INTERNAL_KEY,
      },
      body: JSON.stringify({ tenantId, tenantName, motivo, creadoPor, creadoPorNombre }),
    })

    const data = await res.json()

    if (!res.ok) {
      return error(data.error || 'Error en dashboard', res.status)
    }

    // Audit log en ops-console
    logAudit({
      operatorId,
      operatorEmail,
      accion: 'impersonate.start',
      tenantAfectado: tenantName || tenantId,
      recurso: `tenant:${tenantId}`,
      motivo: motivo,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      detalles: { dashboardTokenCreated: true },
    })

    return ok(data)
  } catch (err) {
    return serverError(err)
  }
}
