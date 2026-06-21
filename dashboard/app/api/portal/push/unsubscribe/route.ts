/**
 * POST /api/portal/push/unsubscribe — Desuscribe al paciente de notificaciones push
 * Protegido: requiere cookie portal_session
 */
import { NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal-auth';
import { pushService } from '@/lib/services/push';

export async function POST(req: Request) {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { endpoint } = body;

    if (!endpoint) {
      // Desuscribir todas
      await pushService.unsubscribeAll({ pacienteId: session.pacienteId });
      return NextResponse.json({ success: true, all: true });
    }

    await pushService.unsubscribe(endpoint, { pacienteId: session.pacienteId });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al desuscribir' },
      { status: 400 },
    );
  }
}
