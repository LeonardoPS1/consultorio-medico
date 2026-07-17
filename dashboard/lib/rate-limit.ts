import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';
import { db } from '@/lib/db';
import { rateLimits } from '@/drizzle/schema';
import { eq, sql } from 'drizzle-orm';
import { safeWarn } from '@/lib/logger';

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  message?: string;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 30,
  windowMs: 60_000,
  message: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.',
};

function hashKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex').slice(0, 16);
}

async function checkRateLimitRedis(key: string, config: RateLimitConfig): Promise<{ allowed: boolean; remaining: number; resetAt: number } | null> {
  const redis = await getRedis();
  if (!redis) return null;

  const now = Date.now();
  const redisKey = `rl:${hashKey(key)}`;
  const windowSec = Math.ceil(config.windowMs / 1000);

  try {
    const count = await redis.incr(redisKey);
    if (count === 1) {
      await redis.expire(redisKey, windowSec);
    }

    const ttl = await redis.ttl(redisKey);
    const resetAt = now + (ttl > 0 ? ttl * 1000 : config.windowMs);

    return {
      allowed: count <= config.maxRequests,
      remaining: Math.max(0, config.maxRequests - count),
      resetAt,
    };
  } catch {
    safeWarn('[RateLimit] Redis falló, usando fallback Postgres');
    return null;
  }
}

async function checkRateLimitPostgres(key: string, config: RateLimitConfig): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const { maxRequests, windowMs } = config;
  const now = new Date();

  await db
    .delete(rateLimits)
    .where(sql`${rateLimits.resetAt} < ${now}`)
    .execute()
    .catch(() => {});

  const [existing] = await db.select().from(rateLimits).where(eq(rateLimits.key, key)).limit(1);

  if (!existing || new Date(existing.resetAt) < now) {
    const resetAt = new Date(now.getTime() + windowMs);
    await db.execute(sql`
      INSERT INTO rate_limits (key, max_requests, count, window_ms, reset_at, created_at, updated_at)
      VALUES (${key}, ${maxRequests}, 1, ${windowMs}, ${resetAt}, NOW(), NOW())
      ON CONFLICT (key) DO UPDATE SET
        count = 1,
        reset_at = ${resetAt},
        max_requests = ${maxRequests},
        window_ms = ${windowMs},
        updated_at = NOW()
    `);

    return { allowed: true, remaining: maxRequests - 1, resetAt: resetAt.getTime() };
  }

  const newCount = existing.count + 1;
  await db.update(rateLimits).set({ count: newCount }).where(eq(rateLimits.key, key));

  return {
    allowed: newCount <= maxRequests,
    remaining: Math.max(0, maxRequests - newCount),
    resetAt: existing.resetAt.getTime(),
  };
}

export async function checkRateLimit(
  key: string,
  config: Partial<RateLimitConfig> = {},
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  const redisResult = await checkRateLimitRedis(key, fullConfig);
  if (redisResult) return redisResult;

  return checkRateLimitPostgres(key, fullConfig);
}

export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  config?: Partial<RateLimitConfig>,
) {
  return async (request: NextRequest) => {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';

    const { allowed, remaining, resetAt } = await checkRateLimit(ip, config);

    if (!allowed) {
      return NextResponse.json(
        { error: config?.message || DEFAULT_CONFIG.message },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(resetAt),
          },
        },
      );
    }

    const response = await handler(request);
    response.headers.set('X-RateLimit-Remaining', String(remaining));
    response.headers.set('X-RateLimit-Reset', String(resetAt));

    return response;
  };
}
