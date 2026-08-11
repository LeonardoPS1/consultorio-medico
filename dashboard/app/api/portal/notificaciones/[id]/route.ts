/**
 * PATCH /api/portal/notificaciones/[id] — Marca como leída
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal-auth';
import { marcarLeida } from '@/lib/services/portal-notificaciones';

/**
 *
 * @param _request
 * @param root0
 * @param root0.params
 */
export async function PATCH(_request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const { id } = await paramsPromise;
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  await marcarLeida(id, session.pacienteId);
  return NextResponse.json({ success: true });
}
