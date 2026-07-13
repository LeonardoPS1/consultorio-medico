/**
 * GET /api/portal/ordenes-estudio/[id] — Ver orden de estudio
 * Protegido: requiere cookie portal_session
 */
import { NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal-auth';
import { ordenesEstudioService } from '@/lib/services/ordenes-estudio';

export async function GET(_req: Request, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const { id } = await paramsPromise;
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const orden = await ordenesEstudioService.getById(id);

  // Verificar que pertenece al paciente
  if (orden.pacienteId !== session.pacienteId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  return NextResponse.json(orden);
}
