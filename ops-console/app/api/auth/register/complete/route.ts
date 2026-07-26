import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { platformOperators, platformPasskeys } from '@/drizzle/schema'
import { verifyRegistration, type PasskeyCredential } from '@/lib/webauthn'
import { generateTotpSecret, generateTotpUri, generateTotpQrCode } from '@/lib/totp'
import { registerCompleteSchema } from '@/lib/validation'
import { ok, error, serverError } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = registerCompleteSchema.safeParse(body)
    if (!parsed.success) {
      return error(parsed.error.errors[0].message, 400)
    }
    const { email, credential, challenge } = parsed.data

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

    const verification = await verifyRegistration(credential, challenge)

    if (!verification.verified || !verification.registrationInfo) {
      return error('Verificación del passkey falló', 400)
    }

    const { credentialID, credentialPublicKey, counter } = verification.registrationInfo

    await db.insert(platformPasskeys).values({
      operatorId: operator.id,
      credentialId: credentialID,
      publicKey: btoa(String.fromCharCode(...new Uint8Array(credentialPublicKey))),
      counter: BigInt(counter),
      transports: (credential as { response?: { transports?: string[] } }).response?.transports || [],
    })

    await db
      .update(platformOperators)
      .set({ setupToken: null, setupTokenExpires: null })
      .where(eq(platformOperators.id, operator.id))

    const totpSecret = generateTotpSecret()
    const totpUri = generateTotpUri(totpSecret, email)
    const qrCode = await generateTotpQrCode(totpUri)

    await db
      .update(platformOperators)
      .set({ totpSecret })
      .where(eq(platformOperators.id, operator.id))

    return ok({
      passkeyRegistered: true,
      totpQrCode: qrCode,
      totpUri,
    })
  } catch (err) {
    return serverError(err)
  }
}
