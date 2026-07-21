import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { documentosService } from '@/lib/services/documentos';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { accion, datosEditados } = body;

    if (!accion || !['aprobar', 'rechazar', 'editar'].includes(accion)) {
      return NextResponse.json(
        { error: 'accion requerida: aprobar|rechazar|editar' },
        { status: 400 },
      );
    }

    const medicoId = (session.user as Record<string, unknown>)?.medicoId as string;
    if (!medicoId) {
      return NextResponse.json({ error: 'Médico no encontrado en la sesión' }, { status: 400 });
    }

    const doc = await documentosService.revisar({
      notaId: id,
      accion,
      datosEditados: datosEditados || undefined,
      medicoId,
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
