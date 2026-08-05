import { NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { validateMotivo } from '@/lib/validation'
import { dashboardFetch, getDashboardUrl } from '@/lib/dashboard-fetch'

const DASHBOARD_URL = getDashboardUrl()
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY

export async function POST(request: Request) {
  const session = await getSessionFromCookie()
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  if (!INTERNAL_API_KEY) {
    return NextResponse.json({ error: 'INTERNAL_API_KEY no configurada' }, { status: 500 })
  }

  try {
    const body = await request.json()
    const { tenantId, motivo } = body

    if (!tenantId) {
      return NextResponse.json({ error: 'Falta tenantId' }, { status: 400 })
    }

    const error = validateMotivo(motivo)
    if (error) {
      return NextResponse.json({ error }, { status: 400 })
    }

    // Verificar TOTP del operador si tiene 2FA habilitado
    const db = (await import('@/lib/db')).getDb()
    const { sql } = await import('drizzle-orm')

    const [operator] = await db.execute(sql`
      SELECT totp_verified FROM platform.platform_operators
      WHERE id = ${session.sub}
    `)

    const operatorRow = operator as Record<string, unknown> | undefined
    // Requiere TOTP si: no existe el operador, o totp_verified es false, o es null
    const requiresTotp = !operatorRow || operatorRow?.totp_verified === false || operatorRow?.totp_verified === null

    if (requiresTotp) {
      await logAudit({
        operatorId: session.sub,
        operatorEmail: session.email,
        accion: 'impersonate.failed',
        tenantAfectado: tenantId,
        recurso: undefined,
        motivo: motivo.trim(),
        detalles: { error: 'TOTP_REQUIRED', viaDirecta: false },
      })
      return NextResponse.json({
        error: 'TOTP_REQUIRED',
        message: 'Se requiere verificación TOTP para iniciar impersonación',
      }, { status: 403 })
    }

    // Llamar al dashboard para crear el token
    const res = await dashboardFetch<{
      error?: string
      adminEmail?: string
      adminNombre?: string
      emailSent?: boolean
      expiresAt?: string
      impersonateLink?: string
    }>(`${DASHBOARD_URL}/api/internal/impersonate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': INTERNAL_API_KEY,
      },
      body: JSON.stringify({
        tenantId,
        operatorId: session.sub,
        operatorEmail: session.email,
        motivo: motivo.trim(),
      }),
    })

    if (!res.ok || !res.data) {
      await logAudit({
        operatorId: session.sub,
        operatorEmail: session.email,
        accion: 'impersonate.failed',
        tenantAfectado: tenantId,
        recurso: undefined,
        motivo: motivo.trim(),
        detalles: { error: res.error || 'Error desconocido', viaDirecta: false },
      })
      return NextResponse.json(
        { error: res.error || 'Error al crear token de impersonación' },
        { status: res.status || 500 },
      )
    }

    const data = res.data

    await logAudit({
      operatorId: session.sub,
      operatorEmail: session.email,
      accion: 'impersonate.start',
      tenantAfectado: tenantId,
      recurso: data.adminEmail,
      motivo: motivo.trim(),
      detalles: { expiresAt: data.expiresAt, viaDirecta: false },
    })

    return NextResponse.json({
      ok: true,
      adminEmail: data.adminEmail,
      adminNombre: data.adminNombre,
      emailSent: data.emailSent,
      expiresAt: data.expiresAt,
      impersonateLink: data.impersonateLink,
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
