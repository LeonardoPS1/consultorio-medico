'use client';

import { toast } from '@/components/ui/use-toast';
import { escapeHtml } from '@/lib/html-utils';
import { formatDate } from '@/lib/utils';

// ─── Types ─────────────────────────────────────────────────

/** Estructura mínima de receta necesaria para generar PDF/impresión/WhatsApp. */
export interface RecetaLike {
  id: string;
  paciente: string;
  medicamento: string;
  dosis: string;
  duracion: string;
  vence: string;
  indicaciones?: string;
}

interface OrganizacionInfo {
  nombre?: string;
  direccion?: string;
  ciudad?: string;
  telefono?: string;
  email?: string;
  logoUrl?: string;
  colorPrimario?: string;
}

// ─── Helpers internos ───────────────────────────────────────

async function cargarOrganizacion(): Promise<OrganizacionInfo> {
  try {
    const res = await fetch('/api/organization');
    if (!res.ok) return {};
    const json = await res.json() as { data?: OrganizacionInfo };
    return json.data || {};
  } catch {
    return {};
  }
}

async function generarQrDataUrl(recetaId: string): Promise<string> {
  try {
    const QRCode = await import('qrcode');
    const baseUrl =
      typeof window !== 'undefined'
        ? `${window.location.protocol}//${window.location.host}`
        : 'https://med.aicorebots.com';
    return QRCode.toDataURL(`${baseUrl}/verificar-receta/${recetaId}`, {
      width: 120,
      margin: 2,
      color: { dark: '#1a1a1a', light: '#ffffff' },
    });
  } catch {
    // QR fallback: sin QR si la lib no carga
    return '';
  }
}

// ─── Acciones públicas ──────────────────────────────────────

/**
 * Descarga (abre en pestaña nueva) el PDF de una receta.
 * @param receta
 */
export async function descargarReceta(receta: RecetaLike) {
  const org = await cargarOrganizacion();
  await generarPDFReceta(receta, org);
}

/**
 * Genera el HTML completo de la receta (con QR y datos de la organización).
 * Reutilizable para vista previa, impresión y descarga.
 * @param receta
 * @param org
 */
export async function generarHtmlReceta(receta: RecetaLike, org: OrganizacionInfo = {}) {
  const qrDataUrl = await generarQrDataUrl(receta.id);
  const nombreOrg = org.nombre || 'Consultorio Médico';
  const colorPrimario = org.colorPrimario || '#2563eb';

  const hoy = formatDate(new Date().toISOString(), "dd 'de' MMMM 'de' yyyy");
  const vence = formatDate(receta.vence, "dd 'de' MMMM 'de' yyyy");

  return generarHTMLRecetaCompleta({
    nombreOrg,
    direccion: org.direccion || '',
    ciudad: org.ciudad || '',
    telefono: org.telefono || '',
    email: org.email || '',
    logoUrl: org.logoUrl || '',
    colorPrimario,
    hoy,
    vence,
    receta,
    qrDataUrl,
  });
}

/**
 * Genera el HTML imprimible de la receta con QR de verificación.
 * @param receta
 * @param org
 */
export async function generarPDFReceta(receta: RecetaLike, org: OrganizacionInfo = {}) {
  const html = await generarHtmlReceta(receta, org);

  const ventana = window.open('', '_blank');
  if (!ventana) {
    toast({
      title: '❌ Error',
      description: 'Permití ventanas emergentes para abrir la receta',
      variant: 'destructive',
    });
    return;
  }
  ventana.document.write(html);
  ventana.document.close();
  toast({
    title: '📄 Receta generada',
    description: `${receta.medicamento} - ${receta.paciente}`,
  });
}

/**
 * Abre WhatsApp con el texto de la receta pre-cargado.
 * @param receta
 */
export async function enviarRecetaWhatsApp(receta: RecetaLike) {
  const org = await cargarOrganizacion();
  const nombreOrg = org.nombre || 'Consultorio Médico';
  const texto = encodeURIComponent(
    `📋 *RECETA MÉDICA*%0A%0A` +
      `Paciente: ${receta.paciente}%0A` +
      `Medicamento: ${receta.medicamento}%0A` +
      `Dosis: ${receta.dosis}%0A` +
      `Duración: ${receta.duracion}%0A` +
      (receta.indicaciones ? `Indicaciones: ${receta.indicaciones}%0A` : '') +
      `%0AVence: ${formatDate(receta.vence, 'dd/MM/yyyy')}%0A%0A` +
      `Enviado desde ${nombreOrg}`,
  );
  window.open(`https://wa.me/?text=${texto}`, '_blank');
  toast({
    title: '📱 Abriendo WhatsApp',
    description: 'Se abrirá una ventana para enviar la receta',
  });
}

