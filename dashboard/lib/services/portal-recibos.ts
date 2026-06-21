/**
 * Recibo digital / boleta para pagos de turnos desde el portal.
 */

import { db } from '@/lib/db';
import { portalPagos, turnos, medicos, pacientes } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { escapeHtml } from '@/lib/html-utils';

export interface ReciboData {
  pagoId: string;
  turnoId: string;
  pacienteNombre: string;
  pacienteRut?: string | null;
  medicoNombre: string;
  medicoEspecialidad: string;
  servicioNombre: string;
  fechaHora: Date;
  monto: string;
  moneda: string;
  metodoPago: string;
  pagadoAt: Date;
  mercadopagoPaymentId: string | null;
}

/**
 * Obtiene datos de un recibo por turnoId.
 * Verifica que el pago esté completado.
 */
export async function getReciboData(
  turnoId: string,
  pacienteId: string,
): Promise<ReciboData | null> {
  const [pago] = await db
    .select({
      pagoId: portalPagos.id,
      turnoId: portalPagos.turnoId,
      monto: portalPagos.monto,
      moneda: portalPagos.moneda,
      metodoPago: portalPagos.metodoPago,
      estado: portalPagos.estado,
      pagadoAt: portalPagos.pagadoAt,
      mercadopagoPaymentId: portalPagos.mercadopagoPaymentId,
      fechaHora: turnos.fechaHora,
      duracionMinutos: turnos.duracionMinutos,
      motivo: turnos.motivo,
      medicoNombre: medicos.nombre,
      medicoEspecialidad: medicos.especialidad,
      pacienteNombre: pacientes.nombre,
      pacienteRut: pacientes.rut,
    })
    .from(portalPagos)
    .innerJoin(turnos, eq(portalPagos.turnoId, turnos.id))
    .innerJoin(medicos, eq(turnos.medicoId, medicos.id))
    .innerJoin(pacientes, eq(portalPagos.pacienteId, pacientes.id))
    .where(
      and(
        eq(portalPagos.turnoId, turnoId),
        eq(portalPagos.pacienteId, pacienteId),
        eq(portalPagos.estado, 'completado'),
      ),
    )
    .limit(1);

  if (!pago || !pago.pagadoAt) return null;

  return {
    pagoId: pago.pagoId,
    turnoId: pago.turnoId,
    pacienteNombre: pago.pacienteNombre,
    pacienteRut: pago.pacienteRut,
    medicoNombre: pago.medicoNombre,
    medicoEspecialidad: pago.medicoEspecialidad,
    servicioNombre: pago.motivo || pago.medicoEspecialidad,
    fechaHora: pago.fechaHora,
    monto: pago.monto,
    moneda: pago.moneda,
    metodoPago: pago.metodoPago,
    pagadoAt: pago.pagadoAt,
    mercadopagoPaymentId: pago.mercadopagoPaymentId,
  };
}

/**
 * Genera HTML full para visualización/impresión del recibo.
 */
