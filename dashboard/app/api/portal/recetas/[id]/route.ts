/**
 * GET /api/portal/recetas/[id] — Genera PDF imprimible de una receta
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal-auth';
import { db } from '@/lib/db';
import { recetas, medicos, pacientes } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { escapeHtml } from '@/lib/html-utils';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const [receta] = await db
    .select({
      id: recetas.id,
      medicamento: recetas.medicamento,
      dosis: recetas.dosis,
      frecuencia: recetas.frecuencia,
      duracion: recetas.duracion,
      indicaciones: recetas.indicaciones,
      fechaInicio: recetas.fechaInicio,
      fechaFin: recetas.fechaFin,
      hashVerificacion: recetas.hashVerificacion,
      medicoNombre: medicos.nombre,
      medicoEspecialidad: medicos.especialidad,
      medicoRut: medicos.rut,
      pacienteNombre: pacientes.nombre,
      pacienteRut: pacientes.rut,
    })
    .from(recetas)
    .leftJoin(medicos, eq(recetas.medicoId, medicos.id))
    .leftJoin(pacientes, eq(recetas.pacienteId, pacientes.id))
    .where(
      and(eq(recetas.id, params.id), eq(recetas.pacienteId, session.pacienteId)),
    )
    .limit(1);

  if (!receta) {
    return NextResponse.json({ error: 'Receta no encontrada' }, { status: 404 });
  }

  const orgName = process.env.ORGANIZATION_NAME || 'Consultorio Médico';
  const orgRut = process.env.ORGANIZATION_RUT || '76.123.456-7';

  const formatFecha = (d: string | Date | null) =>
    d ? new Date(d).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

  const h = (s: string | null) => escapeHtml(s ?? '');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Receta - ${h(receta.medicamento)}</title>
<style>
  @page { margin: 20mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Arial', sans-serif; color: #1a1a1a; font-size: 13px; line-height: 1.6; }
  .container { max-width: 700px; margin: 40px auto; padding: 30px; border: 2px solid #2563eb; border-radius: 12px; }
  .header { text-align: center; padding-bottom: 20px; border-bottom: 2px solid #2563eb; margin-bottom: 25px; }
  .header h1 { font-size: 22px; color: #2563eb; margin-bottom: 4px; }
  .header p { font-size: 12px; color: #666; margin: 2px 0; }
  .receta-title { font-size: 18px; text-align: center; margin: 20px 0; color: #1f2937; text-decoration: underline; }
  .section { margin-bottom: 20px; }
  .section h2 { font-size: 14px; color: #2563eb; border-bottom: 1px solid #e5e5e5; padding-bottom: 4px; margin-bottom: 10px; }
  .row { display: flex; padding: 3px 0; }
  .row .label { color: #666; min-width: 120px; }
  .row .value { font-weight: 500; }
  .indicaciones { background: #f9fafb; padding: 12px; border-radius: 8px; margin-top: 10px; white-space: pre-wrap; }
  .hash { font-family: monospace; font-size: 10px; color: #999; text-align: center; margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd; }
  .footer { text-align: center; font-size: 10px; color: #999; margin-top: 15px; }
  .print-btn { text-align: center; margin-top: 25px; }
  .print-btn button { padding: 12px 36px; background: #2563eb; color: white; border: none; border-radius: 8px; font-size: 15px; cursor: pointer; }
  @media print { .print-btn { display: none; } body { margin: 0; } .container { border: none; } }
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${h(orgName)}</h1>
      <p>RUT: ${h(orgRut)}</p>
    </div>

    <div class="receta-title">RECETA MÉDICA</div>

    <div class="section">
      <h2>Datos del Paciente</h2>
      <div class="row"><span class="label">Nombre</span><span class="value">${h(receta.pacienteNombre)}</span></div>
      <div class="row"><span class="label">RUT</span><span class="value">${h(receta.pacienteRut || '—')}</span></div>
    </div>

    <div class="section">
      <h2>Datos del Médico</h2>
      <div class="row"><span class="label">Profesional</span><span class="value">${h(receta.medicoNombre)}</span></div>
      <div class="row"><span class="label">Especialidad</span><span class="value">${h(receta.medicoEspecialidad)}</span></div>
      <div class="row"><span class="label">RUT</span><span class="value">${h(receta.medicoRut || '—')}</span></div>
    </div>

    <div class="section">
      <h2>Medicamento</h2>
      <div class="row"><span class="label">Medicamento</span><span class="value"><strong>${h(receta.medicamento)}</strong></span></div>
      <div class="row"><span class="label">Dosis</span><span class="value">${h(receta.dosis)}</span></div>
      <div class="row"><span class="label">Frecuencia</span><span class="value">${h(receta.frecuencia)}</span></div>
      <div class="row"><span class="label">Duración</span><span class="value">${h(receta.duracion)}</span></div>
      <div class="row"><span class="label">Inicio</span><span class="value">${formatFecha(receta.fechaInicio)}</span></div>
      <div class="row"><span class="label">Fin</span><span class="value">${formatFecha(receta.fechaFin)}</span></div>
    </div>

    ${receta.indicaciones ? `
    <div class="section">
      <h2>Indicaciones</h2>
      <div class="indicaciones">${h(receta.indicaciones)}</div>
    </div>` : ''}

    ${receta.hashVerificacion ? `
    <div class="hash">
      Código de verificación: <strong>${h(receta.hashVerificacion)}</strong><br>
      Verifique en: ${h(process.env.NEXT_PUBLIC_APP_URL || '')}/verificar-receta
    </div>` : ''}

    <div class="footer">
      Documento generado el ${new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
    </div>
  </div>

  <div class="print-btn">
    <button onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>
    <p style="font-size:11px;color:#888;margin-top:8px;">Seleccioná "Guardar como PDF" en el diálogo de impresión</p>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
}
