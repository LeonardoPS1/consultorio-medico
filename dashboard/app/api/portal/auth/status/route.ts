/**
 * GET /api/portal/auth/status — Estado del portal
 *
 * Devuelve información de configuración pública del portal,
 * incluyendo si el modo bypass está habilitado.
 */
import { NextResponse } from 'next/server';

export async function GET() {
  const bypass = process.env.PORTAL_BYPASS === 'true';
  const isDev = process.env.NODE_ENV !== 'production';

  // TEMPORAL: bypass habilitado para testing sin login
  const bypassForzado = true;

  return NextResponse.json({
    bypass: bypassForzado || bypass || isDev,
    bypassActivo: bypassForzado || bypass,
    ambiente: isDev ? 'desarrollo' : 'produccion',
  });
}
