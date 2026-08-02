import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { platformOperators, platformPasskeys, platformSessions, loginAttempts } from '@/drizzle/schema'
import { verifyLogin } from '@/lib/webauthn'
import { createSessionToken, setSessionCookie } from '@/lib/auth'
import { loginCompleteSchema } from '@/lib/validation'
import { ok, error, serverError, unauthorized } from '@/lib/api-handler'
import { recordLoginAttempt, checkLoginRateLimit } from '@/lib/rate-limit'
import { logAudit } from '@/lib/audit'
import { NextResponse } from 'next/server'

type AuthenticatorTransport = 'ble' | 'internal' | 'nfc' | 'usb' | 'hybrid'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = loginCompleteSchema.safeParse(body)
    if (!parsed.success) {
      return error(parsed.error.errors[0].message, 400)
    }
    const { email, credential, challenge } = parsed.data
    const operatorId = parsed.data.operatorId

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
      // Registrar intento fallido
      await recordLoginAttempt(email, false)
      return unauthorized()
    }

    const passkeysRaw = await db
      .select()
      .from(platformPasskeys)
      .where(eq(platformPasskeys.operatorId, operator.id))

    const passkey = passkeysRaw.find(pk => pk.credentialId === (credential as { id: string }).id)
    if (!passkey) {
      // Registrar intento fallido
      await recordLoginAttempt(email, false)
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
      // Registrar intento fallido
      await recordLoginAttempt(email, false)
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
      // Registrar intento exitoso (passkey verificado, pero TOTP pendiente)
      await recordLoginAttempt(email, true)
      return ok({
        passkeyVerified: true,
        requiresTotp: true,
        partialToken: credential.id,
      })
    }

    // Login completo exitoso
    await recordLoginAttempt(email, true)

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
    // En caso de error interno, registrar intento fallido si tenemos email
    try {
      const body = await request.json()
      if (body?.email) {
        await recordLoginAttempt(body.email, false)
      }
    } catch {
      // Ignorar errores de parsing
    }
    return serverError(err)
  }
}
