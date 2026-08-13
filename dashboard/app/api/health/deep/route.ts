import { NextResponse } from 'next/server';
import { checkPostgres, checkN8n, checkOllama, checkTwilio, summarizeHealth } from '@/lib/health-checks';

export const dynamic = 'force-dynamic';

/**
 * Health check profundo de todos los servicios críticos.
 * @returns {Promise<NextResponse>} Estado de salud de los servicios.
 */
export async function GET(): Promise<NextResponse> {
  const [pg, n8n, ollama, twilio] = await Promise.all([
    checkPostgres(),
    checkN8n(),
    checkOllama(),
    checkTwilio(),
  ]);

  const checks = { postgres: pg, n8n, ollama, twilio };
  const overall = summarizeHealth(checks);

  return NextResponse.json(
    {
      status: overall,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks,
    },
    {
      status: overall === 'error' ? 503 : 200,
    },
  );
}
