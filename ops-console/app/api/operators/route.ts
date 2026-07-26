import { NextRequest } from 'next/server'
import { getDb } from '@/lib/db'
import { platformOperators, platformPasskeys } from '@/drizzle/schema'
import { sql, eq, asc, desc } from 'drizzle-orm'
import { logAudit } from '@/lib/audit'
import { ok, error, serverError, unauthorized } from '@/lib/api-handler'
import { createHash, randomBytes } from 'crypto'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const operatorId = request.headers.get('x-operator-id')
    const operatorEmail = request.headers.get('x-operator-email')
    if (!operatorId || !operatorEmail) return unauthorized()

    const db = getDb()
    const operators = await db
      .select({
        id: platformOperators.id,
        email: platformOperators.email,
        nombre: platformOperators.nombre,
        activo: platformOperators.activo,
        ultimoAcceso: platformOperators.ultimoAcceso,
        createdAt: platformOperators.createdAt,
        passkeyCount: sql<number>`(
          SELECT COUNT(*)::int FROM ${platformPasskeys}
          WHERE ${platformPasskeys.operatorId} = ${platformOperators.id}
        )`,
        totpVerified: platformOperators.totpVerified,
      })
      .from(platformOperators)
      .orderBy(asc(platformOperators.nombre))

    logAudit({
      operatorId,
      operatorEmail,
      accion: 'operator.list',
      motivo: 'Listado de operadores',
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    })

    return ok(operators)
  } catch (err) {
    return serverError(err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const operatorId = request.headers.get('x-operator-id')
    const operatorEmail = request.headers.get('x-operator-email')
    if (!operatorId || !operatorEmail) return unauthorized()

    const body = await request.json()
    const email = body.email?.trim()
    const nombre = body.nombre?.trim()

    if (!email || !email.includes('@')) return error('Email inválido', 400)
    if (!nombre || nombre.length < 2) return error('Nombre requerido (mín. 2 caracteres)', 400)

    const db = getDb()

    const existing = await db
      .select({ id: platformOperators.id })
      .from(platformOperators)
      .where(eq(platformOperators.email, email))
      .limit(1)

    if (existing.length > 0) return error('Ya existe un operador con ese email', 409)

    const pepper = process.env.OPS_SETUP_TOKEN_PEPPER || 'dev-pepper'
    const setupToken = randomBytes(32).toString('hex')
    const setupHash = createHash('sha256').update(setupToken + pepper).digest('hex')
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

    const [created] = await db
      .insert(platformOperators)
      .values({
        email,
        nombre,
        setupToken: setupHash,
        setupTokenExpires: expiresAt,
      })
      .returning({ id: platformOperators.id, email: platformOperators.email, nombre: platformOperators.nombre })

    logAudit({
      operatorId,
      operatorEmail,
      accion: 'operator.create',
      recurso: `operator:${created.id}`,
      motivo: `Creación de operador: ${created.email}`,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    })

    return ok({ operator: created, setupToken, setupUrl: `/setup?token=${setupToken}` }, 201)
  } catch (err) {
    return serverError(err)
  }
}
