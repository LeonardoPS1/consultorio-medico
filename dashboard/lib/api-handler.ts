/**
 * Wrapper unificado para handlers de API.
 *
 * Captura excepciones, loguea, y devuelve { error } con status code.
 * Elimina el try/catch repetitivo en cada endpoint.
 *
 * Uso:
 *   export const GET = apiHandler(async (req, ctx) => {
 *     const data = await someService();
 *     return success(data);
 *   });
 */

import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { captureError } from '@/lib/glitchtip';
import { safeError } from '@/lib/logger';
import { runWithContext } from '@/lib/request-context';
import { withTenantScope } from '@/lib/rls';

/**
 * Envuelve un handler de API unificando contexto de tenant y captura de errores.
 * @param fn - Función handler a envolver.
 * @returns Handler envuelto listo para Next.js.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- wrapper que acepta distintos tipos de callbacks
export function apiHandler(fn: (...args: any[]) => Promise<NextResponse> | NextResponse) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async (...args: any[]) => {
    const request = args[0] as NextRequest;
    const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
    // Tenant por defecto como fallback; withTenantScope() lo corrige a la sesión activa
    let tenantId = request.headers.get('x-tenant-id') || '00000000-0000-0000-0000-000000000000';

    try {
      // Establecer contexto tenant automáticamente (sesión NextAuth o impersonación)
      tenantId = (await withTenantScope()) || tenantId;
      return await runWithContext({ requestId, tenantId }, () => fn(...args));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error interno del servidor';
      const status = error instanceof HttpError ? error.status : 500;
      console.error(`[API ERROR] ${request.method} ${request.nextUrl.pathname}:`, error);
      safeError(`[API] ${request.method} ${request.nextUrl.pathname}:`, {
        error: message,
        stack: error instanceof Error ? error.stack : undefined,
      });
      captureError(error, {
        tags: { ruta: request.nextUrl.pathname, method: request.method, tenantId },
        level: status >= 500 ? 'error' : 'warning',
      });
      const userFacing = status < 500;
      return NextResponse.json(
        {
          error: userFacing ? message : 'Error interno del servidor',
          ...(process.env.NODE_ENV !== 'production' ? { detail: message } : {}),
        },
        { status },
      );
    }
  };
}

/**
 * Respuesta exitosa con datos (wrappeado en { data } para compatibilidad con clientes)
 * @param data
 * @param status
 */
export function success<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

/**
 * Respuesta exitosa sin wrapper data (para respuestas planas como health)
 * @param body
 * @param status
 */
export function ok<T>(body: T, status = 200) {
  return NextResponse.json(body, { status });
}

/** Error HTTP con código de estado */
export class HttpError extends Error {
  status: number;
  /**
   *
   * @param message
   * @param status
   */
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'HttpError';
  }
}

/**
 * Respuesta de error con mensaje personalizado
 * @param message
 * @param status
 */
export function fail(message: string, status = 400): never {
  throw new HttpError(message, status);
}

/**
 * Respuesta 201 Created (wrappeado en { data } para compatibilidad con clientes)
 * @param data
 */
export function created<T>(data: T) {
  return NextResponse.json({ data }, { status: 201 });
}

/**
 * Respuesta 404 Not Found
 * @param message
 */
export function notFound(message = 'Recurso no encontrado'): never {
  throw new HttpError(message, 404);
}

/**
 * Respuesta 409 Conflict
 * @param message
 */
export function conflict(message: string): never {
  throw new HttpError(message, 409);
}
