export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { checkPostgres, checkRedis, summarizeHealth } from '@/lib/health-checks';

export async function GET() {
  const [pg, redis] = await Promise.all([checkPostgres(), checkRedis()]);
  const checks = { postgres: pg, redis };
  const overall = summarizeHealth(checks);

  return NextResponse.json(
    {
      status: overall,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.18.2',
      commit: process.env.NEXT_PUBLIC_GIT_COMMIT || 'dev',
      buildTime: process.env.NEXT_PUBLIC_BUILD_TIME || 'unknown',
      environment: process.env.NODE_ENV || 'development',
      checks,
    },
    {
      status: overall === 'error' ? 503 : 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    },
  );
}
