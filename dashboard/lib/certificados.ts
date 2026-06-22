import { createHash } from 'crypto';
import { safeWarn } from '@/lib/logger';
import { escapeHtml } from '@/lib/html-utils';

// ─── Constants ──────────────────────────────────────────────

function getCertificadoSecret(): string {
  const s = process.env.CERTIFICADO_HASH_SECRET;
  if (!s) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CERTIFICADO_HASH_SECRET es obligatorio en producción');
    }
    safeWarn('[Certificados] CERTIFICADO_HASH_SECRET no configurado — usando fallback de desarrollo');
    return 'dev-fallback-not-for-production-cert';
  }
  return s;
}

// ─── Types ──────────────────────────────────────────────────

export interface CertificadoData {
  diagnostico: string;
  cie10Codigo?: string | null;
  reposoDesde?: string | null;
  reposoHasta?: string | null;
  reposoDias?: number | null;
  indicaciones?: string | null;
}

export interface CertificadoParams {
  id: string;
  pacienteId: string;
  pacienteNombre: string;
  pacienteApellido: string;
  pacienteDni?: string | null;
  medicoNombre: string;
  medicoMatricula?: string | null;
  data: CertificadoData;
}

// ─── Hash ───────────────────────────────────────────────────

export function generarHashCertificado(params: {
  id: string;
  pacienteId: string;
  diagnostico: string;
}): string {
  const payload = [
    params.id,
    params.pacienteId,
    params.diagnostico.trim().toLowerCase(),
    getCertificadoSecret(),
  ].join('||');
  return createHash('sha256').update(payload).digest('hex');
}

// ─── HTML Template ──────────────────────────────────────────

export function generarHTMLCertificado(
  params: CertificadoParams,
  qrDataUrl: string,
  baseUrl: string,
): string {
  const {
    pacienteNombre,
    pacienteApellido,
    pacienteDni,
    medicoNombre,
    medicoMatricula,
    data,
  } = params;

  const safe = {
    pacienteNombre: escapeHtml(pacienteNombre),
    pacienteApellido: escapeHtml(pacienteApellido),
    pacienteDni: pacienteDni ? escapeHtml(pacienteDni) : null,
    medicoNombre: escapeHtml(medicoNombre),
    medicoMatricula: medicoMatricula ? escapeHtml(medicoMatricula) : null,
    diagnostico: escapeHtml(data.diagnostico),
    cie10Codigo: data.cie10Codigo ? escapeHtml(data.cie10Codigo) : null,
    reposoDesde: data.reposoDesde ? escapeHtml(data.reposoDesde) : null,
    reposoHasta: data.reposoHasta ? escapeHtml(data.reposoHasta) : null,
    reposoDias: data.reposoDias,
    indicaciones: data.indicaciones ? escapeHtml(data.indicaciones) : null,
  };

  const fechaActual = new Date().toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const verificationUrl = `${baseUrl}/verificar-certificado/${params.id}`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Certificado Médico</title>
  <style>
    @page { margin: 2.5cm 2cm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      color: #1a1a1a;
      line-height: 1.6;
      padding: 20px;
    }
    .header {
      text-align: center;
      border-bottom: 3px double #1a1a1a;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      font-size: 22px;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 5px;
    }
    .header p {
      font-size: 13px;
      color: #555;
    }
    .titulo {
      text-align: center;
      font-size: 18px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 25px;
      padding-bottom: 10px;
      border-bottom: 1px solid #ccc;
    }
    .content { margin-bottom: 30px; }
    .data-row {
      margin-bottom: 12px;
      font-size: 14px;
    }
    .data-row strong {
      display: inline-block;
      min-width: 140px;
    }
    .diagnostico-box {
      background: #f8f8f8;
      border-left: 4px solid #1a1a1a;
      padding: 15px 20px;
      margin: 15px 0;
      font-style: italic;
      font-size: 15px;
    }
    .reposo-box {
      background: #fff8f0;
      border: 1px solid #e8d5b5;
      padding: 15px 20px;
      margin: 15px 0;
      font-size: 14px;
    }
    .indicaciones {
      margin: 15px 0;
      padding: 10px 0;
      font-size: 13px;
      color: #444;
    }
    .footer {
      margin-top: 50px;
      display: flex;
      justify-content: space-between;
      align-items: end;
    }
    .firma-area {
      text-align: center;
      min-width: 200px;
    }
    .firma-line {
      width: 200px;
      border-top: 1px solid #1a1a1a;
      margin: 0 auto 5px;
    }
    .firma-area p {
      font-size: 13px;
      color: #555;
    }
    .qr-area {
      text-align: center;
    }
    .qr-area img {
      width: 100px;
      height: 100px;
    }
    .qr-area p {
      font-size: 10px;
      color: #999;
      margin-top: 3px;
    }
    .sello-agua {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      font-size: 80px;
      opacity: 0.03;
      font-weight: bold;
      pointer-events: none;
    }
    @media print {
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="sello-agua">CERTIFICADO MÉDICO</div>

  <div class="no-print" style="text-align:center;margin-bottom:20px;">
    <button onclick="window.print()" style="background:#2563eb;color:#fff;border:none;padding:10px 24px;border-radius:8px;font-size:14px;cursor:pointer;">
      🖨️ Imprimir / Guardar PDF
    </button>
  </div>

  <div class="header">
    <h1>${safe.medicoNombre.toUpperCase()}</h1>
    <p>${safe.medicoMatricula ? `Matrícula: ${safe.medicoMatricula}` : 'Médico Matriculado'}</p>
  </div>

  <div class="titulo">Certificado Médico</div>

  <div class="content">
    <div class="data-row"><strong>Paciente:</strong> ${safe.pacienteNombre} ${safe.pacienteApellido}</div>
    ${safe.pacienteDni ? `<div class="data-row"><strong>DNI:</strong> ${safe.pacienteDni}</div>` : ''}
    <div class="data-row"><strong>Fecha de emisión:</strong> ${fechaActual}</div>

    <div class="diagnostico-box">
      <strong>Diagnóstico:</strong> ${safe.diagnostico}
      ${safe.cie10Codigo ? `<br><span style="font-size:12px;color:#666;">CIE-10: ${safe.cie10Codigo}</span>` : ''}
    </div>

    ${safe.reposoDesde ? `
    <div class="reposo-box">
      <strong>Reposo médico:</strong><br>
      Desde: ${safe.reposoDesde}<br>
      Hasta: ${safe.reposoHasta}<br>
      ${safe.reposoDias ? `Duración: ${safe.reposoDias} días` : ''}
    </div>` : ''}

    ${safe.indicaciones ? `
    <div class="indicaciones">
      <strong>Indicaciones:</strong><br>
      ${safe.indicaciones}
    </div>` : ''}
  </div>

  <div class="footer">
    <div class="firma-area">
      <p class="firma-line">&nbsp;</p>
      <p><strong>${safe.medicoNombre}</strong></p>
      <p>${safe.medicoMatricula ? `Mat. ${safe.medicoMatricula}` : ''}</p>
      <p style="font-size:11px;color:#888;margin-top:5px;">Firma del médico</p>
    </div>
    <div class="qr-area">
      <img src="${qrDataUrl}" alt="QR Verificación" />
      <p>Escané para verificar</p>
      <p style="font-size:8px;word-break:break-all;max-width:120px;">${verificationUrl}</p>
    </div>
  </div>
</body>
</html>`;
}
