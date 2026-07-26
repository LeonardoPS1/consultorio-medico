import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { platformOperators, platformSessions } from '@/drizzle/schema'
import { verifyTotpCode } from '@/lib/totp'
import { createSessionToken, setSessionCookie } from '@/lib/auth'
import { totpVerifySchema } from '@/lib/validation'
import { ok, error, serverError, unauthorized } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = totpVerifySchema.safeParse(body)
    if (!parsed.success) {
      return error(parsed.error.errors[0].message, 400)
    }
    const { email, token } = parsed.data

    const db = getDb()

    const operators = await db
      .select()
      .from(platformOperators)
      .where(eq(platformOperators.email, email))
      .limit(1)

    if (operators.length === 0) {
      return unauthorized()
    }

    const operator = operators[0]

    if (!operator.totpSecret) {
      return error('TOTP no configurado', 400)
    }

    if (!verifyTotpCode(token, operator.totpSecret)) {
      return error('Código TOTP inválido', 400)
    }

    if (!operator.totpVerified) {
      await db
        .update(platformOperators)
        .set({ totpVerified: true })
        .where(eq(platformOperators.id, operator.id))
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
