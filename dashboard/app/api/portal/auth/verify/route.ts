/**
 * GET /api/portal/auth/verify?token=xxx — Verificar magic link
 *
 * Valida el token, setea cookie de sesión, redirige al dashboard.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyMagicToken, setPortalSessionCookie } from '@/lib/portal-auth';

export async function GET(request: NextRequest) {
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
