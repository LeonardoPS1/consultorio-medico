import { NextResponse } from 'next/server';

/**
 * Health check endpoint para Dokploy / monitoreo
 *
 * Solo verifica que el servidor Next.js esté funcionando.
 * La DB tiene su propio health check interno (/api/health/deep).
 * Uso: GET /api/health
 *
 * Respuesta (200):
 * {
 *   "status": "ok",
 *   "timestamp": "...",
 *   "uptime": 12345,
 *   "version": "0.3.0"
 * }
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.18.0',
      commit: process.env.NEXT_PUBLIC_GIT_COMMIT || 'dev',
      buildTime: process.env.NEXT_PUBLIC_BUILD_TIME || 'unknown',
      environment: process.env.NODE_ENV || 'development',
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    },
  );
}
