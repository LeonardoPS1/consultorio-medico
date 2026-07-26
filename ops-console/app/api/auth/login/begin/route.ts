import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { platformOperators, platformPasskeys } from '@/drizzle/schema'
import { generateLogin, type PasskeyCredential } from '@/lib/webauthn'
import { loginBeginSchema } from '@/lib/validation'
import { ok, error, serverError, unauthorized } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = loginBeginSchema.safeParse(body)
    if (!parsed.success) {
      return error(parsed.error.errors[0].message, 400)
    }
    const { email } = parsed.data

    const db = getDb()

    const operators = await db
      .select()
      .from(platformOperators)
      .where(eq(platformOperators.email, email))
      .limit(1)

    if (operators.length === 0) {
      return unauthorized('Credenciales inválidas')
    }

    const operator = operators[0]

    if (!operator.activo) {
      return unauthorized('Cuenta desactivada')
    }

    const passkeysRaw = await db
      .select()
      .from(platformPasskeys)
      .where(eq(platformPasskeys.operatorId, operator.id))

    const hasPasskeys = passkeysRaw.length > 0
    const hasTotp = !!operator.totpSecret

    if (!hasPasskeys && !hasTotp) {
      return error('No hay métodos de autenticación configurados. Contacta al administrador.', 400)
    }

    if (hasPasskeys) {
      const credentials: PasskeyCredential[] = passkeysRaw.map(pk => ({
        id: pk.credentialId,
        publicKey: pk.publicKey,
        counter: Number(pk.counter),
        transports: (pk.transports || []) as PasskeyCredential['transports'],
      }))

      const options = await generateLogin(credentials)

      return ok({
        operatorId: operator.id,
        hasPasskeys: true,
        hasTotp,
        requiresTotp: hasTotp,
        options,
      })
    }

    return ok({
      operatorId: operator.id,
      hasPasskeys: false,
      hasTotp: true,
      requiresTotp: true,
      options: null,
    })
  } catch (err) {
    return serverError(err)
  }
}
