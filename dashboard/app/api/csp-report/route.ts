import { NextResponse } from 'next/server';
import { safeWarn } from '@/lib/logger';

/**
 * Recibe y registra los reportes de violación de CSP.
 * @param {Request} request - La solicitud HTTP entrante.
 * @returns {Promise<NextResponse>} Respuesta 200 para no alertar al atacante.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    // Loggear violación CSP para debugging
    safeWarn('[CSP Violation]', {
      'csp-report': body['csp-report'] || body,
      userAgent: request.headers.get('user-agent'),
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    safeWarn(
      '[CSP Report] Error parsing report:',
      err instanceof Error ? { message: err.message } : err,
    );
    return NextResponse.json({ ok: true }); // Siempre 200 para no alertar al atacante
  }
}
