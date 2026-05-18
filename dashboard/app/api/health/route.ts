import { NextResponse } from 'next/server';

/**
 * Health check endpoint para Dokploy / monitoreo
 *
 * Retorna estado del servidor y checks opcionales de servicios externos.
 * Uso: GET /api/health
 *
 * Respuesta (200):
 * {
 *   "status": "ok",
 *   "timestamp": "2026-05-17T12:00:00.000Z",
 *   "uptime": 12345,
 *   "version": "0.3.0",
 *   "checks": {
 *     "postgres": "ok" | "error" | "skipped"
 *   }
 * }
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function checkPostgres(): Promise<'ok' | 'error' | 'skipped'> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || dbUrl.includes('placeholder') || dbUrl.includes('password@localhost')) {
    return 'skipped';
  }

  try {
    const { default: postgres } = await import('postgres');
    const sql = postgres(dbUrl, { max: 1, timeout: 3 });
    const result = await sql`SELECT 1 AS healthy`;
    await sql.end();
    return result?.[0]?.healthy === 1 ? 'ok' : 'error';
  } catch {
    return 'error';
  }
}

export async function GET() {
  const start = Date.now();
  const postgresStatus = await checkPostgres();
  const elapsed = Date.now() - start;

  const allOk = postgresStatus !== 'error';

  return NextResponse.json(
    {
      status: allOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {
        postgres: postgresStatus,
      },
      responseTimeMs: elapsed,
    },
    {
      status: allOk ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    },
  );
}
