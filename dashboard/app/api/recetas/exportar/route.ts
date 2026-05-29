import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { recetasService } from '@/lib/services/recetas';

/**
 * GET /api/recetas/exportar?formato=excel|pdf&estado=activa
 *
 * Exporta recetas en formato Excel (.xlsx) o PDF (HTML imprimible).
 * Requiere autenticación.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const sessionMedicoId = (session.user as any)?.medicoId;
    const sessionRol = (session.user as any)?.role;
    const isMedico = sessionRol === 'medico' && !!sessionMedicoId;

    const { searchParams } = new URL(request.url);
    const formato = searchParams.get('formato') || 'excel';
    const estado = searchParams.get('estado') || undefined;

    const data = await recetasService.getForExport({
      estado,
      medicoId: isMedico ? sessionMedicoId : null,
    });

    if (data.length === 0) {
      return NextResponse.json(
        { error: 'No hay recetas para exportar' },
        { status: 404 },
      );
    }

    const fecha = new Date().toISOString().split('T')[0];
    const estadoLabel = estado || 'todas';
    const filename = `recetas-${estadoLabel}-${fecha}`;

    if (formato === 'excel') {
      const buffer = recetasService.generarExcel(data);

      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type':
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
          'Content-Length': String(buffer.length),
        },
      });
    }

    // PDF (HTML imprimible)
    const html = recetasService.generarHTMLPDF(
      data,
      `Recetas ${estadoLabel === 'todas' ? '' : `- ${estadoLabel}`}`,
    );

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="${filename}.html"`,
      },
    });
  } catch (error) {
    console.error('[API] Error GET /api/recetas/exportar:', error);
    return NextResponse.json(
      { error: 'Error al exportar recetas' },
      { status: 500 },
    );
  }
}
