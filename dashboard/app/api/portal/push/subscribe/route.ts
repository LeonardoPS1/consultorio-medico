/**
 * POST /api/portal/push/subscribe — Suscribe al paciente a notificaciones push
 * Protegido: requiere cookie portal_session
 */
import { NextResponse } from 'next/server';
import { getPortalSession, validateCSRFOrigin } from '@/lib/portal-auth';
import { pushService } from '@/lib/services/push';

export async function POST(req: Request) {
  if (!validateCSRFOrigin(req)) {
    return NextResponse.json({ error: 'Origen no válido' }, { status: 403 });
  }
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { subscription, userAgent } = body;

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Suscripción inválida' }, { status: 400 });
    }

    const result = await pushService.subscribe(subscription, userAgent, {
      pacienteId: session.pacienteId,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al suscribir' },
      { status: 400 },
    );
  }
}
