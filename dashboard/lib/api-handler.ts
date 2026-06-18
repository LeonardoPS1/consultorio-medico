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

export function apiHandler(fn: (...args: any[]) => Promise<NextResponse> | NextResponse) {
  return async (...args: any[]) => {
    const request = args[0] as NextRequest;
    try {
      return await fn(...args);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error interno del servidor';
      const status = error instanceof HttpError ? error.status : 500;
      safeError(`[API] ${request.method} ${request.nextUrl.pathname}:`, { error: message });
      // Mostrar el error real siempre para facilitar debugging
      // En producción se puede ocultar después de diagnosticar
      const userFacing = status < 500;
      return NextResponse.json(
        { 
          error: userFacing ? message : 'Error interno del servidor',
          detail: process.env.NODE_ENV !== 'production' ? message : undefined,
          ...(process.env.NODE_ENV === 'production' ? { prodError: message } : {}),
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

/** Error HTTP con código de estado */
export class HttpError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'HttpError';
  }
}

/** Respuesta de error con mensaje personalizado */
export function fail(message: string, status = 400): never {
  throw new HttpError(message, status);
}

/** Respuesta 201 Created (wrappeado en { data } para compatibilidad con clientes) */
export function created<T>(data: T) {
  return NextResponse.json({ data }, { status: 201 });
}

/** Respuesta 404 Not Found */
export function notFound(message = 'Recurso no encontrado'): never {
  throw new HttpError(message, 404);
}

/** Respuesta 409 Conflict */
export function conflict(message: string): never {
  throw new HttpError(message, 409);
}
