import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { platformOperators, platformPasskeys } from '@/drizzle/schema'
import { generateLogin, type PasskeyCredential } from '@/lib/webauthn'
import { ok, error, serverError, unauthorized } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return error('Email requerido')
    }

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

    if (passkeysRaw.length === 0) {
      return error('No hay passkeys registrados. Usa el setup inicial.', 400)
    }

    const credentials: PasskeyCredential[] = passkeysRaw.map(pk => ({
      id: pk.credentialId,
      publicKey: pk.publicKey,
      counter: Number(pk.counter),
      transports: (pk.transports || []) as PasskeyCredential['transports'],
    }))

    const options = await generateLogin(credentials)

    return ok({
      operatorId: operator.id,
      requiresTotp: operator.totpVerified,
      options,
    })
  } catch (err) {
    return serverError(err)
  }
}
