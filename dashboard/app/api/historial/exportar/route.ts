import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { canAccess } from '@/lib/features';
import { listarHistorial, toCsv } from '@/lib/services/historial';

/**
 * GET /api/historial/exportar?formato=csv|excel|pdf&search=&tipo=&origen=&from=&to=&pacienteId=
 *
 * Exporta el historial clínico (historial_medico + notas_soap) con los mismos
 * filtros que la vista. Feature gate: `reportes-avanzados` (Professional+).
 * @param request
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!canAccess(session.user.plan, 'reportes-avanzados')) {
      return NextResponse.json(
        { error: 'Tu plan no incluye la exportación avanzada. Actualizá a Professional.' },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const formato = searchParams.get('formato') || 'csv';
    const search = searchParams.get('search') || '';
    const tipo = searchParams.get('tipo') || '';
    const origen = (searchParams.get('origen') || '') as '' | 'historial' | 'soap';
    const from = searchParams.get('from') || '';
    const to = searchParams.get('to') || '';
    const pacienteId = searchParams.get('pacienteId') || '';

    // Exporta todo lo que matchee (sin paginar; tope defensivo en el service 200/consulta)
    const res = await listarHistorial({
      search,
      tipo,
      origen,
      from,
      to,
      pacienteId,
      page: 1,
      limit: 200,
    });

    // Ordenar por fecha asc para exportación, desc es el default del listing
    const items = [...res.data].sort((a, b) =>
      a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0,
    );

    if (items.length === 0) {
      return NextResponse.json(
        { error: 'No hay registros para exportar con los filtros actuales' },
        { status: 404 },
      );
    }

    const fecha = new Date().toISOString().split('T')[0];
    const filename = `historial-clinico-${fecha}`;

    if (formato === 'csv') {
      const csv = toCsv(
        items.map((i) => ({
          ...i,
          titulo: i.origen === 'soap' ? 'Nota SOAP' : i.titulo,
        })),
      );
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}.csv"`,
        },
      });
    }

    if (formato === 'excel') {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const XLSX = require('xlsx');
      const rows = items.map((i) => ({
        Origen: i.origen === 'soap' ? 'Nota SOAP' : 'Historial',
        Fecha: i.fecha ? new Date(i.fecha).toLocaleString('es-CL') : '',
        Paciente: i.pacienteNombre,
        Teléfono: i.pacienteTelefono,
        Tipo: i.origen === 'soap' ? 'Evolución' : i.tipo,
        Título: i.origen === 'soap' ? 'Nota SOAP' : i.titulo,
        Diagnóstico: i.diagnosticoCodigo
          ? `${i.diagnosticoCodigo} - ${i.diagnosticoDescripcion ?? ''}`.trim()
          : '',
      }));
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Historial');
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
          'Content-Length': String(buffer.length),
        },
      });
    }

    // PDF - HTML imprimible
    const nombreOrg = process.env.ORGANIZATION_NAME || 'Consultorio Médico';
    const fechaActual = new Date().toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const filas = items
      .map(
        (i, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${i.fecha ? new Date(i.fecha).toLocaleString('es-CL') : ''}</td>
        <td>${i.pacienteNombre}</td>
        <td>${i.origen === 'soap' ? 'Evolución' : i.tipo}</td>
        <td>${i.origen === 'soap' ? 'Nota SOAP' : i.titulo}</td>
        <td>${i.diagnosticoCodigo || ''}</td>
      </tr>`,
      )
      .join('');

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Historial Clínico - ${nombreOrg}</title>
<style>
  @page { margin: 20mm; size: A4 landscape; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Arial', sans-serif; color: #1a1a1a; font-size: 11px; }
  .header { text-align: center; padding-bottom: 15px; border-bottom: 2px solid #2563eb; margin-bottom: 20px; }
  .header h1 { font-size: 22px; color: #2563eb; }
  .header p { font-size: 12px; color: #666; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #2563eb; color: white; padding: 8px 6px; text-align: left; font-size: 10px; text-transform: uppercase; }
  td { padding: 6px; border-bottom: 1px solid #e5e5e5; }
  tr:nth-child(even) { background: #f9fafb; }
  .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; text-align: center; font-size: 10px; color: #999; }
  .print-btn { text-align: center; margin-top: 20px; }
  .print-btn button { padding: 10px 30px; background: #2563eb; color: white; border: none; border-radius: 6px; font-size: 14px; cursor: pointer; }
  @media print { .print-btn { display: none; } }
</style>
</head>
<body>
  <div class="header">
    <h1>${nombreOrg}</h1>
    <p>Historial Clínico — ${fechaActual}</p>
    <p>Total: ${items.length} registros</p>
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Fecha</th>
        <th>Paciente</th>
        <th>Tipo</th>
        <th>Título</th>
        <th>Diagnóstico</th>
      </tr>
    </thead>
    <tbody>${filas}</tbody>
  </table>
  <div class="footer"><strong>${nombreOrg}</strong> &nbsp;·&nbsp; Generado el ${fechaActual}</div>
  <div class="print-btn">
    <button onclick="window.print()">Imprimir / Guardar PDF</button>
    <p style="font-size:11px;color:#888;margin-top:6px;">Seleccioná "Guardar como PDF" en el diálogo de impresión</p>
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="${filename}.html"`,
      },
    });
  } catch (error) {
    console.error('[API] Error GET /api/historial/exportar:', error);
    return NextResponse.json({ error: 'Error al exportar el historial' }, { status: 500 });
  }
}
