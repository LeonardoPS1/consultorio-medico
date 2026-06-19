import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { bulkWhatsApp } from '@/lib/services/bulk-operations';
import { safeWarn } from '@/lib/logger';

const BULK_MAX = 100;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { pacienteIds, mensaje } = body;

    if (!Array.isArray(pacienteIds) || pacienteIds.length === 0) {
      return NextResponse.json({ error: 'pacienteIds es requerido (array no vacío)' }, { status: 400 });
    }
    if (!mensaje || typeof mensaje !== 'string') {
      return NextResponse.json({ error: 'mensaje es requerido' }, { status: 400 });
    }
    if (pacienteIds.length > BULK_MAX) {
      return NextResponse.json(
        { error: `Máximo ${BULK_MAX} pacientes por lote` },
        { status: 400 },
      );
    }

    const sucursalId = (session.user as Record<string, unknown>)?.sucursalId as string | undefined;
    const result = await bulkWhatsApp(pacienteIds, mensaje, sucursalId);

    return NextResponse.json({ data: result });
  } catch (err) {
    safeWarn('[BulkWhatsApp API] Error:', err instanceof Error ? { message: err.message } : err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
