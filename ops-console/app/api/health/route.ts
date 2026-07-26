import { getDb } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { ok, serverError } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const db = getDb()
    const before = Date.now()
    await db.execute(sql`SELECT 1`)
    const dbLatency = Date.now() - before

    return ok({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      db: {
        connected: true,
        latency_ms: dbLatency,
      },
      uptime_seconds: Math.floor(process.uptime()),
    })
  } catch (err) {
    console.error('[ops-health] DB error:', err)
    return ok({
      status: 'degraded',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      db: {
        connected: false,
        latency_ms: null,
      },
      uptime_seconds: Math.floor(process.uptime()),
    })
  }
}
