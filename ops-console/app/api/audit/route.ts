import { NextRequest } from 'next/server'
import { getDb } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { logAudit } from '@/lib/audit'
import { ok, serverError, unauthorized } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const operatorId = request.headers.get('x-operator-id')
    const operatorEmail = request.headers.get('x-operator-email')
    if (!operatorId || !operatorEmail) return unauthorized()

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const pageSize = Math.min(100, Math.max(10, parseInt(searchParams.get('pageSize') || '50')))
    const filterAccion = searchParams.get('accion') || ''
    const filterOperator = searchParams.get('operator') || ''
    const filterTenant = searchParams.get('tenant') || ''
    const filterFrom = searchParams.get('from') || ''
    const filterTo = searchParams.get('to') || ''

    const db = getDb()

    const conditions: ReturnType<typeof sql>[] = []
    if (filterAccion) conditions.push(sql`al.accion LIKE ${`%${filterAccion}%`}`)
    if (filterOperator) conditions.push(sql`al.operator_email LIKE ${`%${filterOperator}%`}`)
    if (filterTenant) conditions.push(sql`al.tenant_afectado LIKE ${`%${filterTenant}%`}`)
    if (filterFrom) conditions.push(sql`al.created_at >= ${filterFrom}::timestamptz`)
    if (filterTo) conditions.push(sql`al.created_at <= ${filterTo}::timestamptz`)

    const whereClause = conditions.length > 0
      ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
      : sql``

    const countResult = await db.execute(sql`
      SELECT COUNT(*)::int AS total
      FROM platform.platform_audit_log al
      ${whereClause}
    `)

    const total = (countResult as any[])[0]?.total || 0
    const totalPages = Math.ceil(total / pageSize)
    const offset = (page - 1) * pageSize

    const rows = await db.execute(sql`
      SELECT
        al.id,
        al.operator_email,
        al.accion,
        al.tenant_afectado,
        al.recurso,
        al.motivo,
        al.ip_address,
        al.created_at,
        al.detalles,
        COALESCE(o.nombre, '') AS operator_nombre
      FROM platform.platform_audit_log al
      LEFT JOIN platform.platform_operators o ON o.id = al.operator_id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `)

    logAudit({
      operatorId,
      operatorEmail,
      accion: 'audit.query',
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      detalles: { page, pageSize, accion: filterAccion || undefined, operator: filterOperator || undefined, tenant: filterTenant || undefined },
    })

    return ok({ items: rows, total, page, pageSize, totalPages })
  } catch (err) {
    return serverError(err)
  }
}
