/**
 * GET /api/portal/auth/verify?token=xxx — Verificar magic link
 *
 * Valida el token, setea cookie de sesión, redirige al dashboard.
 * Rate-limited por IP (10 intentos / 15 min).
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyMagicToken, setPortalSessionCookie } from '@/lib/portal-auth';

const VERIFY_RATE_MAX = 10;
const VERIFY_RATE_WINDOW_MS = 15 * 60 * 1000;
const verifyRateMap = new Map<string, { count: number; resetAt: number }>();

function checkIpRate(ip: string): boolean {
  const now = Date.now();
  const entry = verifyRateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    verifyRateMap.set(ip, { count: 1, resetAt: now + VERIFY_RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= VERIFY_RATE_MAX) return false;
  entry.count++;
  return true;
}

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of Array.from(verifyRateMap)) {
      if (now > v.resetAt) verifyRateMap.delete(k);
    }
  }, VERIFY_RATE_WINDOW_MS);
}

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || '127.0.0.1';

  if (!checkIpRate(ip)) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Esperá 15 minutos.' },
      { status: 429 },
    );
  }

  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Token requerido' }, { status: 400 });
  }

  const session = await verifyMagicToken(token);

  if (!session) {
    return NextResponse.json({ error: 'Token inválido o expirado' }, { status: 401 });
  }

  // Setear cookie de sesión
  await setPortalSessionCookie(session);

  // Redirigir al dashboard (URL fija para evitar open redirect)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://med.aicorebots.com';
  return NextResponse.redirect(new URL('/portal/dashboard', baseUrl));
}
