import { safeLog, safeWarn, safeError } from '@/lib/logger';

let _redis: Redis | null = null;
let _enabled = false;

interface Redis {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode?: string, ttl?: number): Promise<'OK' | null>;
  setex(key: string, ttl: number, value: string): Promise<'OK' | null>;
  incr(key: string): Promise<number>;
  expire(key: string, ttl: number): Promise<number>;
  ttl(key: string): Promise<number>;
  del(...keys: string[]): Promise<number>;
  keys(pattern: string): Promise<string[]>;
  ping(): Promise<string>;
  quit(): Promise<'OK'>;
  connect(): Promise<void>;
  on(event: string, handler: (...args: unknown[]) => void): void;
  status: string;
}

function createClient(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) {
    safeLog('[Redis] REDIS_URL no configurado — deshabilitado');
    return null;
  }

  try {
    const IORedis = require('ioredis');
    const client = new IORedis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times: number) {
        if (times > 5) return null;
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
      enableOfflineQueue: false,
    });

    client.on('error', (err: Error) => {
      safeWarn('[Redis] Error de conexión:', err.message);
    });

    client.on('connect', () => {
      safeLog('[Redis] Conectado');
    });

    client.on('close', () => {
      safeWarn('[Redis] Conexión cerrada');
    });

    return client;
  } catch (e) {
    safeWarn('[Redis] Error al crear cliente:', e instanceof Error ? e.message : e);
    return null;
  }
}

export async function getRedis(): Promise<Redis | null> {
  if (!_redis) {
    _redis = createClient();
  }
  if (_redis && !_enabled && _redis.status !== 'ready' && _redis.status !== 'connecting') {
    try {
      await _redis.connect();
      _enabled = true;
      safeLog('[Redis] Cliente listo');
    } catch {
      safeWarn('[Redis] No se pudo conectar, usando fallback');
      _enabled = false;
    }
  }
  return _enabled ? _redis : null;
}

export async function redisHealthCheck(): Promise<{ ok: boolean; latencyMs: number }> {
  const start = Date.now();
  try {
    const r = await getRedis();
    if (!r) return { ok: false, latencyMs: Date.now() - start };
    await r.ping();
    return { ok: true, latencyMs: Date.now() - start };
  } catch {
    return { ok: false, latencyMs: Date.now() - start };
  }
}
