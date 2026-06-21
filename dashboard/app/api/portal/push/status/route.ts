/**
 * GET /api/portal/push/status — Estado de suscripciones push del paciente
 * Protegido: requiere cookie portal_session
 */
import { NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal-auth';
import { pushService } from '@/lib/services/push';

export async function GET() {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const subs = await pushService.getSubscriptions({ pacienteId: session.pacienteId });
  const publicKey = pushService.getPublicKey();

  return NextResponse.json({
    subscribed: subs.length > 0,
    count: subs.length,
    publicKey,
  });
}
