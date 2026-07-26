import { NextRequest } from 'next/server'
import { getSessionFromCookie, clearSessionCookie } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { platformSessions } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import { logAudit } from '@/lib/audit'
import { ok, serverError } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookie()
    if (!session) {
      await clearSessionCookie()
      return ok({ message: 'Sesión cerrada' })
    }

    const db = getDb()
    await db.update(platformSessions)
      .set({ revoked: true })
      .where(eq(platformSessions.jti, session.jti))

    logAudit({
      operatorId: session.sub,
      operatorEmail: session.email,
      accion: 'auth.logout',
      motivo: 'Cierre de sesión manual',
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    })

    await clearSessionCookie()

    return ok({ message: 'Sesión cerrada exitosamente' })
  } catch (err) {
    return serverError(err)
  }
}
