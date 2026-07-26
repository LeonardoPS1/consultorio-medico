import { NextRequest } from 'next/server'
import { getDb } from '@/lib/db'
import { platformOperators } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import { logAudit } from '@/lib/audit'
import { createSessionToken, setSessionCookie } from '@/lib/auth'
import { ok, error, serverError, unauthorized, notFound } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const operatorId = request.headers.get('x-operator-id')
    const operatorEmail = request.headers.get('x-operator-email')
    if (!operatorId || !operatorEmail) return unauthorized()

    const { id } = await params
    const body = await request.json()
    const db = getDb()

    const existing = await db
      .select({ id: platformOperators.id, email: platformOperators.email, nombre: platformOperators.nombre, activo: platformOperators.activo })
      .from(platformOperators)
      .where(eq(platformOperators.id, id))
      .limit(1)

    if (existing.length === 0) return notFound('Operador no encontrado')

    if (body.activo !== undefined) {
      if (id === operatorId && body.activo === false) {
        return error('No puedes desactivarte a ti mismo', 400)
      }
      await db
        .update(platformOperators)
        .set({ activo: body.activo })
        .where(eq(platformOperators.id, id))

      logAudit({
        operatorId,
        operatorEmail,
        accion: body.activo ? 'operator.activate' : 'operator.deactivate',
        recurso: `operator:${id}`,
        motivo: `${body.activo ? 'Activación' : 'Desactivación'} de operador ${existing[0].email}`,
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
      })
    }

    if (body.nombre !== undefined) {
      await db
        .update(platformOperators)
        .set({ nombre: body.nombre })
        .where(eq(platformOperators.id, id))

      if (id === operatorId) {
        const newToken = await createSessionToken({
          id: operatorId,
          email: operatorEmail,
          nombre: body.nombre,
        })
        await setSessionCookie(newToken.token)
      }
    }

    if (body.regenerateSetupToken !== undefined) {
      const { createHash, randomBytes } = await import('crypto')
      const pepper = process.env.OPS_SETUP_TOKEN_PEPPER || 'dev-pepper'
      const setupToken = randomBytes(32).toString('hex')
      const setupHash = createHash('sha256').update(setupToken + pepper).digest('hex')
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

      await db
        .update(platformOperators)
        .set({
          setupToken: setupHash,
          setupTokenExpires: expiresAt,
        })
        .where(eq(platformOperators.id, id))

      logAudit({
        operatorId,
        operatorEmail,
        accion: 'operator.setup_token_regenerated',
        recurso: `operator:${id}`,
        motivo: `Regeneración de setup token para ${existing[0].email}`,
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
      })

      return ok({ setupToken, setupUrl: `/setup?token=${setupToken}` })
    }

    return ok({ message: 'Operador actualizado' })
  } catch (err) {
    return serverError(err)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const operatorId = request.headers.get('x-operator-id')
    const operatorEmail = request.headers.get('x-operator-email')
    if (!operatorId || !operatorEmail) return unauthorized()

    const { id } = await params
    if (id === operatorId) return error('No puedes eliminarte a ti mismo', 400)

    const db = getDb()
    const existing = await db
      .select({ id: platformOperators.id, email: platformOperators.email })
      .from(platformOperators)
      .where(eq(platformOperators.id, id))
      .limit(1)

    if (existing.length === 0) return notFound('Operador no encontrado')

    await db
      .update(platformOperators)
      .set({ activo: false, setupToken: null, setupTokenExpires: null })
      .where(eq(platformOperators.id, id))

    logAudit({
      operatorId,
      operatorEmail,
      accion: 'operator.delete',
      recurso: `operator:${id}`,
      motivo: `Eliminación de operador: ${existing[0].email}`,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    })

    return ok({ message: 'Operador desactivado' })
  } catch (err) {
    return serverError(err)
  }
}
