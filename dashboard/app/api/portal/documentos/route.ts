import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal-auth';
import { documentosService } from '@/lib/services/documentos';

export async function POST(request: NextRequest) {
  try {
    const portalSession = await getPortalSession();
    if (!portalSession?.pacienteId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { url, filename, tipo, titulo, descripcion } = body;

    if (!url || !tipo) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: url, tipo' },
        { status: 400 },
      );
    }

    const doc = await documentosService.crear({
      pacienteId: portalSession.pacienteId,
      tipo,
      archivoUrl: url,
      tenantId: '00000000-0000-0000-0000-000000000000',
    });

    const resultado = await documentosService.procesarOcr(doc.id);

    return NextResponse.json({ documento: resultado });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const portalSession = await getPortalSession();
    if (!portalSession?.pacienteId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const docs = await documentosService.listarPorPaciente(portalSession.pacienteId);
    return NextResponse.json({ documentos: docs });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
