/**
 * GET /api/turnos/day-view — Datos para la Vista Citas del Día
 * Retorna médicos con horarios + turnos posicionados por médico
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api-handler';
import { turnosService } from '@/lib/services/turnos';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const GET = apiHandler(async (request: NextRequest) => {
  const session = await auth();
  const sessionMedicoId = session?.user?.medicoId;
  const sessionRol = session?.user?.role;

  const { searchParams } = new URL(request.url);
  const fecha = searchParams.get('fecha');
  if (!fecha) {
    return NextResponse.json({ error: 'Parámetro fecha es requerido (YYYY-MM-DD)' }, { status: 400 });
  }
  const sucursalId = searchParams.get('sucursalId') || undefined;

  // Si el usuario es médico, solo ve su columna
  const medicoIdFilter = sessionRol === 'medico' ? sessionMedicoId : undefined;

  const data = await turnosService.dayView(fecha, sucursalId, medicoIdFilter);
  return NextResponse.json(data);
});
