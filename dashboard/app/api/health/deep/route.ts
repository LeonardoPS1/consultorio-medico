import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

/**
 * GET /api/health/deep
 *
 * Health check profundo que verifica:
 * - PostgreSQL (conexión + query)
 * - n8n (API reachable)
 * - Ollama (modelo Mistral responde)
 * - Twilio (API reachable)
 *
 * Útil para monitoreo proactivo y alertas.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const checks: Record<string, { status: 'ok' | 'error' | 'degraded'; message?: string; latencyMs: number }> = {};
  const start = Date.now();

  // ─── PostgreSQL ────────────────────────────────────
  try {
    const pgStart = Date.now();
    await db.execute(sql`SELECT 1`);
    checks.postgres = { status: 'ok', latencyMs: Date.now() - pgStart };
  } catch (e: any) {
    checks.postgres = { status: 'error', message: e.message?.slice(0, 100), latencyMs: Date.now() - start };
  }

  // ─── n8n ───────────────────────────────────────────
  try {
    const n8nStart = Date.now();
    const n8nUrl = process.env.N8N_BASE_URL || 'http://172.18.0.1:5678';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${n8nUrl}/healthz`, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      checks.n8n = { status: 'ok', latencyMs: Date.now() - n8nStart };
    } else {
      checks.n8n = { status: 'degraded', message: `HTTP ${res.status}`, latencyMs: Date.now() - n8nStart };
    }
  } catch (e: any) {
    checks.n8n = { status: 'error', message: e.message?.slice(0, 100) || 'timeout', latencyMs: 3000 };
  }

  // ─── Ollama ────────────────────────────────────────
  try {
    const ollamaStart = Date.now();
    const ollamaUrl = process.env.OLLAMA_URL || 'http://172.18.0.1:11434';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${ollamaUrl}/api/tags`, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      const models = data?.models?.map((m: any) => m.name) || [];
      checks.ollama = { status: 'ok', message: models.join(', ') || 'no models', latencyMs: Date.now() - ollamaStart };
    } else {
      checks.ollama = { status: 'degraded', message: `HTTP ${res.status}`, latencyMs: Date.now() - ollamaStart };
    }
  } catch (e: any) {
    checks.ollama = { status: 'error', message: e.message?.slice(0, 100) || 'timeout', latencyMs: 5000 };
  }

  // ─── Twilio ────────────────────────────────────────
  try {
    const twilioStart = Date.now();
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (accountSid && authToken) {
      const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`, {
        headers: { Authorization: `Basic ${auth}` },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) {
        checks.twilio = { status: 'ok', latencyMs: Date.now() - twilioStart };
      } else {
        checks.twilio = { status: 'degraded', message: `HTTP ${res.status}`, latencyMs: Date.now() - twilioStart };
      }
    } else {
      checks.twilio = { status: 'degraded', message: 'Credenciales no configuradas', latencyMs: 0 };
    }
  } catch (e: any) {
    checks.twilio = { status: 'error', message: e.message?.slice(0, 100) || 'timeout', latencyMs: 5000 };
  }

  // ─── Overall ───────────────────────────────────────
  const statuses = Object.values(checks).map(c => c.status);
  const overall = statuses.every(s => s === 'ok') ? 'healthy'
    : statuses.some(s => s === 'error') ? 'unhealthy'
    : 'degraded';

  return NextResponse.json({
    status: overall,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    totalLatencyMs: Date.now() - start,
    checks,
  }, {
    status: overall === 'healthy' ? 200 : overall === 'degraded' ? 200 : 503,
  });
}
