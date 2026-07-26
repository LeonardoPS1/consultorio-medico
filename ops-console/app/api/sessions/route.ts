import { NextRequest } from 'next/server'
import { getDb } from '@/lib/db'
import { platformSessions } from '@/drizzle/schema'
import { eq, desc } from 'drizzle-orm'
import { logAudit } from '@/lib/audit'
import { ok, serverError, unauthorized, notFound, error } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const operatorId = request.headers.get('x-operator-id')
    const operatorEmail = request.headers.get('x-operator-email')
    const sessionJti = request.headers.get('x-session-jti')
    if (!operatorId || !operatorEmail) return unauthorized()

    const db = getDb()
    const sessions = await db
      .select({
        id: platformSessions.id,
        jti: platformSessions.jti,
        operatorId: platformSessions.operatorId,
        expiresAt: platformSessions.expiresAt,
        revoked: platformSessions.revoked,
        ipAddress: platformSessions.ipAddress,
        userAgent: platformSessions.userAgent,
        createdAt: platformSessions.createdAt,
      })
      .from(platformSessions)
      .where(eq(platformSessions.operatorId, operatorId))
      .orderBy(desc(platformSessions.createdAt))
      .limit(50)

    const sessionsWithCurrent = sessions.map(s => ({
      ...s,
      isCurrent: s.jti === sessionJti,
    }))

    return ok(sessionsWithCurrent)
  } catch (err) {
    return serverError(err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const operatorId = request.headers.get('x-operator-id')
    const operatorEmail = request.headers.get('x-operator-email')
    if (!operatorId || !operatorEmail) return unauthorized()

    const body = await request.json()
    const sessionId = body.sessionId
    if (!sessionId) return error('sessionId requerido', 400)

    const db = getDb()
    const session = await db
      .select({ id: platformSessions.id, operatorId: platformSessions.operatorId, jti: platformSessions.jti })
      .from(platformSessions)
      .where(eq(platformSessions.id, sessionId))
      .limit(1)

    if (session.length === 0) return notFound('Sesión no encontrada')
    if (session[0].operatorId !== operatorId) return error('No autorizado para revocar esta sesión', 403)

    await db
      .update(platformSessions)
      .set({ revoked: true })
      .where(eq(platformSessions.id, sessionId))

    logAudit({
      operatorId,
      operatorEmail,
      accion: 'session.revoke',
      recurso: `session:${sessionId}`,
      motivo: `Revocación manual de sesión`,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    })

    return ok({ message: 'Sesión revocada' })
  } catch (err) {
    return serverError(err)
  }
}