export function generarHTMLRecibo(data: ReciboData): string {
  const orgName = process.env.ORGANIZATION_NAME || 'Consultorio Médico';
  const orgRut = process.env.ORGANIZATION_RUT || '76.123.456-7';
  const orgAddress = process.env.ORGANIZATION_ADDRESS || 'Av. Providencia 1234, Santiago';

  const formatCLP = (monto: string) =>
    Number(monto).toLocaleString('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 });

  const formatFecha = (d: Date) =>
    d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const formatFechaCorta = (d: Date) =>
    d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });

  const hora = data.fechaHora.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  const metodoPagoLabel = data.metodoPago === 'mercadopago' ? 'MercadoPago (Tarjeta)' : data.metodoPago;

  const simboloMoneda = data.moneda === 'CLP' ? '$' : data.moneda;

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Recibo - ${orgName}</title>
<style>
  @page { margin: 15mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica', 'Arial', sans-serif; color: #1a1a1a; font-size: 13px; line-height: 1.5; }
  .container { max-width: 700px; margin: 0 auto; padding: 20px; }

  .header { text-align: center; padding-bottom: 20px; border-bottom: 3px solid #2563eb; margin-bottom: 25px; }
  .header h1 { font-size: 24px; color: #2563eb; margin-bottom: 4px; }
  .header p { font-size: 12px; color: #666; margin: 2px 0; }
  .header .folio { font-size: 11px; color: #999; margin-top: 6px; }

  .section { margin-bottom: 20px; }
  .section h2 { font-size: 14px; color: #2563eb; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; padding-bottom: 4px; border-bottom: 1px solid #e5e5e5; }

  .row { display: flex; justify-content: space-between; padding: 4px 0; }
  .row .label { color: #666; min-width: 140px; }
  .row .value { flex: 1; text-align: right; font-weight: 500; }

  .total-row { display: flex; justify-content: space-between; padding: 10px 0; border-top: 2px solid #2563eb; margin-top: 10px; font-size: 16px; font-weight: bold; }
  .total-row .label { color: #2563eb; }
  .total-row .value { color: #2563eb; }

  .status-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; background: #dcfce7; color: #166534; }

  .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; text-align: center; font-size: 10px; color: #999; }
  .footer p { margin: 2px 0; }

  .print-btn { text-align: center; margin-top: 25px; }
  .print-btn button { padding: 12px 36px; background: #2563eb; color: white; border: none; border-radius: 8px; font-size: 15px; cursor: pointer; transition: background 0.2s; }
  .print-btn button:hover { background: #1d4ed8; }
  @media print { .print-btn { display: none; } }
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${escapeHtml(orgName)}</h1>
      <p>${escapeHtml(orgAddress)}</p>
      <p>RUT: ${escapeHtml(orgRut)}</p>
      <div class="folio">Recibo N° ${escapeHtml(data.pagoId.slice(0, 8).toUpperCase())}</div>
    </div>

    <div class="section">
      <h2>Paciente</h2>
      <div class="row"><span class="label">Nombre</span><span class="value">${escapeHtml(data.pacienteNombre)}</span></div>
      ${data.pacienteRut ? `<div class="row"><span class="label">RUT</span><span class="value">${escapeHtml(data.pacienteRut)}</span></div>` : ''}
    </div>

    <div class="section">
      <h2>Atención</h2>
      <div class="row"><span class="label">Profesional</span><span class="value">${escapeHtml(data.medicoNombre)}</span></div>
      <div class="row"><span class="label">Especialidad</span><span class="value">${escapeHtml(data.medicoEspecialidad)}</span></div>
      <div class="row"><span class="label">Fecha</span><span class="value">${escapeHtml(formatFechaCorta(data.fechaHora))}</span></div>
      <div class="row"><span class="label">Hora</span><span class="value">${escapeHtml(hora)}</span></div>
      <div class="row"><span class="label">Motivo</span><span class="value">${escapeHtml(data.servicioNombre)}</span></div>
    </div>

    <div class="section">
      <h2>Pago</h2>
      <div class="row"><span class="label">Método de pago</span><span class="value">${escapeHtml(metodoPagoLabel)}</span></div>
      <div class="row"><span class="label">Pagado el</span><span class="value">${escapeHtml(formatFecha(data.pagadoAt))}</span></div>
      ${data.mercadopagoPaymentId ? `<div class="row"><span class="label">ID Transacción</span><span class="value" style="font-size:11px;font-family:monospace">${escapeHtml(data.mercadopagoPaymentId)}</span></div>` : ''}
      <div class="row"><span class="label">Estado</span><span class="value"><span class="status-badge">Pagado</span></span></div>
      <div class="total-row">
        <span class="label">Total</span>
        <span class="value">${simboloMoneda} ${formatCLP(data.monto)}</span>
      </div>
    </div>

    <div class="footer">
      <p><strong>${escapeHtml(orgName)}</strong> &nbsp;·&nbsp; ${escapeHtml(orgAddress)}</p>
      <p>RUT: ${escapeHtml(orgRut)} &nbsp;·&nbsp; Documento generado el ${escapeHtml(formatFecha(new Date()))}</p>
      <p style="margin-top:4px;font-style:italic">Este recibo es válido como comprobante de pago.</p>
    </div>

    <div class="print-btn">
      <button onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>
      <p style="font-size:11px;color:#888;margin-top:8px;">Seleccioná "Guardar como PDF" en el diálogo de impresión</p>
    </div>
  </div>
</body>
</html>`;
}
