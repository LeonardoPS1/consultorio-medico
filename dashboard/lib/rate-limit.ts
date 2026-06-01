/**
 * Rate limiter persistente en PostgreSQL.
 *
 * Reemplaza la versión in-memory que se perdía al reiniciar el servidor.
 * Usa la tabla `rate_limits` con TTL manejado por resetAt.
 * Las entradas expiradas se limpian automáticamente en cada consulta.
 */

import { db } from '@/lib/db';
import { rateLimits } from '@/drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export interface RateLimitConfig {
  maxRequests: number;   // Máximo de requests en la ventana
  windowMs: number;      // Ventana de tiempo en ms
  message?: string;      // Mensaje de error
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 30,
  windowMs: 60_000,      // 1 minuto
  message: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.',
};

/**
 * Verifica si una request excede el rate limit.
 * Usa PostgreSQL como almacenamiento persistente.
 */
export async function checkRateLimit(
  key: string,
  config: Partial<RateLimitConfig> = {},
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const { maxRequests, windowMs } = { ...DEFAULT_CONFIG, ...config };
  const now = new Date();

  // Limpiar entradas expiradas older than 1h (housekeeping)
  await db
    .delete(rateLimits)
    .where(sql`${rateLimits.resetAt} < ${now}`)
    .execute()
    .catch(() => {}); // fire-and-forget, no crítico

  // Buscar entrada existente
  const [existing] = await db
    .select()
    .from(rateLimits)
    .where(eq(rateLimits.key, key))
    .limit(1);

  if (!existing || new Date(existing.resetAt) < now) {
    // Crear nueva ventana
    const resetAt = new Date(now.getTime() + windowMs);
    await db
      .insert(rateLimits)
      .values({
        key,
        maxRequests,
        count: 1,
        windowMs,
        resetAt,
      })
      .onConflictDoUpdate({
        target: rateLimits.key,
        set: { count: 1, resetAt, maxRequests, windowMs, updatedAt: sql`CURRENT_TIMESTAMP` },
      });

    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: resetAt.getTime(),
    };
  }

  // Ventana activa — incrementar contador
  const newCount = existing.count + 1;
  await db
    .update(rateLimits)
    .set({ count: newCount })
    .where(eq(rateLimits.key, key));

  return {
    allowed: newCount <= maxRequests,
    remaining: Math.max(0, maxRequests - newCount),
    resetAt: existing.resetAt.getTime(),
  };
}

/**
 * Middleware-style wrapper para Next.js API routes con rate limiting persistente.
 *
 * Uso:
 *   export const POST = withRateLimit(async (request) => {
 *     ...
 *   }, { maxRequests: 10, windowMs: 60000 });
 */
export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  config?: Partial<RateLimitConfig>,
) {
  return async (request: NextRequest) => {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';

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
