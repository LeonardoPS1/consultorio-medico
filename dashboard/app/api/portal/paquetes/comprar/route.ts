/**
 * POST /api/portal/paquetes/comprar — Inicia compra de un paquete de turnos
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession, validateCSRFOrigin } from '@/lib/portal-auth';
import { comprarPaquete } from '@/lib/services/portal-paquetes';

export async function POST(request: NextRequest) {
  if (!validateCSRFOrigin(request)) {
    return NextResponse.json({ error: 'Origen no válido' }, { status: 403 });
  }
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { paqueteId } = body;

    if (!paqueteId) {
      return NextResponse.json({ error: 'paqueteId requerido' }, { status: 400 });
    }

    const result = await comprarPaquete(session.pacienteId, paqueteId);

    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al procesar compra';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
