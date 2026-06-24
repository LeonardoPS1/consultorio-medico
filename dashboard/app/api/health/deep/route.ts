import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

interface CheckResult {
  status: 'ok' | 'error' | 'degraded';
  message?: string;
  latencyMs: number;
}

interface HealthChecks {
  [key: string]: CheckResult;
}

interface OllamaTag {
  name: string;
}

/**
 * Extrae el mensaje de un error de forma segura.
 * @param error - Error capturado (tipo desconocido).
 * @returns Mensaje de error, truncado a 100 caracteres.
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message?.slice(0, 100) || 'unknown error';
  return String(error).slice(0, 100);
}

/**
 * GET /api/health/deep
 *
 * Health check profundo que verifica:
 * - PostgreSQL (conexión + query)
 * - n8n (API reachable)
 * - Ollama (modelo responde)
 * - Twilio (API reachable)
 *
 * Útil para monitoreo proactivo y alertas.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const checks: HealthChecks = {};
  const start = Date.now();

  // ─── PostgreSQL ────────────────────────────────────
  try {
    const pgStart = Date.now();
    await db.execute(sql`SELECT 1`);
    checks.postgres = { status: 'ok', latencyMs: Date.now() - pgStart };
  } catch (e: unknown) {
    checks.postgres = {
      status: 'error',
      message: getErrorMessage(e),
      latencyMs: Date.now() - start,
    };
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
      checks.n8n = {
        status: 'degraded',
        message: `HTTP ${res.status}`,
        latencyMs: Date.now() - n8nStart,
      };
    }
  } catch (e: unknown) {
    checks.n8n = {
      status: 'error',
      message: getErrorMessage(e) || 'timeout',
      latencyMs: 3000,
    };
  }

  // ─── Ollama ────────────────────────────────────────
  try {
    const ollamaStart = Date.now();
    const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://172.18.0.1:11434';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${ollamaUrl}/api/tags`, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const data = (await res.json()) as { models?: OllamaTag[] };
      const models = data?.models?.map((m: OllamaTag) => m.name) || [];
      checks.ollama = {
        status: 'ok',
        message: models.join(', ') || 'no models',
        latencyMs: Date.now() - ollamaStart,
      };
    } else {
      checks.ollama = {
        status: 'degraded',
        message: `HTTP ${res.status}`,
        latencyMs: Date.now() - ollamaStart,
      };
    }
  } catch (e: unknown) {
    checks.ollama = {
      status: 'error',
      message: getErrorMessage(e) || 'timeout',
      latencyMs: 5000,
    };
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
        checks.twilio = {
          status: 'degraded',
          message: `HTTP ${res.status}`,
          latencyMs: Date.now() - twilioStart,
        };
      }
    } else {
      checks.twilio = {
        status: 'degraded',
        message: 'Credenciales no configuradas',
        latencyMs: 0,
      };
    }
  } catch (e: unknown) {
    checks.twilio = {
      status: 'error',
      message: getErrorMessage(e) || 'timeout',
      latencyMs: 5000,
    };
  }

  // ─── Overall ───────────────────────────────────────
  const statuses = Object.values(checks).map((c) => c.status);
  const overall = statuses.every((s) => s === 'ok')
    ? 'ok'
    : statuses.some((s) => s === 'error')
      ? 'error'
      : 'degraded';

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
