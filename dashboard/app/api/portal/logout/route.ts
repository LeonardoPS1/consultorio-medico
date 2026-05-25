/**
 * POST /api/portal/logout — Cerrar sesión del paciente
 * Protegido: requiere cookie portal_session
 */

import { NextResponse } from 'next/server';
import { clearPortalSession } from '@/lib/portal-auth';

export async function POST() {
  await clearPortalSession();
  return NextResponse.json({ success: true });
}
