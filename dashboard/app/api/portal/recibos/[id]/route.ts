/**
 * GET /api/portal/recibos/[id] — Genera recibo digital de un turno pagado
 * Protegido: requiere cookie portal_session
 * El [id] corresponde al turnoId (se busca el pago asociado)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal-auth';
import { getReciboData, generarHTMLRecibo } from '@/lib/services/portal-recibos';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const turnoId = params.id;

  const data = await getReciboData(turnoId, session.pacienteId);
  if (!data) {
    return NextResponse.json(
      { error: 'Recibo no encontrado o pago no completado' },
      { status: 404 },
    );
  }

  const html = generarHTMLRecibo(data);

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
}
