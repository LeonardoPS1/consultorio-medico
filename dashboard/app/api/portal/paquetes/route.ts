/**
 * GET /api/portal/paquetes — Lista paquetes disponibles + suscripciones activas del paciente
 */

import { NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal-auth';
import { listarPaquetesActivos, getSuscripcionesPaciente } from '@/lib/services/portal-paquetes';

export async function GET() {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const [paquetes, suscripciones] = await Promise.all([
    listarPaquetesActivos(),
    getSuscripcionesPaciente(session.pacienteId),
  ]);

  const totalRestantes = suscripciones.reduce((sum, s) => sum + s.turnosRestantes, 0);

  return NextResponse.json({
    paquetes,
    suscripciones,
    totalRestantes,
  });
}
