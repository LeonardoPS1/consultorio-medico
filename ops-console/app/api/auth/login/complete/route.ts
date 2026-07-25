import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { platformOperators, platformPasskeys, platformSessions } from '@/drizzle/schema'
import { verifyLogin } from '@/lib/webauthn'
import { createSessionToken, setSessionCookie } from '@/lib/auth'

type AuthenticatorTransport = 'ble' | 'internal' | 'nfc' | 'usb' | 'hybrid'
import { ok, error, serverError, unauthorized } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, credential, challenge, operatorId } = body

    if (!email || !credential || !challenge) {
      return error('Email, credential y challenge requeridos')
    }

    const db = getDb()

    let operator
    if (operatorId) {
      const operators = await db
        .select()
        .from(platformOperators)
        .where(eq(platformOperators.id, operatorId))
        .limit(1)
      operator = operators[0]
    } else {
      const operators = await db
        .select()
        .from(platformOperators)
        .where(eq(platformOperators.email, email))
        .limit(1)
      operator = operators[0]
    }

    if (!operator || !operator.activo) {
      return unauthorized()
    }

    const passkeysRaw = await db
      .select()
      .from(platformPasskeys)
      .where(eq(platformPasskeys.operatorId, operator.id))

    const passkey = passkeysRaw.find(pk => pk.credentialId === credential.id)
    if (!passkey) {
      return error('Passkey no encontrado', 404)
    }

    const credentialData = {
      credentialId: passkey.credentialId,
      publicKey: passkey.publicKey,
      counter: Number(passkey.counter),
      transports: (passkey.transports || []) as AuthenticatorTransport[],
    }

    const verification = await verifyLogin(credential, challenge, credentialData)

    if (!verification.verified) {
      return error('Verificación del passkey falló', 400)
    }

    if (verification.authenticationInfo) {
      await db
        .update(platformPasskeys)
        .set({
          counter: BigInt(verification.authenticationInfo.newCounter),
          lastUsedAt: new Date(),
        })
        .where(eq(platformPasskeys.id, passkey.id))
    }

    if (operator.totpVerified) {
      return ok({
        passkeyVerified: true,
        requiresTotp: true,
        partialToken: credential.id,
      })
    }

    const session = await createSessionToken({
      id: operator.id,
      email: operator.email,
      nombre: operator.nombre,
    })

    await db.insert(platformSessions).values({
      operatorId: operator.id,
      jti: session.jti,
      expiresAt: session.expiresAt,
      ipAddress: request.headers.get('x-forwarded-for') || null,
      userAgent: request.headers.get('user-agent') || null,
    })

    await db
      .update(platformOperators)
      .set({ ultimoAcceso: new Date() })
      .where(eq(platformOperators.id, operator.id))

    await setSessionCookie(session.token)

    return ok({
      authenticated: true,
      operator: {
        id: operator.id,
        email: operator.email,
        nombre: operator.nombre,
      },
    })
  } catch (err) {
    return serverError(err)
  }
}
