export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { checkPostgres, checkN8n, checkOllama, checkTwilio, summarizeHealth } from '@/lib/health-checks';

export async function GET() {
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
