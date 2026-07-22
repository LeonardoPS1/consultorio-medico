import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { bulkUpdateTurnoStatus } from '@/lib/services/bulk-operations';
import { safeWarn } from '@/lib/logger';
import { CACHE_TAGS, revalidate } from '@/lib/data-cache';
import { cache } from '@/lib/cache';
import type { TurnoEstado } from '@/lib/services/bulk-operations';

const ESTADOS_VALIDOS: TurnoEstado[] = [
  'pendiente',
  'confirmada',
  'en_atencion',
  'atendido',
  'cancelada',
  'completada',
  'no_asistio',
];

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { turnoIds, estado } = body;

    if (!Array.isArray(turnoIds) || turnoIds.length === 0) {
      return NextResponse.json(
        { error: 'turnoIds es requerido (array no vacío)' },
        { status: 400 },
      );
    }
    if (!turnoIds.every((id: unknown) => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id))) {
      return NextResponse.json({ error: 'IDs de turno inválidos' }, { status: 400 });
    }
    if (!estado || typeof estado !== 'string') {
      return NextResponse.json({ error: 'estado es requerido' }, { status: 400 });
    }
    if (!ESTADOS_VALIDOS.includes(estado as TurnoEstado)) {
      return NextResponse.json(
        { error: `Estado inválido. Válidos: ${ESTADOS_VALIDOS.join(', ')}` },
        { status: 400 },
      );
    }

    const result = await bulkUpdateTurnoStatus(turnoIds, estado as TurnoEstado);

    revalidate([CACHE_TAGS.TURNOS, CACHE_TAGS.PACIENTES, CACHE_TAGS.DASHBOARD_STATS]);
    cache.invalidate('turnos:list:*');

    return NextResponse.json({ data: result });
  } catch (err) {
    safeWarn('[BulkStatus API] Error:', err instanceof Error ? { message: err.message } : err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
