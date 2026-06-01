/**
 * Public API Handler
 *
 * Wrapper para endpoints públicos /api/v1/ que combina:
 * 1. Rate limiting (configurable por endpoint)
 * 2. Validación de API key
 * 3. Verificación de scopes
 * 4. Inyección de tenantId
 * 5. CORS headers
 * 6. Error handling uniforme
 */

import { NextRequest, NextResponse } from 'next/server';
import { safeError } from '@/lib/logger';
import { withRateLimit } from '@/lib/rate-limit';
import { extractApiKey, validateApiKey, hasScope, type ApiKeyData, type ApiScope } from '@/lib/public-api-auth';

// ─── Extender Request con datos de auth ──────────────────────

export interface AuthenticatedRequest extends NextRequest {
  /** Datos de la API key validada */
  apiKey: ApiKeyData;
  /** Tenant ID inyectado desde la API key */
  tenantId: string;
}

// ─── Helpers de respuesta ────────────────────────────────────

function corsOrigin(): string {
  // En producción, limitar a dominios conocidos; en desarrollo permitir localhost
  if (process.env.NODE_ENV === 'production') {
    return process.env.CORS_ORIGIN || 'https://med.aicorebots.com';
  }
  return '*';
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': corsOrigin(),
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

export function jsonResponse(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: corsHeaders(),
  });
}

export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, {
    status,
    headers: corsHeaders(),
  });
}

// ─── OPTIONS handler para CORS preflight ─────────────────────

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

// ─── Public API Handler Factory ──────────────────────────────

interface PublicApiHandlerOptions {
  /** Scopes requeridos para este endpoint */
  scopes?: ApiScope[];
  /** Máximo de requests por ventana */
  maxRequests?: number;
  /** Ventana de rate limiting en ms */
  windowMs?: number;
}

type HandlerFn = (request: AuthenticatedRequest, context?: { params: Record<string, string> }) => Promise<NextResponse>;

/**
 * Crea un handler para endpoints públicos. Se encarga de:
 * 1. CORS preflight (OPTIONS)
 * 2. Rate limiting
 * 3. Validación de API key
 * 4. Verificación de scopes
 * 5. Inyección de tenantId y apiKey en request
 */
export function publicApiHandler(
  handler: HandlerFn,
  options: PublicApiHandlerOptions = {},
) {
  const {
    scopes = [],
    maxRequests = 60,
    windowMs = 60_000,
  } = options;

  // Encapso en withRateLimit para tener rate limiting configurable
  return withRateLimit(
    async (request: NextRequest) => {
      // 1. Extraer API key
      const apiKey = extractApiKey(request);
      if (!apiKey) {
        return errorResponse('API key requerida. Enviar via header x-api-key o Authorization: Bearer', 401);
      }

      // 2. Validar API key
      const validation = await validateApiKey(apiKey);
      if (!validation.valid || !validation.data) {
        return errorResponse(validation.error || 'API key inválida', 401);
      }

      // 3. Verificar scopes
      if (scopes.length > 0) {
        const hasAllScopes = scopes.every((scope) => hasScope(validation.data!, scope));
        if (!hasAllScopes) {
          return errorResponse(
            `Permiso insuficiente. Scopes requeridos: ${scopes.join(', ')}`,
            403,
          );
        }
      }

      // 4. Inyectar datos en request
      const authenticatedRequest = request as unknown as AuthenticatedRequest;
      authenticatedRequest.apiKey = validation.data;
      authenticatedRequest.tenantId = validation.data.tenantId;

      // 5. Ejecutar handler
      try {
        return await handler(authenticatedRequest);
      } catch (e) {
        safeError('[PublicAPI] Error en handler:', e instanceof Error ? { message: e.message } : e);
        return errorResponse('Error interno del servidor', 500);
      }
    },
    { maxRequests, windowMs },
  );
}