/**
 * Abre la receta en una pestaña nueva lista para imprimir/guardar como PDF.
 * @param receta
 */
export async function imprimirReceta(receta: RecetaLike) {
  const org = await cargarOrganizacion();
  const qrDataUrl = await generarQrDataUrl(receta.id);
  const html = generarHTMLRecetaCompletaConBoton({ ...org, receta, qrDataUrl });
  const ventana = window.open('', '_blank');
  if (ventana) {
    ventana.document.write(html);
    ventana.document.close();
  }
}

// ─── Templates HTML ─────────────────────────────────────────

function generarHTMLRecetaCompletaConBoton(params: {
  nombreOrg?: string;
  direccion?: string;
  ciudad?: string;
  telefono?: string;
  email?: string;
  logoUrl?: string;
  colorPrimario?: string;
  hoy?: string;
  vence?: string;
  receta: RecetaLike;
  qrDataUrl?: string;
}) {
  const nombreOrg = params.nombreOrg || 'Consultorio Médico';
  const hoy = params.hoy || formatDate(new Date().toISOString(), "dd 'de' MMMM 'de' yyyy");
  const vence = params.vence || formatDate(params.receta.vence, "dd 'de' MMMM 'de' yyyy");
  const colorPrimario = params.colorPrimario || '#2563eb';

  const base = generarHTMLRecetaCompleta({
    nombreOrg,
    direccion: params.direccion || '',
    ciudad: params.ciudad || '',
    telefono: params.telefono || '',
    email: params.email || '',
    logoUrl: params.logoUrl || '',
    colorPrimario,
    hoy,
    vence,
    receta: params.receta,
    qrDataUrl: params.qrDataUrl,
  });
  return base.replace(
    '</body>',
    `<div class="no-print" style="text-align:center;margin-top:30px;padding-top:20px;border-top:2px dashed #ddd">
    <button onclick="window.print()" style="padding:10px 30px;background:${colorPrimario};color:white;border:none;border-radius:6px;font-size:14px;cursor:pointer">🖨️ Imprimir / Guardar PDF</button>
    <p style="font-size:12px;color:#888;margin-top:8px">Selecciona "Guardar como PDF" en el diálogo de impresión</p>
  </div>
</body>`,
  );
}

