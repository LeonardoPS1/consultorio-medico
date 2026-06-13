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

import { NextRequest, NextResponse } from 'next/server';
import { safeError } from '@/lib/logger';

export function apiHandler(fn: (...args: any[]) => any): (...args: any[]) => any {
  return async (...args: any[]) => {
    const request = args[0] as NextRequest;
    try {
      return await fn(...args);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error interno del servidor';
      const status = (error as any)?.status || 500;
      safeError(`[API] ${request.method} ${request.nextUrl.pathname}:`, { error: message });
      // Mostrar error real si no es 500, o si está habilitado explícitamente
      // En producción, los 500 se ocultan para no exponer detalles internos
      // Pero mostramos el mensaje real para facilitar debugging
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

/** Respuesta exitosa con datos (wrappeado en { data } para compatibilidad con clientes) */
export function success<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

/** Respuesta exitosa sin wrapper data (para respuestas planas como health) */
export function ok<T>(body: T, status = 200) {
  return NextResponse.json(body, { status });
}

/** Respuesta de error con mensaje personalizado */
export function fail(message: string, status = 400): never {
  const err = new Error(message);
  (err as any).status = status;
  throw err;
}

/** Respuesta 201 Created (wrappeado en { data } para compatibilidad con clientes) */
export function created<T>(data: T) {
  return NextResponse.json({ data }, { status: 201 });
}

/** Respuesta 404 Not Found */
export function notFound(message = 'Recurso no encontrado'): never {
  const err = new Error(message);
  (err as any).status = 404;
  throw err;
}

/** Respuesta 409 Conflict */
export function conflict(message: string): never {
  const err = new Error(message);
  (err as any).status = 409;
  throw err;
}
