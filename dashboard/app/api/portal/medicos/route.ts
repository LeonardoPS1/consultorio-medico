/**
 * GET /api/portal/medicos — Médicos disponibles para agendar
 *
 * Público (requiere sesión de portal). Devuelve médicos activos
 * con sus servicios y precios.
 */

import { NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal-auth';
import { medicosDisponiblesPortal } from '@/lib/services/portal-booking';

export async function GET() {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const medicos = await medicosDisponiblesPortal();
  return NextResponse.json({ data: medicos });
}
