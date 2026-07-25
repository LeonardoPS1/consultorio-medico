import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { sql } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET() {
  const start = Date.now()
  let dbStatus = 'ok'
  let dbLatency = 0

  try {
    const db = getDb()
    const before = Date.now()
    await db.execute(sql`SELECT 1`)
    dbLatency = Date.now() - before
  } catch (err) {
    dbStatus = 'error'
    console.error('[ops-health] DB error:', err)
  }

  return NextResponse.json({
    status: dbStatus === 'ok' ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    db: {
      connected: dbStatus === 'ok',
      latency_ms: dbLatency,
    },
    uptime: process.uptime(),
  })
}