function generarHTMLRecetaCompleta(params: {
  nombreOrg: string;
  direccion: string;
  ciudad: string;
  telefono: string;
  email: string;
  logoUrl: string;
  colorPrimario: string;
  hoy: string;
  vence: string;
  receta: RecetaLike;
  qrDataUrl?: string;
}) {
  const {
    nombreOrg,
    direccion,
    ciudad,
    telefono,
    email,
    logoUrl,
    colorPrimario,
    hoy,
    vence,
    receta,
    qrDataUrl,
  } = params;

  // Escapar todos los valores que vienen del usuario/DB (XSS prevention)
  const safe = {
    paciente: escapeHtml(receta.paciente),
    medicamento: escapeHtml(receta.medicamento),
    dosis: escapeHtml(receta.dosis),
    duracion: escapeHtml(receta.duracion),
    indicaciones: receta.indicaciones ? escapeHtml(receta.indicaciones) : null,
    nombreOrg: escapeHtml(nombreOrg),
    direccion: escapeHtml(direccion),
    ciudad: escapeHtml(ciudad),
    telefono: escapeHtml(telefono),
    email: escapeHtml(email),
    logoUrl: logoUrl ? escapeHtml(logoUrl) : '',
    qrDataUrl: qrDataUrl ? escapeHtml(qrDataUrl) : null,
  };

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Receta - ${safe.paciente}</title>
<style>
  @page { margin: 20mm 25mm; size: A4; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Georgia', 'Times New Roman', serif; color: #1a1a1a; line-height: 1.6; }
  .header { display: flex; align-items: center; gap: 20px; padding-bottom: 20px; border-bottom: 3px solid ${colorPrimario}; margin-bottom: 30px; }
  .header-logo { width: 70px; height: 70px; border-radius: 12px; overflow: hidden; flex-shrink: 0; background: ${colorPrimario}; display: flex; align-items: center; justify-content: center; color: white; font-size: 28px; font-weight: bold; }
  .header-logo img { width: 100%; height: 100%; object-fit: cover; }
  .header-info h1 { font-size: 20px; color: ${colorPrimario}; margin-bottom: 2px; }
  .header-info p { font-size: 12px; color: #666; }
  .titulo-documento { text-align: center; font-size: 16px; text-transform: uppercase; letter-spacing: 4px; color: #333; margin-bottom: 30px; padding-bottom: 10px; border-bottom: 1px solid #ddd; }
  .receta-content { background: #fafafa; border: 1px solid #e5e5e5; border-radius: 8px; padding: 30px; margin-bottom: 30px; }
  .paciente-info { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 30px; margin-bottom: 25px; padding-bottom: 20px; border-bottom: 1px dashed #ddd; }
  .paciente-info .label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px; }
  .paciente-info .value { font-size: 15px; font-weight: 600; color: #1a1a1a; }
  .prescripcion { margin-bottom: 20px; }
  .prescripcion h3 { font-size: 13px; color: ${colorPrimario}; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 10px; }
  .prescripcion-item { background: white; border-left: 4px solid ${colorPrimario}; padding: 15px 20px; border-radius: 0 8px 8px 0; }
  .prescripcion-item .medicamento { font-size: 18px; font-weight: 700; color: #1a1a1a; }
  .prescripcion-item .detalle { font-size: 13px; color: #555; margin-top: 5px; }
  .prescripcion-item .indicaciones { font-size: 13px; color: #666; margin-top: 8px; font-style: italic; }
  .fechas { display: flex; gap: 40px; margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e5e5; }
  .fechas .label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 1px; }
  .fechas .value { font-size: 14px; font-weight: 600; margin-top: 2px; }
  .firma-area { margin-top: 50px; display: flex; justify-content: space-between; align-items: end; }
  .firma { text-align: center; min-width: 250px; }
  .firma-line { border-top: 2px solid #333; width: 250px; margin-bottom: 5px; }
  .firma-label { font-size: 11px; color: #666; }
  .footer { margin-top: 40px; padding-top: 15px; border-top: 1px solid #ddd; text-align: center; font-size: 10px; color: #999; }
  .footer strong { color: #666; }
</style>
</head>
<body>
  <div class="header">
    <div class="header-logo">${safe.logoUrl ? `<img src="${safe.logoUrl}" alt="Logo">` : safe.nombreOrg.charAt(0).toUpperCase()}</div>
    <div class="header-info">
      <h1>${safe.nombreOrg}</h1>
      <p>${[safe.direccion, safe.ciudad].filter(Boolean).join(', ')}</p>
      <p>${[safe.telefono, safe.email].filter(Boolean).join(' | ')}</p>
    </div>
  </div>
  <div class="titulo-documento">Receta Médica</div>
  <div class="receta-content">
    <div class="paciente-info">
      <div><div class="label">Paciente</div><div class="value">${safe.paciente}</div></div>
      <div><div class="label">Fecha de emisión</div><div class="value">${hoy}</div></div>
    </div>
    <div class="prescripcion">
      <h3>Prescripción</h3>
      <div class="prescripcion-item">
        <div class="medicamento">${safe.medicamento}</div>
        <div class="detalle"><strong>Dosis:</strong> ${safe.dosis} &nbsp;·&nbsp; <strong>Duración:</strong> ${safe.duracion}</div>
        ${safe.indicaciones ? `<div class="indicaciones">📋 ${safe.indicaciones}</div>` : ''}
      </div>
    </div>
    <div class="fechas">
      <div><div class="label">Emisión</div><div class="value">${hoy}</div></div>
      <div><div class="label">Válida hasta</div><div class="value">${vence}</div></div>
    </div>
  </div>
  <div class="firma-area">
    <div class="qr-container">
      ${safe.qrDataUrl ? `<img src="${safe.qrDataUrl}" alt="QR Verificacion" style="width:80px;height:80px;" /><p style="font-size:8px;color:#999;text-align:center;margin-top:3px;">Verificar autenticidad</p>` : '<p style="font-size:9px;color:#ccc;">QR no disponible</p>'}
    </div>
    <div></div>
    <div class="firma">
      <div class="firma-line"></div>
      <div class="firma-label">${safe.nombreOrg}</div>
    </div>
  </div>
  <div class="footer"><strong>${safe.nombreOrg}</strong> &nbsp;·&nbsp; Documento generado electrónicamente el ${hoy}</div>
</body>
</html>`;
}
