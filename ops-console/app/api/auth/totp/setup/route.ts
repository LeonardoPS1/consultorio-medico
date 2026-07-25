import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { platformOperators } from '@/drizzle/schema'
import { generateTotpSecret, generateTotpUri, generateTotpQrCode } from '@/lib/totp'
import { ok, error, serverError } from '@/lib/api-handler'

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
      return error('Operador no encontrado', 404)
    }

    const operator = operators[0]

    const secret = generateTotpSecret()
    const uri = generateTotpUri(secret, email)
    const qrCode = await generateTotpQrCode(uri)

    await db
      .update(platformOperators)
      .set({ totpSecret: secret })
      .where(eq(platformOperators.id, operator.id))

    return ok({
      totpQrCode: qrCode,
      totpUri: uri,
    })
  } catch (err) {
    return serverError(err)
  }
}
