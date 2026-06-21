/**
 * GET /api/portal/medicos/[medicoId]/slots?fecha=YYYY-MM-DD&servicioId=xxx
 *
 * Público (requiere sesión de portal). Devuelve slots disponibles
 * para un médico en una fecha específica.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal-auth';
import { slotsDisponibles } from '@/lib/services/portal-booking';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ medicoId: string }> },
) {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { medicoId } = await params;
  const { searchParams } = new URL(request.url);
  const fecha = searchParams.get('fecha');
  const servicioId = searchParams.get('servicioId');

  if (!fecha || !servicioId) {
    return NextResponse.json(
      { error: 'fecha y servicioId son requeridos' },
      { status: 400 },
    );
  }

  const slots = await slotsDisponibles(medicoId, fecha, servicioId);
  return NextResponse.json({ data: slots });
}
