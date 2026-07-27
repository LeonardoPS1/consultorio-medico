import { NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { platformOperators } from '@/drizzle/schema'
import { verifyTotpCode } from '@/lib/totp'
import { ok, error, serverError, unauthorized } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const operatorId = request.headers.get('x-operator-id')
    const operatorEmail = request.headers.get('x-operator-email')
    if (!operatorId) return unauthorized()

    const body = await request.json()
    const { token, tenantId, tenantName, motivo } = body

    if (!token || !/^\d{6}$/.test(token)) {
      return error('Código TOTP inválido (6 dígitos requeridos)', 400)
    }
    if (!tenantId) {
      return error('tenantId requerido', 400)
    }
    if (!motivo || motivo.trim().length < 5) {
      return error('Motivo requerido (mín. 5 caracteres)', 400)
    }

    const db = getDb()

    const [operator] = await db
      .select()
      .from(platformOperators)
      .where(eq(platformOperators.id, operatorId))
      .limit(1)

    if (!operator) return unauthorized()
    if (!operator.totpSecret) return error('TOTP no configurado', 400)
    if (!verifyTotpCode(token, operator.totpSecret)) {
      return error('Código TOTP inválido', 400)
    }

    return ok({
      verified: true,
      tenantId,
      tenantName: tenantName || '',
      motivo: motivo.trim(),
      operatorEmail,
      operatorNombre: operator.nombre,
    })
  } catch (err) {
    return serverError(err)
  }
}
