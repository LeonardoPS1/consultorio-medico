/**
 * GET /api/portal/certificados/[id] — Genera HTML del certificado con QR
 * Protegido: requiere cookie portal_session
 */

import { eq, and } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { historialMedico, pacientes, medicos } from '@/drizzle/schema';
import { generarHTMLCertificado, type CertificadoData } from '@/lib/certificados';
import { db } from '@/lib/db';
import { getPortalSession } from '@/lib/portal-auth';

/**
 *
 * @param {NextRequest} _request - La solicitud HTTP entrante.
 * @param {object} root0 - Contexto de la ruta.
 * @param {Promise<{ id: string }>} root0.params - Promesa con los parámetros dinámicos de la ruta.
 * @returns {Promise<NextResponse>} El certificado en HTML o un error.
 */
export async function GET(
  _request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await paramsPromise;
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const [entry] = await db
    .select()
    .from(historialMedico)
    .where(
      and(
        eq(historialMedico.id, id),
        eq(historialMedico.pacienteId, session.pacienteId),
        eq(historialMedico.tipo, 'certificado'),
        eq(historialMedico.visibleParaPaciente, true),
      ),
    );

  if (!entry) {
    return NextResponse.json({ error: 'Certificado no encontrado' }, { status: 404 });
  }

  // Paciente
  const [paciente] = await db
    .select({ nombre: pacientes.nombre, apellido: pacientes.apellido, dni: pacientes.dni })
    .from(pacientes)
    .where(eq(pacientes.id, session.pacienteId));

  if (!paciente) {
    return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 });
  }

  // Médico
  const medicoId = entry.medicoId;
  let medicoNombre = '—';
  let medicoMatricula: string | null = null;
  if (medicoId) {
    const [medico] = await db
      .select({ nombre: medicos.nombre, matricula: medicos.matricula })
      .from(medicos)
      .where(eq(medicos.id, medicoId));
    if (medico) {
      medicoNombre = medico.nombre;
      medicoMatricula = medico.matricula;
    }
  }

  const data = entry.descripcion
    ? (JSON.parse(entry.descripcion) as CertificadoData)
    : { diagnostico: '' };

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://med.aicorebots.com';
  const verificationUrl = `${baseUrl}/verificar-certificado/${entry.id}`;

  const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
    width: 120,
    margin: 2,
    color: { dark: '#1a1a1a', light: '#ffffff' },
  });

  const html = generarHTMLCertificado(
    {
      id: entry.id,
      pacienteId: session.pacienteId,
      pacienteNombre: paciente.nombre,
      pacienteApellido: paciente.apellido,
      pacienteDni: paciente.dni,
      medicoNombre,
      medicoMatricula,
      data,
    },
    qrDataUrl,
    baseUrl,
  );

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
