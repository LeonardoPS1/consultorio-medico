import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal-auth';
import { documentosService } from '@/lib/services/documentos';
import { db } from '@/lib/db';
import { documentosMedicos } from '@/drizzle/medical';
import { eq } from 'drizzle-orm';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const portalSession = await getPortalSession();
    if (!portalSession?.pacienteId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { accion } = body;

    const doc = await db
      .select()
      .from(documentosMedicos)
      .where(eq(documentosMedicos.id, id))
      .then((r) => r[0]);

    if (!doc || doc.pacienteId !== portalSession.pacienteId) {
      return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 });
    }

    if (accion === 'confirmar') {
      const result = await documentosService.confirmar(id);
      return NextResponse.json({ documento: result });
    }

    if (accion === 'eliminar') {
      await db.delete(documentosMedicos).where(eq(documentosMedicos.id, id));
      return NextResponse.json({ exito: true });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
