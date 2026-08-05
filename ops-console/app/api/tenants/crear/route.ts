import { NextRequest } from 'next/server'
import { logAudit } from '@/lib/audit'
import { ok, error, serverError, unauthorized } from '@/lib/api-handler'
import { crearTenantSchema } from '@/lib/validation'
import { getDashboardUrl } from '@/lib/dashboard-fetch'

const DASHBOARD_URL = getDashboardUrl()
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY

const PLANES = ['free', 'starter', 'professional', 'premium', 'enterprise'] as const
type Plan = (typeof PLANES)[number]

function isPlan(value: unknown): value is Plan {
  return typeof value === 'string' && (PLANES as readonly string[]).includes(value)
}

export const dynamic = 'force-dynamic'

// POST /api/tenants/crear - Crear nueva clínica
export async function POST(request: NextRequest) {
  try {
    const operatorId = request.headers.get('x-operator-id')
    const operatorEmail = request.headers.get('x-operator-email')
    const operatorNombre = request.headers.get('x-operator-nombre')
    if (!operatorId || !operatorEmail) return unauthorized()

    if (!INTERNAL_API_KEY) {
      return error('Configuración interna incompleta (INTERNAL_API_KEY)', 500)
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') return error('Body inválido', 400)

    const { nombre, subdomain, plan, adminEmail, adminNombre } = body as Record<string, unknown>

    const parsed = crearTenantSchema.safeParse(body)
    if (!parsed.success) {
      return error(parsed.error.errors[0]?.message || 'Campos inválidos', 400)
    }

    if (!/^[a-z0-9-]+$/.test(parsed.data.subdomain)) {
      return error('Solo letras, números y guiones', 400)
    }

    if (plan !== undefined && plan !== null && plan !== '' && !isPlan(plan)) {
      return error(`plan inválido. Permitidos: ${PLANES.join(', ')}`, 400)
    }

    const fetchResult = await fetch(`${DASHBOARD_URL}/api/internal/tenants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': INTERNAL_API_KEY,
      },
      body: JSON.stringify({
        nombre,
        subdomain,
        plan: (plan as string) || 'free',
        adminEmail,
        adminNombre,
      }),
    })

    const data = await fetchResult.json().catch(() => null)

    if (!fetchResult.ok) {
      const mensaje =
        (data && typeof data === 'object' && 'error' in data
          ? (data as { error?: string }).error
          : undefined) || 'Error al crear la clínica'
      return error(mensaje, fetchResult.status === 401 || fetchResult.status === 403 ? fetchResult.status : 502)
    }

    const result = data as { tenantId?: string; subdomain?: string; adminEmail?: string }

    logAudit({
      operatorId,
      operatorEmail,
      accion: 'tenant.create',
      tenantAfectado: result.tenantId || 'desconocido',
      recurso: `tenant:${result.tenantId || 'desconocido'}`,
      motivo: `Creación de clínica ${nombre} por ${operatorNombre || operatorEmail}`,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      detalles: { nombre, subdomain, plan: (plan as string) || 'free', adminEmail },
    })

    return ok(
      { ok: true, tenantId: result.tenantId, subdomain: result.subdomain, adminEmail: result.adminEmail },
      201,
    )
  } catch (err) {
    return serverError(err)
  }
}
