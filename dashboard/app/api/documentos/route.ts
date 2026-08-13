import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { documentosService } from '@/lib/services/documentos';

/**
 * Obtiene los documentos pendientes de revisión del tenant.
 * @param {NextRequest} request - La solicitud HTTP entrante.
 * @returns {Promise<NextResponse>} La respuesta JSON con los documentos.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const tenantId = request.headers.get('x-tenant-id') || '00000000-0000-0000-0000-000000000000';
    const medicoId = (session.user as Record<string, unknown>)?.medicoId as string | undefined;

    const { searchParams } = new URL(request.url);
    const pacienteId = searchParams.get('pacienteId');

    let docs;
    if (pacienteId) {
      docs = await documentosService.listarPorPaciente(pacienteId);
    } else {
      docs = await documentosService.listarPendientes(tenantId, medicoId);
    }
    return NextResponse.json(docs);
  } catch (error) {
    console.error('[API] Error GET documentos pendientes:', error);
    return NextResponse.json({ error: 'Error al obtener documentos' }, { status: 500 });
  }
}
