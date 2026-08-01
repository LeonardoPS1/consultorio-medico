import { NextResponse } from 'next/server';
import { runAllHealthChecks } from '@/lib/infra-health';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const health = await runAllHealthChecks();

    const statusCode = health.globalStatus === 'critical' ? 503 : health.globalStatus === 'degraded' ? 200 : 200;

    return NextResponse.json(health, {
      status: statusCode,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('[infra-health] Error:', error);
    return NextResponse.json(
      {
        globalStatus: 'critical',
        services: [],
        criticalDown: [],
        timestamp: new Date().toISOString(),
        error: 'Failed to run health checks',
      },
      { status: 500 }
    );
  }
}