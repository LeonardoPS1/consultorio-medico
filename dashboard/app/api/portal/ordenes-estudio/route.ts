/**
 * GET /api/portal/ordenes-estudio — Lista órdenes de estudio del paciente
 * Protegido: requiere cookie portal_session
 */
import { NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal-auth';
import { ordenesEstudioService } from '@/lib/services/ordenes-estudio';

export async function GET() {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { data } = await ordenesEstudioService.list({ pacienteId: session.pacienteId });
  return NextResponse.json(data);
}
