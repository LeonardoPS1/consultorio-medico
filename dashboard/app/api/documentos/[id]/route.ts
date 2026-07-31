import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { documentosService } from '@/lib/services/documentos';

/**
 *
 * @param request
 * @param root0
 * @param root0.params
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { accion, datosEditados, turnoId, motivoRechazo } = body;

    if (!accion || !['aprobar', 'rechazar', 'editar'].includes(accion)) {
      return NextResponse.json(
        { error: 'accion requerida: aprobar|rechazar|editar' },
        { status: 400 },
      );
    }

    const role = (session.user as Record<string, unknown>)?.role as string;
    if (!['admin', 'medico'].includes(role)) {
      return NextResponse.json(
        { error: 'Solo administradores o médicos pueden revisar documentos' },
        { status: 403 },
      );
    }

    const medicoId = (session.user as Record<string, unknown>)?.medicoId as string | undefined;

    const doc = await documentosService.revisar({
      notaId: id,
      accion,
      datosEditados: datosEditados || undefined,
      medicoId,
      turnoId: turnoId || undefined,
      motivoRechazo: motivoRechazo || undefined,
    });

    return NextResponse.json({ success: true, documento: doc });
  } catch (error) {
    console.error('[API] Error PATCH documento:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al revisar documento' },
      { status: 500 },
    );
  }
}
