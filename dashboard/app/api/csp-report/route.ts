import { NextResponse } from 'next/server';
import { safeWarn } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const body = await request.json();
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
