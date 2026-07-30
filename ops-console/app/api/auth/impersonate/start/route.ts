import { NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth'

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
    const { tenantId } = body

    if (!tenantId) {
      return NextResponse.json({ error: 'Falta tenantId' }, { status: 400 })
    }

    // Verificar TOTP del operador si tiene 2FA habilitado
    const db = (await import('@/lib/db')).getDb()
    const { sql } = await import('drizzle-orm')

    const [operator] = await db.execute(sql`
      SELECT totp_verified FROM platform.platform_operators
      WHERE id = ${session.sub} AND totp_enabled = true
    `)

    const operatorRow = operator as Record<string, unknown> | undefined
    const requiresTotp = operatorRow?.totp_verified === false

    if (requiresTotp) {
      return NextResponse.json({
        error: 'TOTP_REQUIRED',
        message: 'Se requiere verificación TOTP para iniciar impersonación',
      }, { status: 403 })
    }

    // Llamar al dashboard para crear el token
    const response = await fetch(`${DASHBOARD_URL}/api/internal/impersonate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': INTERNAL_API_KEY,
      },
      body: JSON.stringify({
        tenantId,
        operatorId: session.sub,
        operatorEmail: session.email,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({ error: data.error || 'Error al crear token de impersonación' }, { status: response.status })
    }

    return NextResponse.json({
      ok: true,
      adminEmail: data.adminEmail,
      adminNombre: data.adminNombre,
      emailSent: data.emailSent,
      expiresAt: data.expiresAt,
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
