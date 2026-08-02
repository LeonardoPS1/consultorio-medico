import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export type EstadoPublico = 'operativo' | 'degradado' | 'caido';

export interface EstadoCategoria {
  categoria: string;
  estado: EstadoPublico;
  ultimaActualizacion: string;
}

const TIMEOUT_MS = 3000;
const CACHE_TTL_MS = 60_000;

let _cache: { timestamp: number; data: EstadoCategoria[] } | null = null;

function getMessage(error: unknown): string {
  if (error instanceof Error) return error.message?.slice(0, 100) || 'unknown error';
  return String(error).slice(0, 100);
}

async function fetchOk(url: string, path: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(`${url}${path}`, { signal: controller.signal });
    clearTimeout(timeout);
    return res.ok;
  } catch (e: unknown) {
    getMessage(e);
    return false;
  }
}

async function checkPostgres(): Promise<boolean> {
  try {
    await db.execute(sql`SELECT 1`);
    return true;
  } catch {
    return false;
  }
}

async function checkRedis(): Promise<boolean> {
  try {
    const { getRedis } = await import('@/lib/redis');
    const redis = await getRedis();
    if (!redis) return false;
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}

async function checkN8n(): Promise<boolean> {
  const n8nUrl = process.env.N8N_BASE_URL || 'http://172.18.0.1:5678';
  return fetchOk(n8nUrl, '/healthz');
}

async function checkChatwoot(): Promise<boolean> {
  const chatwootUrl = process.env.CHATWOOT_URL || 'http://172.18.0.1:3002';
  return fetchOk(chatwootUrl, '/api/v1/health');
}

async function checkEvolutionApi(): Promise<boolean> {
  const evolutionUrl = process.env.EVOLUTION_API_URL || 'http://172.18.0.1:8080';
  return fetchOk(evolutionUrl, '/health');
}

async function checkLiveKit(): Promise<boolean> {
  const livekitUrl = process.env.LIVEKIT_URL || 'wss://livekit.aicorebots.com';
  if (livekitUrl.startsWith('wss://') || livekitUrl.startsWith('ws://')) {
    return true;
  }
  return fetchOk(livekitUrl, '/health');
}

function resolverEstado(okList: boolean[]): EstadoPublico {
  if (okList.length === 0) return 'degradado';
  if (okList.every((ok) => ok)) return 'operativo';
  if (okList.some((ok) => ok)) return 'degradado';
  return 'caido';
}

export async function obtenerEstadoPublico(): Promise<EstadoCategoria[]> {
  if (_cache && Date.now() - _cache.timestamp < CACHE_TTL_MS) {
    return _cache.data;
  }

  const [postgres, redis, n8n, chatwoot, evolution, livekit] = await Promise.allSettled([
    checkPostgres(),
    checkRedis(),
    checkN8n(),
    checkChatwoot(),
    checkEvolutionApi(),
    checkLiveKit(),
  ]);

  const ok = (r: PromiseSettledResult<boolean>): boolean => r.status === 'fulfilled' && r.value;

  const data: EstadoCategoria[] = [
    {
      categoria: 'Mensajería',
      estado: resolverEstado([ok(evolution), ok(chatwoot), ok(n8n)]),
      ultimaActualizacion: new Date().toISOString(),
    },
    {
      categoria: 'Plataforma',
      estado: resolverEstado([ok(postgres), ok(redis)]),
      ultimaActualizacion: new Date().toISOString(),
    },
    {
      categoria: 'Videoconsultas',
      estado: resolverEstado([ok(livekit)]),
      ultimaActualizacion: new Date().toISOString(),
    },
  ];

  _cache = { timestamp: Date.now(), data };
  return data;
}
