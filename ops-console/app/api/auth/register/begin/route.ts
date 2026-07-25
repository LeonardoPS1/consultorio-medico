import { v4 as uuidv4 } from 'uuid'
import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { platformOperators, platformPasskeys } from '@/drizzle/schema'
import { generateRegistration, type PasskeyCredential } from '@/lib/webauthn'
import { ok, error, serverError } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, setupToken } = body

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
      return error('Operador no encontrado', 404)
    }

    const operator = operators[0]

    if (setupToken) {
      if (
        !operator.setupToken ||
        operator.setupToken !== setupToken ||
        (operator.setupTokenExpires && new Date(operator.setupTokenExpires) < new Date())
      ) {
        return error('Token de setup inválido o expirado', 401)
      }
    }

    const existingPasskeysRaw = await db
      .select()
      .from(platformPasskeys)
      .where(eq(platformPasskeys.operatorId, operator.id))

    const existingCredentials: PasskeyCredential[] = existingPasskeysRaw.map(pk => ({
      id: pk.credentialId,
      publicKey: pk.publicKey,
      counter: Number(pk.counter),
      transports: (pk.transports || []) as PasskeyCredential['transports'],
    }))

    const options = await generateRegistration(email, operator.nombre, existingCredentials)

    const challengeId = uuidv4()
    await db
      .update(platformOperators)
      .set({ setupToken: challengeId })
      .where(eq(platformOperators.id, operator.id))

    return ok({
      challengeId,
      options,
    })
  } catch (err) {
    return serverError(err)
  }
}
