import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { recetasService } from '@/lib/services/recetas';

/**
 * GET /api/pacientes/exportar?formato=excel|pdf
 *
 * Exporta pacientes en formato Excel (.xlsx) o PDF (HTML imprimible).
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

    const data = await recetasService.getPacientesForExport({
      medicoId: isMedico ? sessionMedicoId : null,
    });

    if (data.length === 0) {
      return NextResponse.json(
        { error: 'No hay pacientes para exportar' },
        { status: 404 },
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const XLSX = require('xlsx');

    const fecha = new Date().toISOString().split('T')[0];
    const filename = `pacientes-${fecha}`;

    if (formato === 'excel') {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);

      const colWidths = Object.keys(data[0] || {}).map((key: string) => ({
        wch: Math.max(
          key.length,
          ...data.map((r: Record<string, any>) => String(r[key] || '').length),
        ) + 2,
      }));
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, 'Pacientes');

      const buffer = XLSX.write(wb, {
        type: 'buffer',
        bookType: 'xlsx',
      }) as Buffer;

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

    // PDF - HTML imprimible
    const nombreOrg =
      process.env.ORGANIZATION_NAME || 'Consultorio Médico';
    const fechaActual = new Date().toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const filas = data
      .map(
        (r: any, i: number) => `
      <tr>
        <td>${i + 1}</td>
        <td>${r.Nombre}</td>
        <td>${r.Teléfono}</td>
        <td>${r.Email}</td>
        <td>${r['Obra Social']}</td>
        <td>${r['Total Turnos']}</td>
        <td>${r['Último Turno']}</td>
      </tr>`,
      )
      .join('');

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Pacientes - ${nombreOrg}</title>
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
    <p>Reporte de Pacientes — ${fechaActual}</p>
    <p>Total: ${data.length} pacientes</p>
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Nombre</th>
        <th>Teléfono</th>
        <th>Email</th>
        <th>Obra Social</th>
        <th>Turnos</th>
        <th>Último Turno</th>
      </tr>
    </thead>
    <tbody>
      ${filas}
    </tbody>
  </table>
  <div class="footer"><strong>${nombreOrg}</strong> &nbsp;·&nbsp; Generado el ${fechaActual}</div>
  <div class="print-btn">
    <button onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>
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
    console.error('[API] Error GET /api/pacientes/exportar:', error);
    return NextResponse.json(
      { error: 'Error al exportar pacientes' },
      { status: 500 },
    );
  }
}
