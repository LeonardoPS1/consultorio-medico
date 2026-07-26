import { getDb } from '@/lib/db'
import { sql, asc } from 'drizzle-orm'
import { getSessionFromCookie } from '@/lib/auth'
import { platformOperators, platformPasskeys } from '@/drizzle/schema'
import { OperatorsClient } from './operators-client'

export const dynamic = 'force-dynamic'

export default async function OperatorsPage() {
  const session = await getSessionFromCookie()
  if (!session) return null

  const db = getDb()
  const operators = await db
    .select({
      id: platformOperators.id,
      email: platformOperators.email,
      nombre: platformOperators.nombre,
      activo: platformOperators.activo,
      totpVerified: platformOperators.totpVerified,
      ultimoAcceso: platformOperators.ultimoAcceso,
      createdAt: platformOperators.createdAt,
      passkeyCount: sql<number>`(
        SELECT COUNT(*)::int FROM ${platformPasskeys}
        WHERE ${platformPasskeys.operatorId} = ${platformOperators.id}
      )`,
    })
    .from(platformOperators)
    .orderBy(asc(platformOperators.nombre))

  return <OperatorsClient operators={operators} currentOperatorId={session.sub} />
}
