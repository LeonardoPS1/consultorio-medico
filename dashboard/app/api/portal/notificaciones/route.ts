/**
 * GET /api/portal/notificaciones — Lista notificaciones del paciente
 * GET /api/portal/notificaciones?count=true — Solo cuenta no leídas
 * PATCH /api/portal/notificaciones — Marca todas como leídas
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal-auth';
import {
  listarNotificaciones,
  noLeidasCount,
  marcarTodasLeidas,
} from '@/lib/services/portal-notificaciones';

export async function GET(request: NextRequest) {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  // ?count=true → solo devuelve el conteo
  if (searchParams.get('count') === 'true') {
    const count = await noLeidasCount(session.pacienteId);
    return NextResponse.json({ count });
  }

  const notificaciones = await listarNotificaciones(session.pacienteId);
  return NextResponse.json({ data: notificaciones });
}

export async function PATCH(request: NextRequest) {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));

  // Si viene id, marcar una específica
  if (body.id) {
    const { marcarLeida } = await import('@/lib/services/portal-notificaciones');
    await marcarLeida(body.id, session.pacienteId);
    return NextResponse.json({ success: true });
  }

  // Si no, marcar todas como leídas
  await marcarTodasLeidas(session.pacienteId);
  return NextResponse.json({ success: true });
}
