import { safeWarn } from '@/lib/logger';
import { getRedis } from '@/lib/redis';

const DEFAULT_TTL = 60;

/**
 *
 * @param key
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const redis = await getRedis();
    if (!redis) return null;
    const raw = await redis.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 *
 * @param key
 * @param data
 * @param ttlSec
 */
export async function cacheSet(key: string, data: unknown, ttlSec = DEFAULT_TTL): Promise<void> {
  try {
    const redis = await getRedis();
    if (!redis) return;
    const serialized = JSON.stringify(data);
    await redis.setex(key, ttlSec, serialized);
  } catch {
    safeWarn('[Cache] Error al guardar en Redis');
  }
}

/**
 *
 * @param pattern
 */
export async function cacheDel(pattern: string): Promise<void> {
  try {
    const redis = await getRedis();
    if (!redis) return;
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch {
    safeWarn('[Cache] Error al limpiar cache');
  }
}

// Compat: API legacy usan cache.getOrSet() y cache.invalidate()
export const cache = {
  async getOrSet<T>(key: string, fetchFn: () => Promise<T>, ttlSec = DEFAULT_TTL): Promise<T> {
    const cached = await cacheGet<T>(key);
    if (cached !== null) return cached;
    const value = await fetchFn();
    await cacheSet(key, value, ttlSec);
    return value;
  },
  async invalidate(pattern: string): Promise<void> {
    await cacheDel(pattern);
  },
};
