import { getDb } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { ok, error, serverError } from '@/lib/api-handler'
import { getOperatorFromHeaders } from '@/lib/overrides'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const operator = getOperatorFromHeaders(request)
    if (!operator) return error('No autorizado', 401)

    const url = new URL(request.url)
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200)

    const db = getDb()
    const result = await db.execute(sql`
      SELECT
        ah.id,
        ac.alert_name,
        ac.display_name,
        ah.tenant_nombre,
        ah.trigger_value,
        ah.threshold_value,
        ah.message,
        ah.notifications_sent,
        ah.created_at
      FROM platform.alerts_history ah
      JOIN platform.alerts_config ac ON ac.id = ah.alert_config_id
      ORDER BY ah.created_at DESC
      LIMIT ${limit}
    `)

    return ok(result)
  } catch (err) {
    return serverError(err)
  }
}