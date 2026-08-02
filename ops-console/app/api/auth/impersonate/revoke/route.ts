import { NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { validateMotivo } from '@/lib/validation'

const DASHBOARD_URL = process.env.DASHBOARD_URL || 'https://med.aicorebots.com'
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
        accion: 'impersonate.revoke.failed',
        tenantAfectado: tenantId,
        recurso: undefined,
        motivo: motivo.trim(),
        detalles: { error: 'TOTP_REQUIRED' },
      })
      return NextResponse.json({
        error: 'TOTP_REQUIRED',
        message: 'Se requiere verificación TOTP para revocar sesiones de impersonación',
      }, { status: 403 })
    }

    // Llamar al dashboard para revocar las sesiones activas del tenant
    const response = await fetch(`${DASHBOARD_URL}/api/internal/impersonate/revoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': INTERNAL_API_KEY,
      },
      body: JSON.stringify({ tenantId }),
    })

    const data = await response.json()

    if (!response.ok) {
      await logAudit({
        operatorId: session.sub,
        operatorEmail: session.email,
        accion: 'impersonate.revoke.failed',
        tenantAfectado: tenantId,
        recurso: undefined,
        motivo: motivo.trim(),
        detalles: { error: data.error || 'Error desconocido' },
      })
      return NextResponse.json({ error: data.error || 'Error al revocar sesiones' }, { status: response.status })
    }

    await logAudit({
      operatorId: session.sub,
      operatorEmail: session.email,
      accion: 'impersonate.revoke',
      tenantAfectado: tenantId,
      recurso: `sesiones:${data.revocadas ?? 0}`,
      motivo: motivo.trim(),
      detalles: { revocadas: data.revocadas ?? 0 },
    })

    return NextResponse.json({
      ok: true,
      revocadas: data.revocadas ?? 0,
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
