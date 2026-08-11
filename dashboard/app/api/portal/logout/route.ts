/**
 * POST /api/portal/logout — Cerrar sesión del paciente
 * Protegido: requiere cookie portal_session
 */

import { NextResponse } from 'next/server';
import { clearPortalSession, validateCSRFOrigin } from '@/lib/portal-auth';

/**
 *
 * @param req
 */
export async function POST(req: Request) {
  if (!validateCSRFOrigin(req)) {
    return NextResponse.json({ error: 'Origen no válido' }, { status: 403 });
  }
  await clearPortalSession();
  return NextResponse.json({ success: true });
}
