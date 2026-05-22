/**
 * Rate limiter simple (in-memory) para endpoints críticos.
 * 
 * Sin dependencias externas. Usa un Map con TTL.
 * Adecuado para entornos single-instance (Docker Swarm con 1 réplica).
 * 
 * Para multi-instancia, reemplazar por @upstash/ratelimit + Redis.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Limpiar entradas vencidas cada 5 minutos
setInterval(() => {
  const now = Date.now();
  const keysToDelete: string[] = [];
  store.forEach((entry, key) => {
    if (now > entry.resetAt) keysToDelete.push(key);
  });
  keysToDelete.forEach(key => store.delete(key));
}, 5 * 60 * 1000);

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
 * 
 * @param key - Identificador único (ej: IP del cliente)
 * @param config - Configuración opcional
 * @returns { allowed: boolean, remaining: number, resetAt: number }
 */
export function checkRateLimit(
  key: string,
  config: Partial<RateLimitConfig> = {},
): { allowed: boolean; remaining: number; resetAt: number } {
  const { maxRequests, windowMs } = { ...DEFAULT_CONFIG, ...config };
  const now = Date.now();

  let entry = store.get(key);

  // Si no existe o expiró, crear nueva entrada
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
    store.set(key, entry);
  }

  entry.count++;

  return {
    allowed: entry.count <= maxRequests,
    remaining: Math.max(0, maxRequests - entry.count),
    resetAt: entry.resetAt,
  };
}

/**
 * Middleware-style wrapper para Next.js API routes.
 * 
 * Uso:
 *   export const POST = withRateLimit(async (request) => {
 *     ...
 *   }, { maxRequests: 10, windowMs: 60000 });
 */

import { NextRequest, NextResponse } from 'next/server';

export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  config?: Partial<RateLimitConfig>,
) {
  return async (request: NextRequest) => {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';

    const { allowed, remaining, resetAt } = checkRateLimit(ip, config);

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
