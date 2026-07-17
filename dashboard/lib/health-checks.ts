import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export interface CheckResult {
  status: 'ok' | 'error' | 'degraded';
  message?: string;
  latencyMs: number;
}

export async function checkPostgres(): Promise<CheckResult> {
  const start = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    return { status: 'ok', latencyMs: Date.now() - start };
  } catch (e: unknown) {
    return {
      status: 'error',
      message: getMessage(e),
      latencyMs: Date.now() - start,
    };
  }
}

export async function checkN8n(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const n8nUrl = process.env.N8N_BASE_URL || 'http://172.18.0.1:5678';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${n8nUrl}/healthz`, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      return { status: 'ok', latencyMs: Date.now() - start };
    }
    return { status: 'degraded', message: `HTTP ${res.status}`, latencyMs: Date.now() - start };
  } catch (e: unknown) {
    return { status: 'error', message: getMessage(e) || 'timeout', latencyMs: 3000 };
  }
}

export async function checkOllama(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://172.18.0.1:11434';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${ollamaUrl}/api/tags`, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json() as { models?: { name: string }[] };
      const models = data?.models?.map((m) => m.name).join(', ') || 'no models';
      return { status: 'ok', message: models, latencyMs: Date.now() - start };
    }
    return { status: 'degraded', message: `HTTP ${res.status}`, latencyMs: Date.now() - start };
  } catch (e: unknown) {
    return { status: 'error', message: getMessage(e) || 'timeout', latencyMs: 5000 };
  }
}

export async function checkRedis(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const { getRedis } = await import('@/lib/redis');
    const redis = await getRedis();
    if (!redis) {
      return { status: 'degraded', message: 'No configurado (REDIS_URL ausente)', latencyMs: Date.now() - start };
    }
    await redis.ping();
    return { status: 'ok', latencyMs: Date.now() - start };
  } catch (e: unknown) {
    return { status: 'error', message: getMessage(e), latencyMs: Date.now() - start };
  }
}

export async function checkTwilio(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!accountSid || !authToken) {
      return { status: 'degraded', message: 'Credenciales no configuradas', latencyMs: 0 };
    }
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`, {
      headers: { Authorization: `Basic ${auth}` },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.ok) {
      return { status: 'ok', latencyMs: Date.now() - start };
    }
    return { status: 'degraded', message: `HTTP ${res.status}`, latencyMs: Date.now() - start };
  } catch (e: unknown) {
    return { status: 'error', message: getMessage(e) || 'timeout', latencyMs: 5000 };
  }
}

export function getMessage(error: unknown): string {
  if (error instanceof Error) return error.message?.slice(0, 100) || 'unknown error';
  return String(error).slice(0, 100);
}

export interface HealthSummary {
  status: 'ok' | 'error' | 'degraded';
  checks: Record<string, CheckResult>;
}

export function summarizeHealth(checks: Record<string, CheckResult>): HealthSummary['status'] {
  const statuses = Object.values(checks).map((c) => c.status);
  if (statuses.every((s) => s === 'ok')) return 'ok';
  if (statuses.some((s) => s === 'error')) return 'error';
  return 'degraded';
}
