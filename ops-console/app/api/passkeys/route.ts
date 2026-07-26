import { NextRequest } from 'next/server'
import { getDb } from '@/lib/db'
import { platformPasskeys } from '@/drizzle/schema'
import { eq, desc } from 'drizzle-orm'
import { logAudit } from '@/lib/audit'
import { ok, serverError, unauthorized, notFound } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const operatorId = request.headers.get('x-operator-id')
    const operatorEmail = request.headers.get('x-operator-email')
    if (!operatorId || !operatorEmail) return unauthorized()

    const db = getDb()
    const passkeys = await db
      .select({
        id: platformPasskeys.id,
        credentialId: platformPasskeys.credentialId,
        deviceName: platformPasskeys.deviceName,
        createdAt: platformPasskeys.createdAt,
        lastUsedAt: platformPasskeys.lastUsedAt,
      })
      .from(platformPasskeys)
      .where(eq(platformPasskeys.operatorId, operatorId))
      .orderBy(desc(platformPasskeys.createdAt))

    return ok(passkeys)
  } catch (err) {
    return serverError(err)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const operatorId = request.headers.get('x-operator-id')
    const operatorEmail = request.headers.get('x-operator-email')
    if (!operatorId || !operatorEmail) return unauthorized()

    const body = await request.json()
    const passkeyId = body.passkeyId
    if (!passkeyId) return unauthorized()

    const db = getDb()
    const passkey = await db
      .select({ id: platformPasskeys.id, operatorId: platformPasskeys.operatorId })
      .from(platformPasskeys)
      .where(eq(platformPasskeys.id, passkeyId))
      .limit(1)

    if (passkey.length === 0) return notFound('Passkey no encontrada')
    if (passkey[0].operatorId !== operatorId) return unauthorized()

    await db
      .delete(platformPasskeys)
      .where(eq(platformPasskeys.id, passkeyId))

    logAudit({
      operatorId,
      operatorEmail,
      accion: 'passkey.delete',
      recurso: `passkey:${passkeyId}`,
      motivo: 'Eliminación de passkey',
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    })

    return ok({ message: 'Passkey eliminada' })
  } catch (err) {
    return serverError(err)
  }
}
