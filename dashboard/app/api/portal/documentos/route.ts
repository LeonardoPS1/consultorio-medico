import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { pacientes } from '@/drizzle/core';
import { sucursales } from '@/drizzle/tenant';
import { db } from '@/lib/db';
import { safeError } from '@/lib/logger';
import { getPortalSession } from '@/lib/portal-auth';
import { documentosService, type DocumentoInput } from '@/lib/services/documentos';

/**
 *
 * @param request
 */
export async function POST(request: NextRequest) {
  try {
    const portalSession = await getPortalSession();
    if (!portalSession?.pacienteId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = (await request.json()) as { url?: string; tipo?: string };
    const { url, tipo } = body;

    if (!url || !tipo) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: url, tipo' },
        { status: 400 },
      );
    }

    // Obtener tenantId del paciente vía sucursal
    const [pacienteData] = await db
      .select({ tenantId: sucursales.tenantId })
      .from(pacientes)
      .innerJoin(sucursales, eq(pacientes.sucursalId, sucursales.id))
      .where(eq(pacientes.id, portalSession.pacienteId))
      .limit(1);

    const tenantId = pacienteData?.tenantId || '00000000-0000-0000-0000-000000000000';

    const doc = await documentosService.crear({
      pacienteId: portalSession.pacienteId,
      tipo: tipo as DocumentoInput['tipo'],
      archivoUrl: url,
      tenantId,
    });

    // OCR en background — no bloqueamos la respuesta
    documentosService.procesarOcr(doc.id).catch((err) => {
      safeError('[Documentos] Error OCR background:', err);
    });

    return NextResponse.json({ documento: doc });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    safeError('[Documentos] Error POST:', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 *
 * @param _request
 */
export async function GET(_request: NextRequest) {
  try {
    const portalSession = await getPortalSession();
    if (!portalSession?.pacienteId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const docs = await documentosService.listarPorPaciente(portalSession.pacienteId);
    return NextResponse.json({ documentos: docs });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    safeError('[Documentos] Error GET:', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
